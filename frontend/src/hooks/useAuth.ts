import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { updateCachedAuthToken, clearCachedAuthToken, apiGet } from '@/lib/api';
import { pushNotificationService } from '@/services/pushNotifications';

// Global state for auth
let globalAuthState = {
  user: null as AuthUser | null,
  session: null as Session | null,
  providerToken: null as string | null,
  loading: true,
  isReady: false,
};

// Global listeners for auth state changes
let authStateListeners: Set<() => void> = new Set();

// Global flag to prevent multiple auth listeners across all hook instances
let globalAuthInitialized = false;

// Global flag to prevent concurrent profile fetches
let isFetchingProfile = false;

// Helper to upgrade Google profile picture URLs to high resolution (512px)
const upgradeGoogleAvatarUrl = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (!url.includes('googleusercontent.com')) return url;
  
  // Replace any existing size parameter (=s96-c, =s120-c, etc.) with =s512-c
  let upgradedUrl = url.replace(/=s[0-9]+-c/, '=s512-c');
  
  // If no size parameter exists, append it
  if (!upgradedUrl.includes('=s512-c')) {
    upgradedUrl = upgradedUrl + '=s512-c';
  }
  
  return upgradedUrl;
};

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  isVerified: boolean;
  createdAt: string;
  /** Zaurq role for access control */
  role?: 'ZAURQ_USER' | 'ZAURQ_PARTNER';
  // LinkedIn fields
  linkedinId?: string;
  linkedinHeadline?: string;
  linkedinProfilePicture?: string;
  linkedinConnectedAt?: string;
  /** LinkedIn scrape enrichment (stored in users.metadata.linkedin) */
  linkedinScrape?: {
    lastScrapedAt?: string;
    source?: string;
    profile?: {
      fullName?: string | null;
      headline?: string | null;
      about?: string | null;
      location?: string | null;
      linkedinUrl?: string | null;
      profilePic?: string | null;
      backgroundPic?: string | null;
      jobTitle?: string | null;
      companyName?: string | null;
      followers?: number | null;
      connections?: number | null;
      experiences?: Array<{
        companyName?: string | null;
        title?: string | null;
        jobStartedOn?: string | null;
        jobEndedOn?: string | null;
        jobLocation?: string | null;
        employmentType?: string | null;
        logo?: string | null;
      }>;
    };
  };
  socialCapitalScore?: number;
  /** Deprecated: legacy membership status (kept for compatibility during rollout) */
  membershipStatus?: 'member' | 'waitlist' | 'rejected';
  /** Birthday (YYYY-MM-DD) and visibility */
  birthdayDate?: string | null;
  birthdayVisibility?: 'private' | 'connections' | 'public' | null;
}

export const useAuth = () => {
  const isDev = import.meta.env.DEV;
  const [user, setUser] = useState<AuthUser | null>(globalAuthState.user);
  const [session, setSession] = useState<Session | null>(globalAuthState.session);
  const [providerToken, setProviderToken] = useState<string | null>(globalAuthState.providerToken);
  const [loading, setLoading] = useState(globalAuthState.loading);
  const [isReady, setIsReady] = useState(globalAuthState.isReady);
  const initialized = useRef(false);

  // Function to notify all listeners of state changes
  const notifyListeners = useCallback(() => {
    authStateListeners.forEach(listener => listener());
  }, []);

  // Update global state and notify listeners
  const updateGlobalState = useCallback((updates: Partial<typeof globalAuthState>) => {
    globalAuthState = { ...globalAuthState, ...updates };

    if (updates.session?.provider_token) {
      globalAuthState.providerToken = updates.session.provider_token;
    }

    // Update API token cache when session changes
    if (updates.session !== undefined) {
      if (updates.session?.access_token) {
        const expiresAt = updates.session.expires_at ? updates.session.expires_at * 1000 : undefined;
        updateCachedAuthToken(updates.session.access_token, expiresAt);
      } else {
        clearCachedAuthToken();
      }
    }

    notifyListeners();
  }, [notifyListeners]);

  const fetchUserProfile = useCallback(async (authUser: User) => {
    // console.log('Setting user from auth data for:', authUser.id);
    // console.log('Email confirmed at:', authUser.email_confirmed_at);

    // Just use auth data directly - no database calls needed for authentication
    const user = {
      id: authUser.id,
      email: authUser.email || '',
      firstName: authUser.user_metadata?.first_name || 'User',
      lastName: authUser.user_metadata?.last_name || '',
      avatar: upgradeGoogleAvatarUrl(authUser.user_metadata?.avatar_url),
      bio: '',
      linkedinUrl: authUser.user_metadata?.linkedin_url || '',
      twitterUrl: '',
      isVerified: !!authUser.email_confirmed_at, // Email verification status
      createdAt: authUser.created_at,
    };

    // console.log('User isVerified:', user.isVerified);

    // OPTIMISTIC UPDATE: Set user state immediately so UI shows logged in
    // (but do NOT set role yet - wait for authoritative backend response)
    updateGlobalState({
      user,
      loading: false,
      isReady: true,
    });

    // PRIORITY: Fetch authoritative role from backend FIRST (most reliable source)
    try {
      const me = await apiGet('/api/auth/me', { skipCache: true });
      const role = me?.data?.user?.role;
      if (role) {
        (user as any).role = role;
        (user as any).membershipStatus = me?.data?.user?.membershipStatus;
        (user as any).birthdayDate = me?.data?.user?.birthdayDate ?? null;
        (user as any).birthdayVisibility = me?.data?.user?.birthdayVisibility ?? null;
        updateGlobalState({ user: { ...user } });
        console.log('🔑 Role from backend:', role);
      }
    } catch (e) {
      console.warn('Failed to fetch role from backend:', e);
    }

    // Fetch additional profile data from database (like social capital score and profile info)
    try {
      const { data: profileData } = await supabase
        .from('users')
        .select(`
          social_capital_score,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          linkedin_url,
          twitter_url,
          birthday_date,
          birthday_visibility,
          metadata
        `)
        .eq('id', authUser.id)
        .single();
      
      if (profileData) {
        user.socialCapitalScore = profileData.social_capital_score;
        // Update other fields to match database (source of truth)
        if (profileData.first_name) user.firstName = profileData.first_name;
        if (profileData.last_name) user.lastName = profileData.last_name;
        if (profileData.profile_picture_url) user.avatar = profileData.profile_picture_url;
        if (profileData.bio) user.bio = profileData.bio;
        if (profileData.linkedin_url) user.linkedinUrl = profileData.linkedin_url;
        if (profileData.twitter_url) user.twitterUrl = profileData.twitter_url;
        if ((profileData as any).birthday_date) (user as any).birthdayDate = (profileData as any).birthday_date;
        if ((profileData as any).birthday_visibility) (user as any).birthdayVisibility = (profileData as any).birthday_visibility;
        // LinkedIn scrape metadata (optional)
        const md: any = (profileData as any)?.metadata;
        if (md && typeof md === 'object' && md.linkedin && typeof md.linkedin === 'object') {
          (user as any).linkedinScrape = md.linkedin;
        }

        // Update state again with enriched data (keep role from backend)
        updateGlobalState({ user: { ...user } });
      }
    } catch (err) {
      console.warn('Failed to fetch extended profile data:', err);
    }

    // Initialize push notifications for mobile
    if (pushNotificationService.isSupported()) {
      try {
        await pushNotificationService.initialize(authUser.id);
        console.log('Push notifications initialized');
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    }

    // console.log('Auth completed successfully');
    return user;
  }, [updateGlobalState]);

  // Register this hook instance to receive global state updates
  useEffect(() => {
    const listener = () => {
      // console.log('Auth state updated in hook listener:', globalAuthState.user?.id);
      setUser(globalAuthState.user);
      setSession(globalAuthState.session);
      setProviderToken(globalAuthState.providerToken);
      setLoading(globalAuthState.loading);
      setIsReady(globalAuthState.isReady);
    };

    authStateListeners.add(listener);
    
    // Initialize with current global state
    listener();

    return () => {
      authStateListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    // Prevent multiple auth listeners across all hook instances
    if (globalAuthInitialized) {
      return;
    }

    // Safety timeout: If auth takes too long, force app to render (without signing out).
    // IMPORTANT: Never call signOut / nuke storage here, because that can break other open tabs.
    const safetyTimeout = setTimeout(async () => {
      if (globalAuthState.loading) {
        console.warn('⚠️ Auth initialization timed out, forcing app load');
        
        // Check if there's a hash token that needs to be processed
        // (magic link, password reset, email confirmation)
        const hasAuthHash = window.location.hash && (
          window.location.hash.includes('access_token') ||
          window.location.hash.includes('type=recovery') ||
          window.location.hash.includes('type=signup') ||
          window.location.hash.includes('type=magiclink')
        );
        
        // Whether or not we have an auth hash, do NOT sign out here.
        // Just stop blocking the UI; subsequent auth events can still update state.
        if (hasAuthHash) {
          console.log('🔗 Auth hash detected, letting page handle authentication...');
        }

          updateGlobalState({
            loading: false,
            isReady: true,
          });
      }
    }, 12000); // Give Supabase more time; avoids false timeouts on slow networks

    let isMounted = true;
    let isProcessing = false;
    let authSubscription: any = null;

    // console.log('Setting up auth listener...');
    globalAuthInitialized = true;
    initialized.current = true;

    // Get initial session first
    const getInitialSession = async () => {
      if (!isMounted) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        updateGlobalState({ session });
        if (session?.user) {
          // console.log('Initial session found, fetching profile...');
          await fetchUserProfile(session.user);
        } else {
          // console.log('No initial session, setting loading to false');
          updateGlobalState({
            user: null,
            loading: false,
            isReady: true,
          });
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        // Do NOT sign out here: multi-tab can cause transient session/refresh races.
        // Just let the UI render unauthenticated; user can sign in again if needed.
        updateGlobalState({
          user: null,
          session: null,
          loading: false,
          isReady: true,
        });
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      // Skip processing if component is unmounted or already processing
      if (!isMounted || isProcessing) return;
      
      // Skip INITIAL_SESSION events as they're handled by getInitialSession
      if (event === 'INITIAL_SESSION') return;

      isProcessing = true;
      updateGlobalState({ session });

      if (session?.user) {
        if (isDev) console.log('Session changed, fetching profile for:', session.user.id);
        await fetchUserProfile(session.user);
      } else {
        console.log('Session ended or invalid, clearing user');
        updateGlobalState({
          user: null,
          loading: false,
          isReady: true,
        });
      }

      isProcessing = false;
    });

    authSubscription = subscription;

    getInitialSession();

    return () => {
      clearTimeout(safetyTimeout);
      isMounted = false;
      // DON'T reset globalAuthInitialized - keep auth listener persistent across navigation
      // Only reset the local instance flag
      initialized.current = false;
    };
  }, []); // Remove fetchUserProfile dependency to prevent re-renders

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    linkedinUrl?: string,
    opts?: { birthdayDate?: string; birthdayVisibility?: 'private' | 'connections' | 'public' }
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            linkedin_url: linkedinUrl,
            ...(opts?.birthdayDate ? { birthday_date: opts.birthdayDate } : {}),
            ...(opts?.birthdayVisibility ? { birthday_visibility: opts.birthdayVisibility } : {}),
          },
        },
      });

      if (error) throw error;

      // User profile will be created automatically by database trigger
      // when the user confirms their email and the auth.users record is inserted

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { data, error };
      }

      // Wait for auth state to be updated before returning
      if (data.session?.user) {
        await fetchUserProfile(data.session.user);
      }

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    console.log('🚪 useAuth: signOut called');
    try {
      // Unregister push notifications before signing out
      if (user && pushNotificationService.isSupported()) {
        try {
          console.log('🔕 useAuth: Unregistering push notifications...');
          // Add timeout to prevent hanging
          await Promise.race([
            pushNotificationService.unregister(user.id),
            new Promise(resolve => setTimeout(resolve, 1000))
          ]);
        } catch (error) {
          console.error('Failed to unregister push notifications:', error);
        }
      }

      console.log('📡 useAuth: Calling supabase.auth.signOut()...');
      
      // Force sign out with timeout to prevent hanging
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        new Promise<{ error: any }>(resolve => 
          setTimeout(() => {
            console.warn('⚠️ useAuth: Supabase signOut timed out, forcing local cleanup');
            resolve({ error: null });
          }, 2000)
        )
      ]);

      if (error) {
        console.error('❌ useAuth: Supabase signOut error:', error);
      } else {
        console.log('✅ useAuth: Supabase signOut completed');
      }

      // Always clear global auth state immediately
      console.log('🧹 useAuth: Clearing global auth state');
      updateGlobalState({
        user: null,
        session: null,
        loading: false,
        isReady: true,
      });

      // Clear any local storage items that might be lingering
      try {
        localStorage.removeItem('supabase.auth.token');
        // Clear Supabase local storage keys if any
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('Error clearing localStorage:', e);
      }

      return { error };
    } catch (error) {
      console.error('❌ useAuth: signOut exception:', error);
      // Even if API fails, ensure we clear local state
      updateGlobalState({
        user: null,
        session: null,
        loading: false,
        isReady: true,
      });
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      // Update the database
      const { error: dbError } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          avatar_url: updates.avatar,
          bio: updates.bio,
          linkedin_url: updates.linkedinUrl,
          twitter_url: updates.twitterUrl,
          linkedin_id: updates.linkedinId,
          linkedin_headline: updates.linkedinHeadline,
          linkedin_profile_picture: updates.linkedinProfilePicture,
          linkedin_connected_at: updates.linkedinConnectedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Update the auth user's metadata so it persists across sessions
      const metadataUpdates: Record<string, any> = {};
      if (updates.firstName !== undefined) metadataUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) metadataUpdates.last_name = updates.lastName;
      if (updates.avatar !== undefined) metadataUpdates.avatar_url = updates.avatar;
      if (updates.linkedinUrl !== undefined) metadataUpdates.linkedin_url = updates.linkedinUrl;

      if (Object.keys(metadataUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser({
          data: metadataUpdates
        });

        if (authError) {
          console.warn('Failed to update auth metadata:', authError);
          // Don't throw - database update succeeded, this is just for persistence
        }
      }

      // Update global user state
      const updatedUser = globalAuthState.user ? { ...globalAuthState.user, ...updates } : null;
      updateGlobalState({ user: updatedUser });

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const refreshProfile = async (opts?: { preferBackend?: boolean }) => {
    if (!user) return { error: new Error('No user logged in') };

    // Optional fast-path: hit backend directly so the request is visible in DevTools
    // and works even when Supabase client reads are blocked.
    if (opts?.preferBackend) {
      try {
        const me = await apiGet('/api/auth/me', { skipCache: true });
        if (globalAuthState.user) {
          const nextUser: any = {
            ...globalAuthState.user,
            role: me?.data?.user?.role ?? (globalAuthState.user as any).role,
            membershipStatus: me?.data?.user?.membershipStatus ?? (globalAuthState.user as any).membershipStatus,
            linkedinScrape: me?.data?.user?.linkedinScrape ?? (globalAuthState.user as any)?.linkedinScrape
          };
          updateGlobalState({ user: nextUser });
        }
        return { error: null };
      } catch (error) {
        // Fall through to Supabase path
      }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          linkedin_url,
          twitter_url,
          birthday_date,
          birthday_visibility,
          role,
          membership_status,
          created_at,
          linkedin_id,
          linkedin_headline,
          linkedin_profile_picture,
          linkedin_connected_at,
          social_capital_score,
          metadata
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const updatedUser: AuthUser = {
        id: data.id,
        email: data.email,
        firstName: data.first_name || user.firstName,
        lastName: data.last_name || user.lastName,
        avatar: data.profile_picture_url || user.avatar,
        bio: data.bio || user.bio,
        linkedinUrl: data.linkedin_url || user.linkedinUrl,
        twitterUrl: data.twitter_url || user.twitterUrl,
        birthdayDate: (data as any).birthday_date || (user as any).birthdayDate || null,
        birthdayVisibility: (data as any).birthday_visibility || (user as any).birthdayVisibility || null,
        isVerified: user.isVerified, // Keep existing auth verification status
        createdAt: data.created_at || user.createdAt,
        linkedinId: data.linkedin_id,
        linkedinHeadline: data.linkedin_headline,
        linkedinProfilePicture: data.linkedin_profile_picture,
        linkedinConnectedAt: data.linkedin_connected_at,
        socialCapitalScore: data.social_capital_score || 0,
        linkedinScrape:
          (data as any)?.metadata && typeof (data as any).metadata === 'object' ? (data as any).metadata?.linkedin : undefined,
        role:
          (data as any).role ||
          ((data as any).membership_status === 'member' ? 'ZAURQ_PARTNER' : 'ZAURQ_USER'),
        membershipStatus: (data as any).membership_status || (user as any).membershipStatus,
      };

      updateGlobalState({ user: updatedUser });
      return { error: null };
    } catch (error) {
      // Fallback: refresh via backend (works even if Supabase RLS blocks metadata reads)
      try {
        const me = await apiGet('/api/auth/me', { skipCache: true });
        if (globalAuthState.user) {
          const nextUser: any = {
            ...globalAuthState.user,
            // Only overwrite role if backend returns one
            role: me?.data?.user?.role ?? (globalAuthState.user as any).role,
            membershipStatus: me?.data?.user?.membershipStatus ?? (globalAuthState.user as any).membershipStatus,
            // Best-effort: hydrate LinkedIn enrichment via backend if Supabase RLS blocks metadata reads.
            linkedinScrape: me?.data?.user?.linkedinScrape ?? (globalAuthState.user as any)?.linkedinScrape
          };

          updateGlobalState({ user: nextUser });

          // If we managed to hydrate anything useful, treat refresh as successful.
          if (me?.data?.user?.linkedinScrape || me?.data?.user?.role || me?.data?.user?.membershipStatus) {
            return { error: null };
          }
        }
      } catch {}
      return { error };
    }
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return { error: new Error('No email found') };

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    user,
    session,
    providerToken,
    loading,
    isReady,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    resendVerificationEmail,
  };
};


