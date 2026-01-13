import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { NearbyLunchesCard } from "@/components/zaurq/lunches/NearbyLunchesCard";

export default function ZaurqDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate">People near you</h1>
          <p className="text-sm text-muted-foreground mt-1">Find someone nearby and start a CrossLunch.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/network")}>
          My network
        </Button>
      </div>

      <NearbyLunchesCard variant="hero" />
    </div>
  );
}


