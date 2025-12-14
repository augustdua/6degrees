import { getSupabase } from './supabaseClient';
import type { Database } from './database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

const isDev = import.meta.env.DEV;

// Export the singleton instance with proper typing
export const supabase: SupabaseClient<Database> = getSupabase();

// Enhanced auth state change handler
supabase.auth.onAuthStateChange(async (event, session) => {
  if (isDev) console.log('Auth state changed:', event, session?.user?.id);
  
  // Set Realtime auth
  if (session?.access_token) {
    supabase.realtime.setAuth(session.access_token);
  } else {
    supabase.realtime.setAuth('');
  }
  
  // Log session details for debugging
  if (session) {
    if (isDev) console.log('Session details:', {
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
    if (isDev) console.log('Session expired, refreshing...');
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
  functionName: keyof Database['public']['Functions'],
  params: Record<string, any>
): Promise<T | null> => {
  // Ensure valid session first
  const session = await ensureAuthenticatedRequest();
  const accessToken = session.access_token;

  if (isDev) console.log('Making authenticated RPC call:', {
    function: functionName,
    userId: session.user.id,
    hasAccessToken: !!accessToken
  });

  // Primary path: supabase.rpc (should attach Authorization automatically)
  const { data, error, status } = await supabase.rpc(functionName, params);

  if (!error) {
    // Many RPCs return void → PostgREST 204 ⇒ supabase-js returns null data (which is fine)
    if (isDev) console.log('RPC call successful via supabase.rpc');
    return (data as T) ?? null;
  }

  // Fallback only for header/session-ish failures (seen in your HAR)
  if (status === 401 || status === 403 || status === 404) {
    if (isDev) console.log('RPC call failed with auth error, trying manual fetch with explicit Authorization header');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

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
      if (isDev) console.log('RPC call successful via manual fetch');
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

if (isDev) console.log('Supabase client created with URL:', import.meta.env.VITE_SUPABASE_URL);

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



