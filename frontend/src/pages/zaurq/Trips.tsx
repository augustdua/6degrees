import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plane, Search, MessageSquare, CalendarDays } from "lucide-react";

type TripResult = {
  id: string;
  person: string;
  city: string;
  note: string;
};

const demoResults: TripResult[] = [
  { id: "t1", person: "Kavita Rao", city: "Bangalore", note: "Product • loves coffee catchups" },
  { id: "t2", person: "Rohit Jain", city: "Bangalore", note: "Founder • free mornings" },
];

export default function Trips() {
  const [city, setCity] = React.useState("");
  const [results, setResults] = React.useState<TripResult[]>([]);

  const search = () => {
    const q = city.trim().toLowerCase();
    if (!q) return setResults([]);
    setResults(demoResults.filter((r) => r.city.toLowerCase().includes(q)));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Plan Trips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Enter a destination to see connections there and quickly schedule coffee.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Destination city (e.g., Bangalore)"
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") search();
                }}
              />
            </div>
            <Button onClick={search}>Search</Button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            MVP flow: destination → connections based there → one-tap reach out → schedule.
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {results.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">No results yet. Try “Bangalore”.</div>
          </Card>
        ) : (
          results.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.person}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{r.city}</Badge>
                    <span className="truncate">{r.note}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Reach out
                  </Button>
                  <Button size="sm" variant="outline">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


