import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function EmailConfirmed() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If user is authenticated after email confirmation, redirect to dashboard after a short delay
    if (user && !loading) {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-green-800">Email Confirmed!</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your email has been successfully verified. Welcome to 6Degrees!
          </p>

          {user ? (
            <p className="text-sm text-green-600">
              Redirecting to your dashboard...
            </p>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              className="w-full"
            >
              Sign In to Continue
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}