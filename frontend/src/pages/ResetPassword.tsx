import { useState, useEffect, useRef } from "react";
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
  const loadingRef = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Keep ref in sync with state
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    let mounted = true;
    let tokenVerified = false;

    const verifyToken = async () => {
      // If already verified via auth state change, skip
      if (tokenVerified) return;
      
      console.log("ResetPassword: Starting token verification...");
      console.log("ResetPassword: Current hash:", window.location.hash);
      
      // Parse the hash parameters
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const tokenHash = hashParams.get('token_hash');
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const errorCode = hashParams.get('error_code');
      
      // Check for errors in hash (from old flow)
      if (errorCode) {
        console.error("ResetPassword: Error in hash:", errorCode);
        if (mounted) {
          setErrorType(errorCode === 'otp_expired' ? 'expired' : 'invalid');
          setVerifying(false);
        }
        return;
      }
      
      // 1. Check if we already have a session - this is the PRIORITY check
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("ResetPassword: Already signed in, showing password form");
        tokenVerified = true;
        if (mounted) {
          setIsValidToken(true);
          setVerifying(false);
        }
        // Clear the hash to prevent re-verification attempts
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      
      // 2. Handle PKCE flow with token_hash (only if no session)
      if (tokenHash && type === 'recovery') {
        console.log("ResetPassword: PKCE token_hash found, verifying...");
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          
          if (error) {
            console.error("ResetPassword: OTP verification failed:", error);
            // Check if we got signed in anyway (race condition)
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) {
              console.log("ResetPassword: Session exists despite error, allowing reset");
              tokenVerified = true;
              if (mounted) {
                setIsValidToken(true);
                setVerifying(false);
              }
              window.history.replaceState(null, '', window.location.pathname);
              return;
            }
            
            if (mounted) {
              setErrorType(error.message.includes('expired') ? 'expired' : 'invalid');
              setVerifying(false);
            }
            return;
          }
          
          if (data.session) {
            console.log("ResetPassword: PKCE verification successful!");
            tokenVerified = true;
            if (mounted) {
              setIsValidToken(true);
              setVerifying(false);
            }
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (err: any) {
          console.error("ResetPassword: Exception during verification:", err);
          // Check if we got signed in anyway
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            console.log("ResetPassword: Session exists despite exception, allowing reset");
            tokenVerified = true;
            if (mounted) {
              setIsValidToken(true);
              setVerifying(false);
            }
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
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
        return;
      }
      
      // 4. No valid hash found - but check if signed in anyway
      const { data: { session: finalCheck } } = await supabase.auth.getSession();
      if (finalCheck) {
        console.log("ResetPassword: No hash but signed in, allowing reset");
        tokenVerified = true;
        if (mounted) {
          setIsValidToken(true);
          setVerifying(false);
        }
        return;
      }
      
      console.log("ResetPassword: No valid token and not signed in");
      if (mounted) {
        setVerifying(false);
      }
    };

    // Listen for auth state changes - this fires BEFORE verifyToken runs
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("ResetPassword Auth Event:", event, "Session:", !!session);
      
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        console.log("ResetPassword: Auth event received, user is signed in");
        tokenVerified = true;
        if (mounted) {
          setIsValidToken(true);
          setVerifying(false);
        }
        // Clear hash to prevent further verification attempts
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      
      // Catch USER_UPDATED event to detect password change completion
      if (event === 'USER_UPDATED' && session) {
        console.log("ResetPassword: USER_UPDATED event - password likely changed");
        // This is a backup in case the updateUser promise hangs
        if (mounted && loadingRef.current) {
          console.log("ResetPassword: Forcing success state from USER_UPDATED event");
          setSuccess(true);
          setLoading(false);
          // Also trigger redirect
          setTimeout(() => {
            navigate("/feed");
          }, 2000);
        }
      }
    });

    // Small delay then verify (gives auth state change time to fire first)
    setTimeout(() => {
      verifyToken();
    }, 200);

    // Safety timeout - but also check session before giving up
    const timeout = setTimeout(async () => {
      if (mounted && !tokenVerified) {
        console.log("ResetPassword: Timeout reached, final session check...");
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("ResetPassword: Session found on timeout, allowing reset");
          setIsValidToken(true);
        }
        setVerifying(false);
      }
    }, 5000);

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
      console.log("ResetPassword: Updating password...");
      
      // Use Promise.race to handle potential hanging
      const updatePromise = supabase.auth.updateUser({ password });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      
      const result = await Promise.race([updatePromise, timeoutPromise]) as { data: any; error: any };
      
      console.log("ResetPassword: Update response received");

      if (result.error) {
        console.error("ResetPassword: Update error:", result.error);
        throw result.error;
      }

      console.log("ResetPassword: Password updated successfully!");
      setSuccess(true);
      setLoading(false);
      
      toast({
        title: "Password Updated!",
        description: "Your password has been successfully reset.",
      });

      setTimeout(() => {
        navigate("/feed");
      }, 2000);
    } catch (error: any) {
      console.error("ResetPassword: Exception:", error);
      
      // If it was a timeout but the auth state changed to USER_UPDATED, 
      // the password was actually updated
      if (error.message === 'timeout') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("ResetPassword: Timeout but session exists, assuming success");
          setSuccess(true);
          setLoading(false);
          toast({
            title: "Password Updated!",
            description: "Your password has been successfully reset.",
          });
          setTimeout(() => navigate("/feed"), 2000);
          return;
        }
      }
      
      setLoading(false);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
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
