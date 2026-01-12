import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MapPin, CalendarDays } from "lucide-react";

type Moment = {
  id: string;
  person: string;
  date: string;
  note: string;
  location?: string;
};

const demo: Moment[] = [
  { id: "m1", person: "Kavita Rao", date: "Jan 6", note: "Wants intros to early-stage fintech founders.", location: "Bangalore" },
  { id: "m2", person: "Ravi Mehta", date: "Dec 22", note: "Prefers morning coffees. Follow up after product launch.", location: "Mumbai" },
  { id: "m3", person: "Sneha Iyer", date: "Dec 2", note: "New role; congrats note + ask how to be helpful.", location: "Delhi" },
];

export default function Moments() {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return demo;
    return demo.filter((m) => [m.person, m.note, m.location].filter(Boolean).join(" ").toLowerCase().includes(query));
  }, [q]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Moments</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-[340px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search moments…" className="pl-9" />
              </div>
              <Button className="shrink-0" variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your private relationship journal. Search before a meeting to remember context.
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.map((m) => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{m.person}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {m.date}
                    </span>
                    {m.location ? (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {m.location}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <Badge variant="secondary">Private</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm">{m.note}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


