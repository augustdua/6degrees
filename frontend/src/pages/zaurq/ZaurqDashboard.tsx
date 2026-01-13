import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { NearbyLunchesCard } from "@/components/zaurq/lunches/NearbyLunchesCard";
import { Users, Sparkles } from "lucide-react";

export default function ZaurqDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Hero header - uses gradient from CSS variables */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-hero p-6 shadow-glow">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CrossLunch</span>
            </div>
            <h1 className="font-display text-2xl text-foreground truncate">People near you</h1>
            <p className="text-sm text-muted-foreground mt-1">Find someone nearby and grab lunch together!</p>
          </div>
          <Button variant="secondary" onClick={() => navigate("/network")}>
            <Users className="h-4 w-4 mr-2" />
            My network
          </Button>
        </div>
      </div>

      <NearbyLunchesCard variant="hero" />
    </div>
  );
}


