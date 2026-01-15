import GuestRequestView from "@/components/GuestRequestView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { ArrowRight, LogIn, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function Index() {
  const { user } = useAuth();
  const { getRequestByLink } = useRequests();
  const { linkId } = useParams();
  const navigate = useNavigate();

  const [requestData, setRequestData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!linkId) return;
    setLoading(true);
    getRequestByLink(linkId)
      .then((data) => setRequestData(data))
      .catch((error) => console.error("Error fetching request:", error))
      .finally(() => setLoading(false));
  }, [getRequestByLink, linkId]);

  // If we're viewing a specific request link
  if (linkId) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading request...</p>
          </div>
        </div>
      );
    }

    if (!requestData) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Request Not Found</h1>
            <p className="text-muted-foreground mb-6">This connection request could not be found or has expired.</p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <main className="min-h-screen py-20 px-4">
        <header className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Button variant="ghost" asChild>
              <Link to="/">← Back to Home</Link>
            </Button>
            <div className="flex gap-2">
              {user ? (
                <Button asChild>
                  <Link to="/discover">Open app</Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/auth">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <GuestRequestView request={requestData.request} chain={requestData.chain} linkId={linkId} />
      </main>
    );
  }

  // Landing page (logged out)
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#ff4fc6] to-[#fd9fff] ring-1 ring-border grid place-items-center">
              <span className="font-bold text-white">CL</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">CrossLunch</div>
              <div className="text-xs text-muted-foreground">Meet high-signal people over lunch</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/invite")}>
              Have a code?
            </Button>
            <Button onClick={() => navigate("/auth")}>
              <LogIn className="h-4 w-4 mr-2" />
              Sign in
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#fd9fff]/35 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#ff4fc6]/20 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 relative">
          <div className="max-w-2xl">
            <Badge className="mb-4" variant="secondary">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              New: Discover map + directory
            </Badge>

            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
              The easiest way to meet founders & operators—offline.
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              CrossLunch turns your network into real conversations: discover people near you, get warm intros, and book lunches that lead to momentum.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Start networking
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/invite")}>
                Join with invite code
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Private by default
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Work-location discovery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Seed directory + claimed profiles
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Discover people</div>
              <div className="text-sm text-muted-foreground mt-1">
                Browse the directory, filter/search, and explore by location.
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Get warm intros</div>
              <div className="text-sm text-muted-foreground mt-1">
                Ask for the right intro with context—no awkward cold DMs.
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="text-sm font-semibold">Meet IRL</div>
              <div className="text-sm text-muted-foreground mt-1">
                Turn online connections into real lunches that move things forward.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 pb-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">1) Sign in</div>
              <div className="text-sm text-muted-foreground mt-1">
                Use Google sign-in and land right back where you intended to go.
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">2) Discover</div>
              <div className="text-sm text-muted-foreground mt-1">
                Browse people in the network and explore them on a map.
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold">3) Lunch</div>
              <div className="text-sm text-muted-foreground mt-1">Set up a lunch and build real relationships.</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto px-4 md:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} CrossLunch</div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link to="/legal" className="text-muted-foreground hover:text-foreground">
              Legal
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}


