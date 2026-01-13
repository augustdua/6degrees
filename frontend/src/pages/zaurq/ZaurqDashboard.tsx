import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { NearbyLunchesCard } from "@/components/zaurq/lunches/NearbyLunchesCard";
import { Users, Sparkles } from "lucide-react";

export default function ZaurqDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Colorful hero header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#fdbc59] via-[#fd9fff] to-[#a8ccff] p-6 shadow-lg">
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-[#2d3640]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#2d3640]/70">CrossLunch</span>
            </div>
            <h1 className="text-2xl font-bold text-[#2d3640] truncate">People near you</h1>
            <p className="text-sm text-[#2d3640]/80 mt-1">Find someone nearby and grab lunch together!</p>
          </div>
          <Button 
            className="bg-white hover:bg-[#e4defa] text-[#2d3640] font-bold rounded-full shadow-md"
            onClick={() => navigate("/network")}
          >
            <Users className="h-4 w-4 mr-2" />
            My network
          </Button>
        </div>
      </div>

      <NearbyLunchesCard variant="hero" />
    </div>
  );
}


