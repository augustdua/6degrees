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
            <div className="leading-tight">
              <div
                className="text-lg tracking-tight"
                style={{ fontFamily: "'Cherry Bomb One', system-ui, sans-serif", color: "#000000" }}
              >
                crosslunch
              </div>
              <div className="text-xs text-muted-foreground">Meet high-signal people over lunch</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/invite")}>Apply for a Table</Button>
            <Button variant="ghost" onClick={() => navigate("/auth")}>
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
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="max-w-2xl">
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Every Saturday · 12:00</p>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
                Meet Founders Near You. Bring Your Own Peer.
              </h1>
              <p className="mt-5 text-base md:text-lg text-muted-foreground">
                A curated founder table built on one rule: <strong>you never show up alone.</strong>
              </p>
              <p className="mt-4 text-base md:text-lg text-muted-foreground">
                Bring a co-founder, colleague, or peer. We match your pair with another verified founder pair for Saturday
                brunch.
              </p>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Verified Founders Only · Limited Tables
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => navigate("/invite")}>
                  Apply for a Table
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                  Sign in
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <img
                src="/lp_img_1.jpg"
                alt="Founders at a brunch table"
                className="h-40 md:h-48 w-full rounded-2xl object-cover"
              />
              <img
                src="/lp_img_2.jpg"
                alt="Conversation between founder peers"
                className="h-40 md:h-48 w-full rounded-2xl object-cover"
              />
              <img
                src="/lp_img_3.jpg"
                alt="Saturday founder meetup"
                className="h-40 md:h-48 w-full rounded-2xl object-cover"
              />
              <img
                src="/lp_img_4.jpg"
                alt="Warm founder table setting"
                className="h-40 md:h-48 w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 pb-14">
        <div className="max-w-3xl space-y-12">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Why This Exists</h2>
            <p className="mt-3 text-muted-foreground">
              Most founder networking fails before the conversation starts.
            </p>
            <p className="mt-3 text-muted-foreground">
              Walking into a room alone creates pressure. One-on-ones are high-stakes and often awkward. Large events
              prioritize volume over trust.
            </p>
            <p className="mt-3 text-muted-foreground">The problem isn't founders. It's the format.</p>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Two-on-Two. Not One-on-One.</h2>
            <p className="mt-3 text-muted-foreground">Every table follows the same structure.</p>
            <p className="mt-3 text-muted-foreground">
              <strong>You bring someone you know.</strong> We match you with another pair doing the same.
            </p>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>
                <strong>Your Pair:</strong> A co-founder, ex-colleague, or peer who gets your journey.
              </li>
              <li>
                <strong>Their Pair:</strong> Another founder team building nearby.
              </li>
              <li>
                <strong>The Table:</strong> Four builders. One conversation. No spectators.
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              A familiar face lowers the stakes. The table starts warm. Conversation goes deeper, faster.
            </p>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">How It Works</h2>
            <ol className="mt-4 space-y-4 text-muted-foreground">
              <li>
                <strong>1. Build Your Bench</strong>
                <div>Invite 2–3 peers you'd genuinely sit down with.</div>
              </li>
              <li>
                <strong>2. Weekly Signal</strong>
                <div>
                  One question each week: <em>"In this Saturday?"</em>
                </div>
                <div>If two from your bench opt in, you're locked as a pair.</div>
              </li>
              <li>
                <strong>3. We Make the Match</strong>
                <div>We pair you with another founder duo and share contact details. You pick the spot and show up.</div>
              </li>
            </ol>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Why This Compounds</h2>
            <ul className="mt-4 space-y-2 text-muted-foreground">
              <li>
                <strong>Lower no-shows:</strong> You don't cancel on someone you know.
              </li>
              <li>
                <strong>Higher trust:</strong> Every seat is vouched for twice.
              </li>
              <li>
                <strong>Better outcomes:</strong> Warm intros outperform cold networking by an order of magnitude.
              </li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Most tables end with a follow-up, not a business card.
            </p>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">The Ritual</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-muted-foreground">
              <div>
                <strong>When:</strong> Every Saturday · 12:00–15:00
              </div>
              <div>
                <strong>Where:</strong> You decide
              </div>
              <div>
                <strong>Who:</strong> Verified founders only
              </div>
              <div>
                <strong>Rule:</strong> Pairs only. No solo entries.
              </div>
            </div>
            <p className="mt-4 text-muted-foreground">One table. One sitting. Then you get your Saturday back.</p>
          </div>

          <div className="pt-2">
            <p className="text-lg font-medium">Build your founder circle—without networking alone.</p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 items-start">
              <Button size="lg" onClick={() => navigate("/invite")}>
                Apply for a Table
              </Button>
              <div className="text-sm text-muted-foreground">
                <em>Invite-only · Limited tables each week</em>
              </div>
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



