import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, ChevronRight, Sparkles, ArrowUpRight, HandHelping, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ZaurqDashboard() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Daily task */}
      <div className="lg:col-span-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Daily Task
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium">Reach out to Sneha Iyer</div>
              <div className="text-xs text-muted-foreground mt-1">Send a quick note: new role milestone</div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Suggested action</span>
                <span className="inline-flex items-center gap-1">
                  2 min <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => navigate("/network")}>
                Do it now
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="flex-1">
                Snooze
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              One relationship action per day — small consistency beats bursts.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Center: Updates feed */}
      <div className="lg:col-span-5">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[560px] overflow-auto pr-2">
            {[
              { title: "Kavita is attending Bangalore Coffee", meta: "Event RSVP" },
              { title: "Ravi added someone you might know", meta: "New connection" },
              { title: "Sneha started a new role", meta: "Milestone" },
              { title: "Arjun posted an ask: warm intro to a design lead", meta: "Ask" },
            ].map((i, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-4">
                <div className="text-sm font-medium">{i.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{i.meta}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" className="gap-2">
                    <HandHelping className="h-4 w-4" />
                    I can help
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Reply privately
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right: upcoming event + insights */}
      <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-[5.5rem] h-fit">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium">Mumbai Coffee</div>
              <div className="text-xs text-muted-foreground mt-1">Thu 7:00 PM • Bandra</div>
              <Button size="sm" className="mt-3 w-full">
                RSVP
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate("/events")}>
              View Events
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { k: "Outreach this week", v: "3" },
              { k: "Neglected relationships", v: "7" },
              { k: "Time invested", v: "2.5h" },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.k}</span>
                <span className="font-medium">{row.v}</span>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => navigate("/insights")}>
              Open Insights
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


