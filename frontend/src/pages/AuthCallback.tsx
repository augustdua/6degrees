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

      // Otherwise, Supabase JS (detectSessionInUrl) should exchange the code and set session.
      // Give it a moment, then check session and redirect.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const target = consumePostAuthRedirect('/feed');
          navigate(target, { replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!cancelled) {
        setStatus('error');
        setErrorText('Signed in, but no session was created. Please try again.');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, errorParam, errorDescription, errorCode]);

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
                onClick={() => navigate('/auth', { replace: true })}
                className="px-4 py-2 rounded-full bg-[#CBAA5A] text-black font-bold"
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


