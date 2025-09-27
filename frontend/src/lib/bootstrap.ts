import { getSupabase } from './supabaseClient';
import { apiGet } from './api';

let isBootstrapped = false;

async function bootstrap() {
  if (isBootstrapped) return;

  console.log('🚀 Bootstrapping application...');
  const supabase = getSupabase();

  try {
    // Wait for initial session
    console.log('📡 Getting initial session...');
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      console.log('✅ User authenticated, loading protected data...');

      // Load protected data in parallel
      await Promise.allSettled([
        apiGet('/api/credits/balance').catch(err => console.warn('Failed to load credits:', err)),
        apiGet('/api/feed/data?status=active&limit=20&offset=0').catch(err => console.warn('Failed to load feed:', err)),
      ]);

      console.log('✅ Protected data loaded');
    } else {
      console.log('ℹ️ No authenticated session found');
    }

    isBootstrapped = true;
    console.log('✅ Bootstrap complete');
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
  }
}

// Bind exactly once at app entry
export const initializeApp = () => {
  if (isBootstrapped) return;

  const supabase = getSupabase();

  // Initial bootstrap
  bootstrap();

  // React to auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Auth state changed:', event);

    if (event === 'SIGNED_IN' && session) {
      console.log('✅ User signed in, reloading protected data...');

      // Reload protected data on sign in
      await Promise.allSettled([
        apiGet('/api/credits/balance').catch(err => console.warn('Failed to reload credits:', err)),
        apiGet('/api/feed/data?status=active&limit=20&offset=0').catch(err => console.warn('Failed to reload feed:', err)),
      ]);
    }
  });
};