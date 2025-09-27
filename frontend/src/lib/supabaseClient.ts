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
      }
    }
  );

  return _client;
}

// Export a typed supabase client directly
export const supabase = getSupabase();