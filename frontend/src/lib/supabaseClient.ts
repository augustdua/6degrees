import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

let _client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (_client) return _client;

  _client = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'sb-6degree', // custom key to avoid collisions
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce', // Use PKCE flow to prevent email scanners from consuming tokens
      }
    }
  );

  // Handle auth state changes and token refresh failures
  _client.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('✅ Token refreshed successfully');
    } else if (event === 'SIGNED_OUT') {
      console.log('🔓 User signed out');
      // Clear any cached data
      localStorage.removeItem('sb-6degree-auth-token');
    }
  });

  return _client;
}

// Export a typed supabase client directly
export const supabase = getSupabase();