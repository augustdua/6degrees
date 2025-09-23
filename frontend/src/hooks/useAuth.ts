import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Global flag to prevent multiple auth listeners across all hook instances
let globalAuthInitialized = false;

// Track database connection issues for faster fallback
let databaseConnectionFailed = false;

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const initialized = useRef(false);

  const fetchUserProfile = useCallback(async (authUser: User) => {
    console.log('Fetching user profile for:', authUser.id);

    // Prevent concurrent profile fetches globally
    if (isFetchingProfile) {
      console.log('Profile fetch already in progress, skipping...');
      return;
    }

    isFetchingProfile = true;

    // Helper function to create user from auth data
    const createUserFromAuth = (reason: string) => {
      console.log(reason);
      const fallbackUser = {
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
      setUser(fallbackUser);
      setLoading(false);
      setIsReady(true);
      isFetchingProfile = false;
      return fallbackUser;
    };


    try {
      // DEBUG: Bypass broken Supabase client and make direct HTTP request
      console.log('DEBUG: Making direct HTTP request to bypass Supabase client');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('DEBUG: URL:', supabaseUrl);
      console.log('DEBUG: Key exists:', !!supabaseKey);

      const response = await fetch(`${supabaseUrl}/rest/v1/users?select=*&id=eq.${authUser.id}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('DEBUG: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DEBUG: HTTP error:', errorText);
        return createUserFromAuth(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('DEBUG: Response data:', data);

      if (!data || data.length === 0) {
        console.log('DEBUG: No user data found');
        return createUserFromAuth('User not found in database, using auth data');
      }

      const userData = data[0];

      // Successfully fetched user from database
      console.log('DEBUG: User profile fetched successfully from database');
      const dbUser = {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatar: userData.avatar_url,
        bio: userData.bio,
        linkedinUrl: userData.linkedin_url,
        twitterUrl: userData.twitter_url,
        isVerified: userData.is_verified,
        createdAt: userData.created_at,
      };
      setUser(dbUser);
      setLoading(false);
      setIsReady(true);
      return dbUser;

    } catch (error) {
      console.error('DEBUG: Caught error in fetchUserProfile:', error);
      return createUserFromAuth('Database connection failed, using auth data fallback');
    } finally {
      isFetchingProfile = false;
    }
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

        setSession(session);
        if (session?.user) {
          console.log('Initial session found, fetching profile...');
          await fetchUserProfile(session.user);
        } else {
          console.log('No initial session, setting loading to false');
          setUser(null);
          setLoading(false);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
        setIsReady(true);
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      if (!isMounted || isProcessing || event === 'INITIAL_SESSION') return;

      isProcessing = true;
      setSession(session);

      if (session?.user) {
        console.log('Session changed, fetching profile...');
        await fetchUserProfile(session.user);
      } else {
        console.log('Session ended, clearing user');
        setUser(null);
        setLoading(false);
      }

      isProcessing = false;
    });

    authSubscription = subscription;

    getInitialSession();

    return () => {
      isMounted = false;
      if (initialized.current) {
        // Only reset global flag and unsubscribe if this instance created the listener
        globalAuthInitialized = false;
        initialized.current = false;
        subscription.unsubscribe();
      }
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

      // Update local user state
      setUser(prev => prev ? { ...prev, ...updates } : null);

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


