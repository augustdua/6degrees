import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: { 
    params: { eventsPerSecond: 10 } 
  }
});

// Keep Realtime in sync with session token
supabase.auth.onAuthStateChange((_evt, session) => {
  supabase.realtime.setAuth(session?.access_token ?? '');
});

console.log('Supabase client created with URL:', supabaseUrl);

// Optional connection test - only run if explicitly requested
export const testConnection = async () => {
  try {
    console.log('Testing database connection...');

    // Test with shorter timeout
    const connectionTest = supabase.from('users').select('count', { count: 'exact', head: true });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection test timeout')), 2000);
    });

    const result = await Promise.race([connectionTest, timeoutPromise]);
    console.log('✅ Database connection successful:', result);
    return { success: true, result };

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('This might indicate:');
    console.log('- Database/RLS policies preventing access');
    console.log('- Users table does not exist');
    console.log('- Network connectivity issues');
    console.log('- Invalid Supabase credentials');
    return { success: false, error };
  }
};

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url?: string;
          bio?: string;
          linkedin_url?: string;
          twitter_url?: string;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url?: string;
          bio?: string;
          linkedin_url?: string;
          twitter_url?: string;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          avatar_url?: string;
          bio?: string;
          linkedin_url?: string;
          twitter_url?: string;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      connection_requests: {
        Row: {
          id: string;
          creator_id: string;
          target: string;
          message?: string;
          reward: number;
          status: 'active' | 'completed' | 'expired' | 'cancelled';
          expires_at: string;
          shareable_link: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          target: string;
          message?: string;
          reward: number;
          status?: 'active' | 'completed' | 'expired' | 'cancelled';
          expires_at?: string;
          shareable_link: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_id?: string;
          target?: string;
          message?: string;
          reward?: number;
          status?: 'active' | 'completed' | 'expired' | 'cancelled';
          expires_at?: string;
          shareable_link?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chains: {
        Row: {
          id: string;
          request_id: string;
          participants: any[];
          status: 'active' | 'completed' | 'failed';
          completed_at?: string;
          total_reward: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          participants: any[];
          status?: 'active' | 'completed' | 'failed';
          completed_at?: string;
          total_reward: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          request_id?: string;
          participants?: any[];
          status?: 'active' | 'completed' | 'failed';
          completed_at?: string;
          total_reward?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      rewards: {
        Row: {
          id: string;
          chain_id: string;
          user_id: string;
          amount: number;
          status: 'pending' | 'paid' | 'failed';
          paid_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chain_id: string;
          user_id: string;
          amount: number;
          status?: 'pending' | 'paid' | 'failed';
          paid_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chain_id?: string;
          user_id?: string;
          amount?: number;
          status?: 'pending' | 'paid' | 'failed';
          paid_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}


