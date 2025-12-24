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
  socialCapitalScore?: number;
  /** Deprecated: legacy membership status (kept for compatibility during rollout) */
  membershipStatus?: 'member' | 'waitlist' | 'rejected';
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
    updateGlobalState({
      user,
      loading: false,
      isReady: true,
    });

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
          role,
          membership_status
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
        // Zaurq role (default to ZAURQ_USER)
        (user as any).role =
          (profileData as any).role ||
          ((profileData as any).membership_status === 'member' ? 'ZAURQ_PARTNER' : 'ZAURQ_USER');
        // Legacy membership status (fallback)
        (user as any).membershipStatus = profileData.membership_status || 'waitlist';

        // Update state again with enriched data
        updateGlobalState({ user: { ...user } });
      }
    } catch (err) {
      console.warn('Failed to fetch extended profile data:', err);
    }

    // Fallback: ensure role is correct via backend (covers cases where client-side profile select is blocked/stale).
    try {
      const me = await apiGet('/api/auth/me', { skipCache: true });
      const role = me?.data?.user?.role;
      if (role) {
        (user as any).role = role;
        (user as any).membershipStatus = me?.data?.user?.membershipStatus;
        updateGlobalState({ user: { ...user } });
      }
    } catch (e) {
      // best-effort
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

    // Safety timeout: If auth takes too long (>5s), force app to load
    // This prevents the "stuck on loading" screen if getSession hangs
    // BUT: Don't sign out if there's a hash token (magic link / password reset)
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
        
        if (hasAuthHash) {
          // Don't sign out - let the page handle the auth hash
          console.log('🔗 Auth hash detected, letting page handle authentication...');
          updateGlobalState({
            loading: false,
            isReady: true,
          });
        } else {
          // No auth hash - safe to clear stuck session
          console.warn('⚠️ Clearing potentially stuck session to stop refresh loop...');
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.warn('Error during safety timeout signOut:', e);
          }
          
          // Nuke local storage to be safe
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });

          updateGlobalState({
            user: null,
            session: null,
            loading: false,
            isReady: true,
          });
        }
      }
    }, 5000); // Increased to 5s to give more time for hash parsing

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
        
        // If initial session fetch fails (e.g. CORS on refresh), clear everything
        // to stop the infinite retry loop
        try {
          await supabase.auth.signOut();
        } catch (e) { 
          /* ignore */ 
        }
        
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string, linkedinUrl?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            linkedin_url: linkedinUrl,
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

  const refreshProfile = async () => {
    if (!user) return { error: new Error('No user logged in') };

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
          role,
          membership_status,
          created_at,
          linkedin_id,
          linkedin_headline,
          linkedin_profile_picture,
          linkedin_connected_at,
          social_capital_score
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
        isVerified: user.isVerified, // Keep existing auth verification status
        createdAt: data.created_at || user.createdAt,
        linkedinId: data.linkedin_id,
        linkedinHeadline: data.linkedin_headline,
        linkedinProfilePicture: data.linkedin_profile_picture,
        linkedinConnectedAt: data.linkedin_connected_at,
        socialCapitalScore: data.social_capital_score || 0,
        role:
          (data as any).role ||
          ((data as any).membership_status === 'member' ? 'ZAURQ_PARTNER' : 'ZAURQ_USER'),
        membershipStatus: (data as any).membership_status || (user as any).membershipStatus,
      };

      updateGlobalState({ user: updatedUser });
      return { error: null };
    } catch (error) {
      // Fallback: at least refresh role via backend
      try {
        const me = await apiGet('/api/auth/me', { skipCache: true });
        const role = me?.data?.user?.role;
        if (role && globalAuthState.user) {
          updateGlobalState({
            user: {
              ...globalAuthState.user,
              role,
              membershipStatus: me?.data?.user?.membershipStatus
            } as any
          });
          return { error: null };
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


