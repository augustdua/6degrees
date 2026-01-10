import { getSupabase } from './supabaseClient';
import { apiGet, updateCachedAuthToken } from './api';
import { consumePostAuthRedirect } from './oauthRedirect';

let isBootstrapped = false;
const isDev = import.meta.env.DEV;

const OAUTH_CALLBACK_PATH = '/auth/callback';

async function handleOAuthCallbackIfPresent() {
  // Handle Supabase PKCE callback as early as possible (before React Router mounts)
  // so users never get trapped on /auth/callback.
  try {
    if (window.location.pathname !== OAUTH_CALLBACK_PATH) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error') || params.get('error_code');
    const errorDesc = params.get('error_description');

    const target = consumePostAuthRedirect('/feed');

    if (error) {
      if (isDev) console.warn('OAuth callback error:', error, errorDesc);
      // Let the callback UI render the error (keeps it user-friendly).
      return;
    }

    // If we're already signed in, jump immediately.
    const [{ data: s }, { data: u }] = await Promise.all([
      getSupabase().auth.getSession(),
      getSupabase().auth.getUser(),
    ]);
    if (s?.session?.user || u?.user) {
      window.location.replace(target);
      return;
    }

    if (!code) return;

    const exchange = getSupabase().auth.exchangeCodeForSession(code);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out exchanging OAuth code.')), 8000)
    );
    await Promise.race([exchange, timeout]);

    // Redirect regardless; the main app will read the session on the target route.
    window.location.replace(target);
  } catch (e) {
    if (isDev) console.warn('OAuth bootstrap handler failed:', e);
    // Fall back to rendering /auth/callback route UI (it can show errors / manual continue).
  }
}

async function bootstrap() {
  if (isBootstrapped) return;

  if (isDev) console.log('🚀 Bootstrapping application...');
  const supabase = getSupabase();

  try {
    // Handle OAuth callback ASAP (prevents getting stuck on the callback screen).
    await handleOAuthCallbackIfPresent();

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