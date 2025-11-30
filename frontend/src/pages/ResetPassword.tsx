import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Lock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true); // New verifying state
  const [isValidToken, setIsValidToken] = useState(false); // Default to false until verified
  const [errorType, setErrorType] = useState<'expired' | 'invalid' | null>(null); // Track specific error
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const verifyToken = async () => {
      console.log("ResetPassword: Starting token verification...");
      console.log("ResetPassword: Current hash:", window.location.hash);
      
      // Parse the hash parameters
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const tokenHash = hashParams.get('token_hash');
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const errorCode = hashParams.get('error_code');
      const errorDescription = hashParams.get('error_description');
      
      // Check for errors in hash (from old flow)
      if (errorCode) {
        console.error("ResetPassword: Error in hash:", errorCode, errorDescription);
        if (mounted) {
          setErrorType(errorCode === 'otp_expired' ? 'expired' : 'invalid');
          setVerifying(false);
        }
        return;
      }
      
      // 1. Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("ResetPassword: Existing session found");
        if (mounted) {
          setIsValidToken(true);
          setVerifying(false);
        }
        return;
      }
      
      // 2. Handle PKCE flow with token_hash
      if (tokenHash && type === 'recovery') {
        console.log("ResetPassword: PKCE token_hash found, verifying...");
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          
          if (error) {
            console.error("ResetPassword: OTP verification failed:", error);
            if (mounted) {
              setErrorType(error.message.includes('expired') ? 'expired' : 'invalid');
              setVerifying(false);
            }
            return;
          }
          
          if (data.session) {
            console.log("ResetPassword: PKCE verification successful!");
            if (mounted) {
              setIsValidToken(true);
              setVerifying(false);
            }
          }
        } catch (err: any) {
          console.error("ResetPassword: Exception during verification:", err);
          if (mounted) {
            setErrorType('invalid');
            setVerifying(false);
          }
        }
        return;
      }
      
      // 3. Handle old flow with access_token (fallback)
      if (accessToken) {
        console.log("ResetPassword: Legacy access_token found, waiting for Supabase to parse...");
        // Supabase should auto-parse this, wait for auth state change
        return;
      }
      
      // 4. No valid hash found
      console.log("ResetPassword: No valid token found in URL");
      if (mounted) {
        setVerifying(false);
      }
    };

    // Listen for auth state changes (for legacy flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("ResetPassword Auth Event:", event, "Session:", !!session);
      
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        console.log("ResetPassword: Auth event received, token valid");
        if (mounted) {
          setIsValidToken(true);
          setVerifying(false);
        }
      }
    });

    // Small delay then verify
    setTimeout(() => {
      verifyToken();
    }, 100);

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted && verifying) {
        console.log("ResetPassword: Verification timed out");
        setVerifying(false);
      }
    }, 10000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Password Updated!",
        description: "Your password has been successfully reset.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="p-8 max-w-md w-full shadow-network text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Verifying Link...</h2>
          <p className="text-muted-foreground">Please wait while we verify your security token.</p>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="p-8 max-w-md w-full shadow-network text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Invalid or Expired Link</h2>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Button onClick={() => navigate("/forgot-password")} className="w-full">
            Request New Reset Link
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="p-8 max-w-md w-full shadow-network text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Password Reset Successful!</h2>
          <p className="text-muted-foreground mb-6">
            Your password has been updated. Redirecting to dashboard...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="p-8 max-w-md w-full shadow-network">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Reset Your Password</h2>
          <p className="text-muted-foreground mt-2">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 6 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-sm text-red-600">Passwords do not match</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || password !== confirmPassword || password.length < 6}
          >
            {loading ? "Updating Password..." : "Reset Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
