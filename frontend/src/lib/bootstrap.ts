import { getSupabase } from './supabaseClient';
import { apiGet, apiPost, updateCachedAuthToken } from './api';
import { consumePostAuthRedirect } from './oauthRedirect';

let isBootstrapped = false;
const isDev = import.meta.env.DEV;

const OAUTH_CALLBACK_PATH = '/auth/callback';
const OAUTH_PENDING_CODE_KEY = 'oauth_pending_code_v1';
const OAUTH_PENDING_TARGET_KEY = 'oauth_pending_target_v1';
const PENDING_REFERRER_KEY = 'pending_referrer_id_v1';

function captureReferralParamIfPresent() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && typeof ref === 'string') {
      localStorage.setItem(PENDING_REFERRER_KEY, ref);
    }
  } catch {
    // ignore
  }
}

async function redeemReferralIfPresent() {
  try {
    const inviterId = localStorage.getItem(PENDING_REFERRER_KEY) || '';
    if (!inviterId) return;
    await apiPost('/api/user-invites/redeem-referral', { inviterId });
    localStorage.removeItem(PENDING_REFERRER_KEY);
  } catch {
    // Non-fatal: keep it so we can retry on next sign-in
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
}

function getPendingOAuth(): { code: string; target: string } | null {
  try {
    const code = sessionStorage.getItem(OAUTH_PENDING_CODE_KEY) || '';
    const target = sessionStorage.getItem(OAUTH_PENDING_TARGET_KEY) || '';
    if (!code || !target) return null;
    return { code, target };
  } catch {
    return null;
  }
}

function clearPendingOAuth() {
  try {
    sessionStorage.removeItem(OAUTH_PENDING_CODE_KEY);
    sessionStorage.removeItem(OAUTH_PENDING_TARGET_KEY);
  } catch {
    // ignore
  }
}

function setPendingOAuth(code: string, target: string) {
  try {
    sessionStorage.setItem(OAUTH_PENDING_CODE_KEY, code);
    sessionStorage.setItem(OAUTH_PENDING_TARGET_KEY, target);
  } catch {
    // ignore
  }
}

function preRenderRewriteOAuthCallbackUrl() {
  // Synchronous “instant redirect”: replace /auth/callback?code=... with target path
  // before React mounts, then exchange the code in the background.
  if (window.location.pathname !== OAUTH_CALLBACK_PATH) return;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error') || params.get('error_code');

  // If Supabase returned an error, keep the callback URL so the UI can display it.
  if (error) return;
  if (!code) return;

  const target = consumePostAuthRedirect('/feed');
  setPendingOAuth(code, target);

  // Replace URL immediately (no reload) so users don't see the callback URL.
  try {
    window.history.replaceState(null, '', target);
  } catch {
    // ignore (fallbacks exist in bootstrap handler)
  }
}

async function handleOAuthCallbackIfPresent() {
  // Handle Supabase PKCE callback as early as possible (before React Router mounts)
  // so users never get trapped on /auth/callback.
  try {
    const onCallbackPath = window.location.pathname === OAUTH_CALLBACK_PATH;
    const pending = getPendingOAuth();

    // Important: do nothing unless we are actually handling a callback, or we have a pending code
    // that was stashed by preRenderRewriteOAuthCallbackUrl().
    if (!onCallbackPath && !pending) return;

    // Only read/consume post-auth redirect when we truly need it.
    const target = pending?.target || consumePostAuthRedirect('/feed');

    const params = new URLSearchParams(window.location.search);
    const code = pending?.code || params.get('code');
    const error = params.get('error') || params.get('error_code');
    const errorDesc = params.get('error_description');

    if (error) {
      if (isDev) console.warn('OAuth callback error:', error, errorDesc);
      // Let the callback UI render the error (keeps it user-friendly).
      // Also clear any stashed pending values so we don't keep trying later.
      clearPendingOAuth();
      return;
    }

    // Absolute failsafe: only needed if we are still on /auth/callback.
    // If we already rewrote to /feed, forcing a replace() would cause a full reload loop.
    const hardRedirect = onCallbackPath
      ? setTimeout(() => {
          try {
            window.location.replace(target);
          } catch {
            // ignore
          }
        }, 9000)
      : null;

    // If we're already signed in, jump immediately.
    const [{ data: s }, { data: u }] = await withTimeout(
      Promise.all([getSupabase().auth.getSession(), getSupabase().auth.getUser()]),
      4000,
      'Timed out reading session.'
    );
    if (s?.session?.user || u?.user) {
      clearPendingOAuth();
      if (hardRedirect) clearTimeout(hardRedirect);
      // Only navigate if we're actually still on the callback URL.
      if (onCallbackPath) window.location.replace(target);
      return;
    }

    if (!code) return;

    const exchangeResult = await withTimeout(
      getSupabase().auth.exchangeCodeForSession(code),
      8000,
      'Timed out exchanging OAuth code.'
    );

    // If we got a hard error back, let the /auth/callback UI render (it shows a message + buttons).
    if ((exchangeResult as any)?.error) {
      clearPendingOAuth();
      if (hardRedirect) clearTimeout(hardRedirect);
      return;
    }

    // Clear pending and only redirect if we're still on the callback URL.
    if (hardRedirect) clearTimeout(hardRedirect);
    clearPendingOAuth();
    if (onCallbackPath) window.location.replace(target);
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
    captureReferralParamIfPresent();

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

      // Best-effort: redeem referral after we have auth token cached.
      await redeemReferralIfPresent();

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

  // Instant UX: rewrite /auth/callback to target before React renders anything.
  preRenderRewriteOAuthCallbackUrl();

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

      // Best-effort: redeem referral after sign-in.
      await redeemReferralIfPresent();
    }
  });
};