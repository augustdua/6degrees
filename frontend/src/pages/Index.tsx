import GuestRequestView from "@/components/GuestRequestView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { LogIn } from "lucide-react";
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
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
              Lunch with people building things — near you.
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              Turn the most overlooked hour of your day into real relationships.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => navigate("/invite")}>
                Request Access
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 pb-14">
        <div className="max-w-3xl space-y-10">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">The problem</h2>
            <p className="mt-3 text-muted-foreground">
              You eat lunch every day. Usually alone. Or with the same people.
            </p>
            <p className="mt-3 text-muted-foreground">
              Meanwhile, builders, founders, and operators around you are doing the same thing — a few minutes away.
            </p>
            <p className="mt-3 text-muted-foreground">
              You might meet them at an event someday. Or never.
            </p>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <div>See who’s free for lunch nearby.</div>
              <div>Request to join. Or host your own.</div>
              <div>Show up. Eat. Talk about what you’re building.</div>
              <div>No event. No pitches. No awkward networking.</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">What happens over time</h2>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <div>After each lunch, you leave a short note.</div>
              <div>People you invited see it. You see who they’re meeting.</div>
              <div>Patterns emerge.</div>
              <div>Interesting people surface — not randomly, but through people you trust.</div>
              <div>Your network grows because you ate lunch. It stays warm because you stay visible.</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Bring your tribe with you</h2>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <div>CrossLunch works best with people you already respect.</div>
              <div>Invite ex-colleagues, batchmates, or people you’ve built things with before.</div>
              <div>Who you invite matters. Every connection here has a trust path behind it.</div>
              <div>Old relationships don’t fade. New ones come through people you already trust.</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Why lunch</h2>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <div>You’re already eating.</div>
              <div>Forty-five minutes is enough for a real conversation.</div>
              <div>No name tags. No stages. No small talk pretending to be networking.</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Six months from now</h2>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <div>You’ve had dozens of lunches.</div>
              <div>You’ve met people building things you admire.</div>
              <div>
                Your network isn’t a list of contacts you hesitate to message. It’s people you’ve shared meals with — and
                people one step away from them.
              </div>
              <div>Your next hire, advisor, or partner isn’t a cold intro.</div>
              <div>They’re one or two lunches away.</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Not a network. A tribe.</h2>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <div>Networks are wide and cold. You collect people and forget them.</div>
              <div>A tribe is smaller and warmer. You show up. You stay visible. You help each other.</div>
              <div>CrossLunch helps you build that — one meal at a time.</div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">This is for you if</h2>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <div>You’re building something.</div>
              <div>You eat lunch anyway.</div>
              <div>You want relationships that actually show up when it matters.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 pb-20">
        <div className="max-w-2xl">
          <Button size="lg" onClick={() => navigate("/invite")}>
            Request Access
          </Button>
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



