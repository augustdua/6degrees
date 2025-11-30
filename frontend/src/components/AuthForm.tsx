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
import { Loader2 } from "lucide-react";

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
    const handleMagicLink = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const tokenHash = hashParams.get('token_hash');
      const type = hashParams.get('type');
      
      if (tokenHash && type === 'magiclink') {
        console.log("AuthForm: Magic link token_hash found, verifying...");
        setVerifyingMagicLink(true);
        
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });
          
          if (error) {
            console.error("AuthForm: Magic link verification failed:", error);
            toast({
              title: "Link Expired or Invalid",
              description: "Please request a new magic link.",
              variant: "destructive",
            });
          } else if (data.session) {
            console.log("AuthForm: Magic link verification successful!");
            toast({
              title: "Welcome!",
              description: "You've successfully signed in.",
            });
            // Clear the hash
            window.history.replaceState(null, '', window.location.pathname);
            navigate(returnUrl || "/feed");
          }
        } catch (err) {
          console.error("AuthForm: Exception during magic link verification:", err);
        } finally {
          setVerifyingMagicLink(false);
        }
      }
    };
    
    handleMagicLink();
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
          title: "Account Created!",
          description: "Please check your email to verify your account before signing in.",
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <Card className="p-8 max-w-md w-full shadow-2xl">
      <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Welcome Back</h2>
              <p className="text-muted-foreground">Sign in to your 6Degree account</p>
            </div>

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Join 6Degree</h2>
              <p className="text-muted-foreground">Create your account to start networking</p>
            </div>

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
              <Label htmlFor="linkedinUrl">LinkedIn Profile URL (Optional)</Label>
              <Input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                placeholder="https://www.linkedin.com/in/your-profile"
                value={formData.linkedinUrl}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Your LinkedIn profile helps others connect with you professionally
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
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
    </div>
  );
}


