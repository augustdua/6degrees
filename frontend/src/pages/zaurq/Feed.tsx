import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, HandHelping, CalendarDays, Briefcase, UserPlus, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getAvatarColor, getInitialsFromFullName } from "@/lib/avatarUtils";

type FeedItem =
  | { type: "life_update"; person: string; text: string; meta: string }
  | { type: "ask"; person: string; text: string; meta: string }
  | { type: "poll"; person: string; text: string; options: string[]; meta: string }
  | { type: "event_rsvp"; person: string; text: string; meta: string }
  | { type: "new_connection"; person: string; text: string; meta: string }
  | { type: "milestone"; person: string; text: string; meta: string };

const items: FeedItem[] = [
  { type: "life_update", person: "Kavita", text: "Just moved to Bangalore — looking for great coffee spots.", meta: "Life update" },
  { type: "ask", person: "Arjun", text: "Looking for a warm intro to a design lead in fintech.", meta: "Ask" },
  { type: "event_rsvp", person: "Kavita", text: "is attending Bangalore Coffee", meta: "Event RSVP" },
  { type: "milestone", person: "Sneha", text: "started a new role (Partner, Venture)", meta: "Milestone" },
  { type: "new_connection", person: "Ravi", text: "added someone you might know", meta: "New connection" },
  { type: "poll", person: "Maya", text: "Where should we host the next meetup?", options: ["Mumbai", "Bangalore", "Delhi"], meta: "Poll" },
];

function iconFor(t: FeedItem["type"]) {
  switch (t) {
    case "ask":
      return HandHelping;
    case "event_rsvp":
      return CalendarDays;
    case "milestone":
      return Briefcase;
    case "new_connection":
      return UserPlus;
    case "poll":
      return Sparkles;
    default:
      return MessageSquare;
  }
}

export default function Feed() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Feed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Network activity and broadcasts. No public likes or comments — everything is private-first.
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const Icon = iconFor(item.type);
          return (
            <Card key={idx} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* medium avatar */}
                    <Avatar className="h-12 w-12 ring-1 ring-border shrink-0">
                      <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(item.person)} text-white`}>
                        {getInitialsFromFullName(item.person)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        <span className="font-semibold">{item.person}</span>{" "}
                        <span className="text-muted-foreground">{item.text}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{item.meta}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {item.meta}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {item.type === "poll" ? (
                  <div className="grid gap-2">
                    {item.options.map((o) => (
                      <Button key={o} variant="outline" className="justify-start">
                        {o}
                      </Button>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary">
                    I can help
                  </Button>
                  <Button size="sm" variant="outline">
                    Reply privately
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


