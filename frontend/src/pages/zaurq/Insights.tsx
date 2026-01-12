import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Clock, Gift, MapPin, Users } from "lucide-react";

function MiniBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-accent">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Insights() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Networking analytics — health, outreach frequency, neglected relationships, and reciprocity. (MVP: visual scaffolding.)
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Network health
                </CardTitle>
                <Badge variant="secondary">Stable</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <MiniBar label="Outreach frequency" value={62} />
              <MiniBar label="Reciprocity score" value={55} />
              <MiniBar label="Dormant relationships" value={35} />
              <div className="text-xs text-muted-foreground pt-2">
                Tip: pick 3 dormant relationships/week and send a low-friction check-in.
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time invested
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">This month</span>
                  <span className="font-medium">2.5h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last month</span>
                  <span className="font-medium">3.1h</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Money invested
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">This month</span>
                  <span className="font-medium">₹1,800</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last month</span>
                  <span className="font-medium">₹3,200</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-[5.5rem] h-fit">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Neglected relationships
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {["Ravi Mehta", "Maya Singh", "Arjun Patel"].map((n) => (
                <div key={n} className="flex items-center justify-between">
                  <span>{n}</span>
                  <Badge variant="outline">90d+</Badge>
                </div>
              ))}
              <Button className="mt-3 w-full" variant="secondary">
                Create outreach plan
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                City breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { city: "Mumbai", pct: 40 },
                { city: "Bangalore", pct: 30 },
                { city: "Delhi", pct: 20 },
              ].map((c) => (
                <MiniBar key={c.city} label={c.city} value={c.pct} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


