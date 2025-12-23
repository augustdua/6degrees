import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLinkedIn } from '@/hooks/useLinkedIn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function LinkedInCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleLinkedInCallback } = useLinkedIn();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
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