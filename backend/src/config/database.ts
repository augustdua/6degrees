import { createClient } from '@supabase/supabase-js';

let supabase: any;

export const initializeDatabase = () => {
  console.log('🔍 Environment check:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Found' : '❌ Missing');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables:');
    console.error('- SUPABASE_URL:', supabaseUrl);
    console.error('- SUPABASE_ANON_KEY:', supabaseKey ? 'Present' : 'Missing');
    throw new Error('Missing Supabase environment variables');
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('🗄️ Supabase client initialized');
  console.log(`📍 Project URL: ${supabaseUrl}`);
};

export { supabase };


