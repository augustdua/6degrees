import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLinkedIn } from '@/hooks/useLinkedIn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LinkedInCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleLinkedInCallback } = useLinkedIn();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // If this is a Supabase OAuth callback (e.g., LinkedIn (OIDC)), we may land here with `code` as well.
      // Prefer handling via the unified /auth/callback route; redirect there to complete PKCE exchange.
      // This keeps compatibility with the older "connect LinkedIn" flow that also uses /linkedin/callback.
      const isSupabaseOAuth = searchParams.get('code') && !searchParams.get('state');
      if (isSupabaseOAuth) {
        const qs = window.location.search || '';
        navigate(`/auth/callback${qs}`, { replace: true });
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle OAuth errors
      if (errorParam) {
        setStatus('error');
        setError(
          errorDescription ||
          (errorParam === 'user_cancelled_login'
            ? 'LinkedIn connection was cancelled'
            : 'LinkedIn authorization failed')
        );
        return;
      }

      // Handle missing parameters
      if (!code || !state) {
        setStatus('error');
        setError('Invalid callback parameters. Please try connecting again.');
        return;
      }

      try {
        // Ensure we have a session. If not authenticated, this is likely a signup/login attempt.
        // We'll try to complete it via Supabase (detectSessionInUrl already runs in supabase client),
        // and fall back to the existing connect flow if a user is present.
        const { data: sess } = await supabase.auth.getSession();
        if (!sess?.session?.user) {
          // Not signed in; send the user through the canonical OAuth callback handler.
          const qs = window.location.search || '';
          navigate(`/auth/callback${qs}`, { replace: true });
          return;
        }

        await handleLinkedInCallback(code, state);
        setStatus('success');

        // Redirect to profile after a short delay
        setTimeout(() => {
          navigate('/profile', { replace: true });
        }, 2000);

      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to connect LinkedIn');
      }
    };

    handleCallback();
  }, [searchParams, handleLinkedInCallback, navigate]);

  const handleRetry = () => {
    navigate('/profile', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting LinkedIn
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                LinkedIn Connected!
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                Connection Failed
              </>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <p className="text-muted-foreground">
              Please wait while we connect your LinkedIn profile...
            </p>
          )}

          {status === 'success' && (
            <>
              <p className="text-green-700">
                Your LinkedIn profile has been successfully connected to Zaurq!
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to your profile...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-red-700 mb-4">
                {error || 'An unexpected error occurred'}
              </p>
              <Button onClick={handleRetry} variant="outline">
                Back to Profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}