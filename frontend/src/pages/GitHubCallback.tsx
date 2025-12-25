import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiPost, API_ENDPOINTS } from '@/lib/api';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function GitHubCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const installationId = searchParams.get('installation_id');
      if (!installationId) {
        setStatus('error');
        setError('Missing installation_id. Please try connecting GitHub again.');
        return;
      }
      // If user is not logged in on this domain, redirect to auth first.
      if (!authLoading && !user) {
        const returnUrl = `/github/callback?installation_id=${encodeURIComponent(installationId)}`;
        navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
        return;
      }
      if (authLoading || !user) return;
      try {
        await apiPost(API_ENDPOINTS.GITHUB_ATTACH, { installationId: Number(installationId) });
        setStatus('success');
        setTimeout(() => navigate('/profile', { replace: true }), 1200);
      } catch (e: any) {
        setStatus('error');
        setError(e?.message || 'Failed to connect GitHub');
      }
    };
    run();
  }, [navigate, searchParams, user, authLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting GitHub
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                GitHub Connected!
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
              Please wait while we connect your GitHub…
            </p>
          )}

          {status === 'success' && (
            <>
              <p className="text-green-700">
                GitHub connected. Redirecting to your profile…
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-red-700 mb-4">
                {error || 'An unexpected error occurred'}
              </p>
              <Button onClick={() => navigate('/profile', { replace: true })} variant="outline">
                Back to Profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


