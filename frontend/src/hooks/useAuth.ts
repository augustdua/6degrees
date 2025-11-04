import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { updateCachedAuthToken, clearCachedAuthToken } from '@/lib/api';
import { pushNotificationService } from '@/services/pushNotifications';

// Global state for auth
let globalAuthState = {
  user: null as AuthUser | null,
  session: null as Session | null,
  loading: true,
  isReady: false,
};

// Global listeners for auth state changes
let authStateListeners: Set<() => void> = new Set();

// Global flag to prevent multiple auth listeners across all hook instances
let globalAuthInitialized = false;

// Global flag to prevent concurrent profile fetches
let isFetchingProfile = false;

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
  // LinkedIn fields
  linkedinId?: string;
  linkedinHeadline?: string;
  linkedinProfilePicture?: string;
  linkedinConnectedAt?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(globalAuthState.user);
  const [session, setSession] = useState<Session | null>(globalAuthState.session);
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
    console.log('Setting user from auth data for:', authUser.id);
    console.log('Email confirmed at:', authUser.email_confirmed_at);

    // Just use auth data directly - no database calls needed for authentication
    const user = {
      id: authUser.id,
      email: authUser.email || '',
      firstName: authUser.user_metadata?.first_name || 'User',
      lastName: authUser.user_metadata?.last_name || '',
      avatar: authUser.user_metadata?.profile_picture_url || authUser.user_metadata?.avatar_url,
      bio: '',
      linkedinUrl: authUser.user_metadata?.linkedin_url || '',
      twitterUrl: '',
      isVerified: !!authUser.email_confirmed_at, // Email verification status
      createdAt: authUser.created_at,
    };

    console.log('User isVerified:', user.isVerified);

    // Update global state
    updateGlobalState({
      user,
      loading: false,
      isReady: true,
    });

    // Initialize push notifications for mobile
    if (pushNotificationService.isSupported()) {
      try {
        await pushNotificationService.initialize(authUser.id);
        console.log('Push notifications initialized');
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    }

    console.log('Auth completed successfully');
    return user;
  }, [updateGlobalState]);

  // Register this hook instance to receive global state updates
  useEffect(() => {
    const listener = () => {
      setUser(globalAuthState.user);
      setSession(globalAuthState.session);
      setLoading(globalAuthState.loading);
      setIsReady(globalAuthState.isReady);
    };

    authStateListeners.add(listener);

    return () => {
      authStateListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    // Prevent multiple auth listeners across all hook instances
    if (globalAuthInitialized) {
      return;
    }

    let isMounted = true;
    let isProcessing = false;
    let authSubscription: any = null;

    console.log('Setting up auth listener...');
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
          console.log('Initial session found, fetching profile...');
          await fetchUserProfile(session.user);
        } else {
          console.log('No initial session, setting loading to false');
          updateGlobalState({
            user: null,
            loading: false,
            isReady: true,
          });
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        updateGlobalState({
          loading: false,
          isReady: true,
        });
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      // Skip processing if component is unmounted or already processing
      if (!isMounted || isProcessing) return;
      
      // Skip INITIAL_SESSION events as they're handled by getInitialSession
      if (event === 'INITIAL_SESSION') return;

      isProcessing = true;
      updateGlobalState({ session });

      if (session?.user) {
        console.log('Session changed, fetching profile...');
        await fetchUserProfile(session.user);
      } else {
        console.log('Session ended, clearing user');
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

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      // Unregister push notifications before signing out
      if (user && pushNotificationService.isSupported()) {
        try {
          await pushNotificationService.unregister(user.id);
        } catch (error) {
          console.error('Failed to unregister push notifications:', error);
        }
      }

      const { error } = await supabase.auth.signOut();

      if (!error) {
        // Clear global auth state immediately
        updateGlobalState({
          user: null,
          session: null,
          loading: false,
          isReady: true,
        });
        // Token cache will be cleared by updateGlobalState when session is set to null
      }

      return { error };
    } catch (error) {
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
          profile_picture_url: updates.avatar,
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
          is_verified,
          created_at,
          linkedin_id,
          linkedin_headline,
          linkedin_profile_picture,
          linkedin_connected_at
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
        isVerified: data.is_verified || user.isVerified,
        createdAt: data.created_at || user.createdAt,
        linkedinId: data.linkedin_id,
        linkedinHeadline: data.linkedin_headline,
        linkedinProfilePicture: data.linkedin_profile_picture,
        linkedinConnectedAt: data.linkedin_connected_at,
      };

      updateGlobalState({ user: updatedUser });
      return { error: null };
    } catch (error) {
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


