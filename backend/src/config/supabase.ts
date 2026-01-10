import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
// Prefer process env (Railway/CI), but for local dev/scripts also support `env.local` in repo root.
dotenv.config();
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Attempt local override (used in this repo)
  dotenv.config({ path: path.resolve(process.cwd(), 'env.local') });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create Supabase client with anon key for user operations
export const supabaseAnon = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

export default supabase;


