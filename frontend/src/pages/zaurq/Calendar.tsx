import * as React from "react";
import { CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

type AgendaItem = {
  id: string;
  kind: "call" | "meeting";
  title: string;
  time: string;
  with?: string;
  durationMins?: number;
};

const demoAgenda: Record<string, AgendaItem[]> = {
  today: [
    { id: "a1", kind: "call", title: "1:1 catch-up", time: "11:30 AM", with: "Priya Sharma", durationMins: 30 },
    { id: "a2", kind: "meeting", title: "Partnership sync", time: "4:00 PM", with: "Kavita Rao", durationMins: 45 },
  ],
};

function labelForKind(kind: AgendaItem["kind"]) {
  return kind === "call" ? "Call" : "Meeting";
}

export default function ZaurqCalendar() {
  const [selected, setSelected] = React.useState<Date | undefined>(new Date());

  // For MVP demo: show a fixed list. Later we can key by selected day.
  const agenda = demoAgenda.today;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="za-small text-muted-foreground">
          Calls & meetings (separate from offline Events). Pick a day and view your agenda.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border bg-card">
                <Calendar mode="single" selected={selected} onSelect={setSelected} className="w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold truncate">Agenda</CardTitle>
                <Button size="sm" variant="outline" disabled>
                  Add (soon)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="za-caption text-muted-foreground">
                {selected ? selected.toDateString() : "Pick a date"}
              </div>

              {agenda.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  No calls or meetings scheduled.
                </div>
              ) : (
                <div className="space-y-2">
                  {agenda.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate">{item.title}</div>
                          <Badge variant="secondary">{labelForKind(item.kind)}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.time}
                          {item.durationMins ? ` • ${item.durationMins} mins` : ""}
                          {item.with ? ` • with ${item.with}` : ""}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


