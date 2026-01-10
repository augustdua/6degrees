import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { consumePostAuthRedirect } from '@/lib/oauthRedirect';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const errorParam = params.get('error');
  const errorDescription = params.get('error_description');
  const errorCode = params.get('error_code');
  const code = params.get('code');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // If Supabase redirected us here with an error, show it.
      if (errorParam) {
        if (!cancelled) {
          setStatus('error');
          setErrorText(
            errorDescription ||
              errorCode ||
              errorParam ||
              'Authentication failed. Please try again.'
          );
        }
        return;
      }

      const target = consumePostAuthRedirect('/feed');

      // Redirect on auth events (most reliable way to catch session creation).
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return;
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          navigate(target, { replace: true });
        }
      });

      // Explicitly exchange the code for a session (PKCE flow).
      // Relying on detectSessionInUrl alone is flaky across some deployments.
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } catch (e: any) {
          if (!cancelled) {
            setStatus('error');
            setErrorText(e?.message || 'Failed to exchange code for session. Please try again.');
          }
          sub?.subscription?.unsubscribe();
          return;
        }
      }

      // If exchange succeeded, we should have a user even if session read is briefly stale.
      try {
        for (let i = 0; i < 12; i++) {
          const [{ data: s }, { data: u }] = await Promise.all([
            supabase.auth.getSession(),
            supabase.auth.getUser(),
          ]);
          if (s?.session?.user || u?.user) {
            navigate(target, { replace: true });
            sub?.subscription?.unsubscribe();
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        // ignore (we'll show fallback below)
      } finally {
        sub?.subscription?.unsubscribe();
      }

      if (!cancelled) {
        // Fallback: user is likely signed in (as you observed) but the page missed the auth event.
        setStatus('error');
        setErrorText('You may already be signed in. Click “Continue” to proceed.');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, errorParam, errorDescription, errorCode, code]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        {status === 'loading' ? (
          <>
            <div className="text-sm font-bold tracking-[0.18em] uppercase text-muted-foreground">
              Signing you in…
            </div>
            <div className="mt-2 text-foreground">Completing authentication.</div>
            <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-[#CBAA5A] animate-pulse" />
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-bold tracking-[0.18em] uppercase text-red-400">Sign-in failed</div>
            <div className="mt-2 text-sm text-muted-foreground break-words">{errorText}</div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => navigate(consumePostAuthRedirect('/feed'), { replace: true })}
                className="px-4 py-2 rounded-full bg-[#CBAA5A] text-black font-bold"
              >
                Continue
              </button>
              <button
                onClick={() => navigate('/auth', { replace: true })}
                className="px-4 py-2 rounded-full border border-border text-foreground"
              >
                Back to sign in
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="px-4 py-2 rounded-full border border-border text-foreground"
              >
                Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


