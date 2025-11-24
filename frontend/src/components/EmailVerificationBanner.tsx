import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const EmailVerificationBanner: React.FC = () => {
  const { user, resendVerificationEmail } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Don't show banner if user is verified or not logged in
  if (!user || user.isVerified) {
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    setResent(false);

    try {
      const { error } = await resendVerificationEmail();

      if (error) {
        console.error('Error resending verification email:', error);
        alert('Failed to resend verification email. Please try again.');
      } else {
        setResent(true);
        setTimeout(() => setResent(false), 5000); // Hide success message after 5s
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Alert className="border-white/20 bg-white/5 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-[#CBAA5A] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <strong className="font-semibold">Please verify your email address</strong>
                <p className="text-sm mt-1">
                  We sent a verification email to <strong>{user.email}</strong>.
                  Click the link in the email to verify your account and unlock all features.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {resent ? (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm whitespace-nowrap">
                    <CheckCircle className="h-4 w-4" />
                    <span>Email sent!</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResend}
                    disabled={resending}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 whitespace-nowrap"
                  >
                    {resending ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Resend Email
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};

export default EmailVerificationBanner;
