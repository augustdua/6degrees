import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { NearbyLunchesCard } from "@/components/zaurq/lunches/NearbyLunchesCard";
import { Users, Sparkles } from "lucide-react";

export default function ZaurqDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Hero header - lavender tint, NOT white */}
      <div className="rounded-xl border border-border bg-gradient-hero p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4" style={{ color: "var(--color-pink)" }} />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">CrossLunch</span>
            </div>
            <h1 className="font-display text-2xl text-foreground truncate">People near you</h1>
            <p className="text-sm text-muted-foreground mt-1">Find someone nearby and grab lunch together!</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/network")}>
            <Users className="h-4 w-4 mr-2" />
            My network
          </Button>
        </div>
      </div>

      <NearbyLunchesCard variant="hero" />
    </div>
  );
}


