import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
    notifyListeners();
  }, [notifyListeners]);

  const fetchUserProfile = useCallback(async (authUser: User) => {
    console.log('Setting user from auth data for:', authUser.id);

    // Just use auth data directly - no database calls needed for authentication
    const user = {
      id: authUser.id,
      email: authUser.email || '',
      firstName: authUser.user_metadata?.first_name || 'User',
      lastName: authUser.user_metadata?.last_name || '',
      avatar: authUser.user_metadata?.avatar_url,
      bio: '',
      linkedinUrl: '',
      twitterUrl: '',
      isVerified: false,
      createdAt: authUser.created_at,
    };

    // Update global state
    updateGlobalState({
      user,
      loading: false,
      isReady: true,
    });
    
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
      console.log('Auth listener already initialized globally, skipping...');
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            first_name: firstName,
            last_name: lastName,
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't throw error here, user can still sign up and profile will be created on next login
        } else {
          console.log('User profile created successfully during signup');
        }
      }

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
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          avatar_url: updates.avatar,
          bio: updates.bio,
          linkedin_url: updates.linkedinUrl,
          twitter_url: updates.twitterUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update global user state
      const updatedUser = globalAuthState.user ? { ...globalAuthState.user, ...updates } : null;
      updateGlobalState({ user: updatedUser });

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
  };
};


