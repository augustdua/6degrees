import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { consumePostAuthRedirect } from '@/lib/oauthRedirect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  // Compute once per mount; we only want to consume the stored redirect once.
  const targetPath = useMemo(() => consumePostAuthRedirect('/'), []);

  useEffect(() => {
    const oauthError =
      searchParams.get('error_description') ||
      searchParams.get('error') ||
      searchParams.get('message');

    if (oauthError) {
      setStatus('error');
      setError(oauthError);
      return;
    }

    let timeout: number | undefined;
    let unsub: (() => void) | undefined;

    const finish = (to: string) => {
      if (timeout) window.clearTimeout(timeout);
      if (unsub) unsub();
      navigate(to, { replace: true });
    };

    const run = async () => {
      // Supabase JS will process the URL on load (detectSessionInUrl: true),
      // but on slower devices we might need to wait a tick for session hydration.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        finish(targetPath);
        return;
      }

      const { data } = supabase.auth.onAuthStateChange((event, session2) => {
        if (event === 'SIGNED_IN' && session2) {
          finish(targetPath);
        }
      });
      unsub = () => data.subscription.unsubscribe();

      timeout = window.setTimeout(() => {
        setStatus('error');
        setError('Login timed out. Please try again.');
      }, 12000);
    };

    run().catch((e: any) => {
      setStatus('error');
      setError(e?.message || 'Failed to complete sign-in.');
    });

    return () => {
      if (timeout) window.clearTimeout(timeout);
      if (unsub) unsub();
    };
  }, [navigate, searchParams, targetPath]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Sign-in failed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">{error || 'An unexpected error occurred.'}</p>
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => navigate('/auth', { replace: true })}
            >
              Back to sign in
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Completing sign-in…
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">Hang tight while we finish logging you in.</p>
        </CardContent>
      </Card>
    </div>
  );
}


