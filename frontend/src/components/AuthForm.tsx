import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { getOAuthCallbackUrl, setPostAuthRedirect } from "@/lib/oauthRedirect";
import { Loader2, Mail } from "lucide-react";

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    linkedinUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [verifyingMagicLink, setVerifyingMagicLink] = useState(false);
  
  const { toast } = useToast();
  const { signUp, signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  // Handle PKCE magic link verification
  useEffect(() => {
    let mounted = true;
    let verificationComplete = false;
    
    const handleMagicLink = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const tokenHash = hashParams.get('token_hash');
      const type = hashParams.get('type');
      
      if (tokenHash && type === 'magiclink') {
        console.log("AuthForm: Magic link token_hash found, verifying...");
        setVerifyingMagicLink(true);
        
        try {
          // Use Promise.race with timeout since verifyOtp can hang
          const verifyPromise = supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 10000)
          );
          
          const result = await Promise.race([verifyPromise, timeoutPromise]) as { data: any; error: any };
          
          if (result.error) {
            console.error("AuthForm: Magic link verification failed:", result.error);
            // Check if we're signed in anyway (race condition)
            const { data: { session } } = await supabase.auth.getSession();
            if (session && mounted) {
              console.log("AuthForm: Session exists despite error, proceeding");
              verificationComplete = true;
              window.history.replaceState(null, '', window.location.pathname);
              navigate(returnUrl || "/feed");
              return;
            }
            if (mounted) {
              toast({
                title: "Link Expired or Invalid",
                description: "Please request a new magic link.",
                variant: "destructive",
              });
            }
          } else if (result.data?.session) {
            console.log("AuthForm: Magic link verification successful!");
            verificationComplete = true;
            if (mounted) {
              toast({
                title: "Welcome!",
                description: "You've successfully signed in.",
              });
              window.history.replaceState(null, '', window.location.pathname);
              navigate(returnUrl || "/feed");
            }
          }
        } catch (err: any) {
          console.error("AuthForm: Exception during magic link verification:", err);
          // On timeout, check if we're signed in anyway
          if (err.message === 'timeout') {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && mounted) {
              console.log("AuthForm: Timeout but session exists, proceeding");
              verificationComplete = true;
              toast({
                title: "Welcome!",
                description: "You've successfully signed in.",
              });
              window.history.replaceState(null, '', window.location.pathname);
              navigate(returnUrl || "/feed");
              return;
            }
          }
        } finally {
          if (mounted) {
            setVerifyingMagicLink(false);
          }
        }
      }
    };
    
    // Also listen for auth state change as backup
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !verificationComplete && mounted) {
        console.log("AuthForm: SIGNED_IN event received, redirecting...");
        verificationComplete = true;
        setVerifyingMagicLink(false);
        window.history.replaceState(null, '', window.location.pathname);
        toast({
          title: "Welcome!",
          description: "You've successfully signed in.",
        });
        navigate(returnUrl || "/feed");
      }
    });
    
    handleMagicLink();
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, returnUrl, toast]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user && !verifyingMagicLink) {
      navigate(returnUrl || "/feed");
    }
  }, [user, navigate, returnUrl, verifyingMagicLink]);

  // Show loading while checking authentication status or verifying magic link
  if (authLoading || verifyingMagicLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {verifyingMagicLink ? "Verifying magic link..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName,
          formData.linkedinUrl
        );

        if (error) {
          throw error;
        }

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account, then sign in.",
        });

        // Don't redirect after signup - user needs to verify email first
        // Reset form and show sign in tab
        setFormData({
          email: formData.email, // Keep email for convenience
          password: "",
          firstName: "",
          lastName: "",
          linkedinUrl: "",
        });
        setIsSignUp(false);
      } else {
        const { error } = await signIn(formData.email, formData.password);

        if (error) {
          throw error;
        }

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });

        // Redirect to return URL or feed after successful sign in
        navigate(returnUrl || "/feed");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Persist desired destination locally to avoid needing every path allowlisted in Supabase.
      setPostAuthRedirect(returnUrl || "/feed");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthCallbackUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Google Sign-In Button Component
  const GoogleSignInButton = ({ text = "Continue with Google" }: { text?: string }) => (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#CBAA5A] text-black hover:text-black border-gray-300 transition-colors"
      onClick={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span className="font-medium text-black">{text}</span>
    </Button>
  );

  // Divider Component
  const OrDivider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#333]"></div>
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <Card className="p-8 max-w-md w-full shadow-2xl">
      <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to your Zaurq account</p>
          </div>

          {/* Google Sign-In */}
          <GoogleSignInButton text="Sign in with Google" />
          
          <OrDivider />

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Create your account</h2>
            <p className="text-muted-foreground">Sign up to join Zaurq</p>
          </div>

          {/* Google Sign-Up */}
          <GoogleSignInButton text="Sign up with Google" />
          
          <OrDivider />

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn Profile URL (Recommended)</Label>
              <Input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                placeholder="https://www.linkedin.com/in/your-profile"
                value={formData.linkedinUrl}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Adding your LinkedIn profile increases your chances of approval
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
    </div>
  );
}


