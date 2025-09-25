import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Enhanced Supabase client with better session management
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Add these options for better session handling
    flowType: 'pkce', // Use PKCE flow for better security
    debug: process.env.NODE_ENV === 'development' // Enable debug in development
  },
  realtime: { 
    params: { eventsPerSecond: 10 } 
  },
  // Add global headers to ensure Authorization is included
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web/2.57.4'
    }
  }
});

// Enhanced auth state change handler
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event, session?.user?.id);
  
  // Set Realtime auth
  if (session?.access_token) {
    supabase.realtime.setAuth(session.access_token);
  } else {
    supabase.realtime.setAuth('');
  }
  
  // Log session details for debugging
  if (session) {
    console.log('Session details:', {
      userId: session.user.id,
      expiresAt: new Date(session.expires_at * 1000),
      hasAccessToken: !!session.access_token,
      hasRefreshToken: !!session.refresh_token
    });
  }
});

// Utility function to ensure authenticated requests
export const ensureAuthenticatedRequest = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Session error: ${error.message}`);
  }
  
  if (!session) {
    throw new Error('No active session');
  }
  
  if (Date.now() > session.expires_at * 1000) {
    console.log('Session expired, refreshing...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session) {
      throw new Error('Session refresh failed');
    }
    
    return refreshData.session;
  }
  
  return session;
};

// Enhanced RPC call wrapper that ensures Authorization header with fallback
export const authenticatedRpc = async <T = unknown>(
  functionName: string,
  params: Record<string, any>
): Promise<T | null> => {
  // Ensure valid session first
  const session = await ensureAuthenticatedRequest();
  const accessToken = session.access_token;

  console.log('Making authenticated RPC call:', {
    function: functionName,
    userId: session.user.id,
    hasAccessToken: !!accessToken
  });

  // Primary path: supabase.rpc (should attach Authorization automatically)
  const { data, error, status } = await supabase.rpc(functionName, params);

  if (!error) {
    // Many RPCs return void → PostgREST 204 ⇒ supabase-js returns null data (which is fine)
    console.log('RPC call successful via supabase.rpc');
    return (data as T) ?? null;
  }

  // Fallback only for header/session-ish failures (seen in your HAR)
  if (status === 401 || status === 403 || status === 404) {
    console.log('RPC call failed with auth error, trying manual fetch with explicit Authorization header');
    
    const url = `${supabaseUrl}/rest/v1/rpc/${functionName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Profile': 'public'
      },
      body: JSON.stringify(params)
    });

    if (res.ok) {
      console.log('RPC call successful via manual fetch');
      if (res.status === 204) return null;          // void RPC
      const text = await res.text();
      return text ? (JSON.parse(text) as T) : null;  // non-void RPCs
    }

    const text = await res.text();
    throw new Error(`RPC ${functionName} failed (${res.status}): ${text || res.statusText}`);
  }

  // Propagate original error for all other cases (e.g., SQL errors)
  console.error('RPC call failed with non-auth error:', {
    function: functionName,
    error: error.message,
    code: error.code,
    details: error.details,
    status: status
  });
  throw error;
};

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


