import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ZaurqPlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl">
      <Card className="p-6 space-y-3">
        <div className="text-xl font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">
          This page is scaffolded to match the new Zaurq IA. Next we’ll implement the full layout/cards per spec.
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/network")}>Go to My Network</Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
}


