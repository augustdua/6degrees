import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";

export default function MyTribe() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-hero p-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Users className="h-4 w-4" />
          My Tribe
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-ink-soft">Your rank grows with who you invite.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          CrossLunch is invite-only. You’re ranked by the founders you bring in and vouch for.
          Invite people who trust you and will make you stand out.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Invite an ex-colleague",
            description: "Someone you’ve built with before. High trust, high signal.",
          },
          {
            title: "Invite a batchmate",
            description: "A founder you studied with — the kind who shows up.",
          },
          {
            title: "Invite a client",
            description: "A customer or partner who knows your work firsthand.",
          },
        ].map((cta) => (
          <Card key={cta.title} className="rounded-2xl">
            <CardContent className="p-5 space-y-2">
              <div className="text-sm font-semibold">{cta.title}</div>
              <div className="text-sm text-muted-foreground">{cta.description}</div>
              <Button
                variant="secondary"
                className="w-full justify-between"
                onClick={() => navigate("/invite")}
              >
                Invite now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-5 space-y-2">
          <div className="text-sm font-semibold">Why this matters</div>
          <p className="text-sm text-muted-foreground">
            Every invitation is a trust signal. When you bring in strong people, your visibility and ranking climb.
            That means better lunches, stronger trust paths, and a network that compounds around you.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


