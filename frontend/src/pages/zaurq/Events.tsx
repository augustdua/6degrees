import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users } from "lucide-react";

type Event = {
  id: string;
  title: string;
  city: string;
  date: string;
  time: string;
  attendees: string[];
};

const upcoming: Event[] = [
  { id: "e1", title: "Bangalore Coffee", city: "Bangalore", date: "Sat", time: "5:30 PM", attendees: ["Kavita", "Maya", "Rohit"] },
  { id: "e2", title: "Mumbai Dinner", city: "Mumbai", date: "Thu", time: "8:00 PM", attendees: ["Ravi", "Aisha"] },
];

export default function Events() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Events
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Real-life meetups. RSVP privately and see “who’s going that I know.”
        </CardContent>
      </Card>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 space-y-3">
              {upcoming.map((e) => (
                <Card key={e.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{e.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {e.city}
                        </span>
                        <span>•</span>
                        <span>{e.date}</span>
                        <span>{e.time}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {e.attendees.slice(0, 3).join(", ")}
                        {e.attendees.length > 3 ? ` +${e.attendees.length - 3}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button size="sm">RSVP</Button>
                      <Button size="sm" variant="outline">
                        Who’s going
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-4 lg:sticky lg:top-[5.5rem] h-fit space-y-3">
              <Card className="p-4">
                <div className="text-sm font-semibold">Your RSVPs</div>
                <div className="mt-2 text-sm text-muted-foreground">No RSVPs yet.</div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Host an event</div>
                  <Badge variant="secondary">MVP</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Create a meetup in your city and invite your network.
                </div>
                <Button className="mt-3 w-full" variant="secondary">
                  Create event
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card className="p-6">
            <div className="text-sm font-semibold">Calendar view</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Coming next: month grid with a list of events per day.
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


