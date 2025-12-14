import { getSupabase } from './supabaseClient';
import { apiGet, updateCachedAuthToken } from './api';

let isBootstrapped = false;
const isDev = import.meta.env.DEV;

async function bootstrap() {
  if (isBootstrapped) return;

  if (isDev) console.log('🚀 Bootstrapping application...');
  const supabase = getSupabase();

  try {
    // Wait for initial session
    if (isDev) console.log('📡 Getting initial session...');
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      if (isDev) console.log('✅ User authenticated, loading protected data...');

      // Update token cache BEFORE making API calls
      if (session.access_token) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : undefined;
        updateCachedAuthToken(session.access_token, expiresAt);
      }

      // Load protected data in parallel
      await Promise.allSettled([
        apiGet('/api/credits/balance').catch(err => console.warn('Failed to load credits:', err)),
        // DISABLED: Feed data loading (causes race condition with Feed component)
        // apiGet('/api/feed/data?status=active&limit=20&offset=0').catch(err => console.warn('Failed to load feed:', err)),
      ]);

      if (isDev) console.log('✅ Protected data loaded');
    } else {
      if (isDev) console.log('ℹ️ No authenticated session found');
    }

    isBootstrapped = true;
    if (isDev) console.log('✅ Bootstrap complete');
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
    if (isDev) console.log('🔄 Auth state changed:', event);

    if (event === 'SIGNED_IN' && session) {
      if (isDev) console.log('✅ User signed in, reloading protected data...');

      // Update token cache BEFORE making API calls
      if (session.access_token) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : undefined;
        updateCachedAuthToken(session.access_token, expiresAt);
      }

      // Reload protected data on sign in
      await Promise.allSettled([
        apiGet('/api/credits/balance').catch(err => console.warn('Failed to reload credits:', err)),
        // DISABLED: Feed data loading (causes race condition with Feed component)
        // apiGet('/api/feed/data?status=active&limit=20&offset=0').catch(err => console.warn('Failed to reload feed:', err)),
      ]);
    }
  });
};