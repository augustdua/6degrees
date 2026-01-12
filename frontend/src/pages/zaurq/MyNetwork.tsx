import React from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, NotebookPen, Search, MapPin, Briefcase } from "lucide-react";

type Person = {
  id: string;
  name: string;
  photoUrl?: string;
  status?: string;
  lastInteractionDate?: string;
  company?: string;
  role?: string;
  location?: string;
};

type Segment = "inner" | "active" | "dormant" | "all";

function parseDateMs(value?: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function normalizeConnections(raw: any): Person[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((c: any): Person | null => {
      // Shape A: contact-style (used by ConnectionProfile)
      if (c?.id && (c?.contact_name || c?.display_name)) {
        const name = c.contact_name || c.display_name || "Unknown";
        return {
          id: String(c.id),
          name,
          photoUrl: c.photo_url || undefined,
          status: c.relationship_context || c.notes || undefined,
          lastInteractionDate: c.last_interaction_date || undefined,
          company: c.company || undefined,
          role: c.role || undefined,
          location: c.location || undefined,
        };
      }

      // Shape B: user-connection style (used by useConnections)
      if (c?.connection_id && (c?.first_name || c?.last_name)) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown";
        return {
          id: String(c.connection_id),
          name,
          photoUrl: c.avatar_url || undefined,
          status: c.bio || undefined,
          lastInteractionDate: c.connected_at || undefined,
          company: c.company || undefined,
          role: c.role || undefined,
          location: c.location || undefined,
        };
      }

      return null;
    })
    .filter(Boolean) as Person[];
}

function segmentFor(person: Person): Exclude<Segment, "all"> {
  const now = Date.now();
  const last = parseDateMs(person.lastInteractionDate);

  // Placeholder heuristic:
  // - active: within 30 days
  // - dormant: > 90 days or unknown
  if (!last) return "dormant";
  const days = (now - last) / (1000 * 60 * 60 * 24);
  if (days <= 30) return "active";
  if (days >= 90) return "dormant";
  return "active";
}

function formatLastInteraction(value?: string): string {
  const ms = parseDateMs(value);
  if (!ms) return "Unknown";
  return new Date(ms).toLocaleDateString();
}

export default function MyNetwork() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [segment, setSegment] = React.useState<Segment>("all");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [people, setPeople] = React.useState<Person[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await apiGet(API_ENDPOINTS.CONNECTIONS, { skipCache: true });
        const normalized = normalizeConnections(data);
        if (!cancelled) setPeople(normalized);
      } catch (e: any) {
        if (!cancelled) {
          setPeople([]);
          toast({
            title: "Couldn’t load network",
            description: e?.message || "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      const seg = segmentFor(p);
      const passSegment = segment === "all" ? true : seg === segment;
      if (!passSegment) return false;
      if (!q) return true;
      const hay = [p.name, p.company, p.role, p.location, p.status].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [people, query, segment]);

  const counts = React.useMemo(() => {
    const base = { inner: 0, active: 0, dormant: 0, all: people.length };
    for (const p of people) base[segmentFor(p)] += 1;
    // Inner circle is not yet modeled; keep as 0 for now.
    base.inner = 0;
    return base;
  }, [people]);

  const grouped = React.useMemo(() => {
    const groups: Record<Exclude<Segment, "all">, Person[]> = { inner: [], active: [], dormant: [] };
    for (const p of filtered) groups[segmentFor(p)].push(p);
    return groups;
  }, [filtered]);

  const sections: Array<{ id: Segment; label: string; items: Person[]; hint: string }> = React.useMemo(() => {
    if (segment !== "all") {
      const label = segment === "inner" ? "Inner circle" : segment === "active" ? "Active" : "Dormant";
      return [
        {
          id: segment,
          label,
          items: filtered,
          hint: segment === "dormant" ? "Fading relationships that need attention" : "People you keep warm regularly",
        },
      ];
    }
    return [
      { id: "inner", label: "Inner circle", items: grouped.inner, hint: "Closest relationships" },
      { id: "active", label: "Active", items: grouped.active, hint: "Regular contact" },
      { id: "dormant", label: "Dormant", items: grouped.dormant, hint: "Needs attention" },
    ];
  }, [filtered, grouped, segment]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left sidebar filters */}
      <div className="lg:col-span-3">
        <div className="lg:sticky lg:top-[5.5rem] space-y-3">
          <Card className="p-4">
            <div className="text-sm font-semibold">My Network</div>
            <div className="mt-1 text-xs text-muted-foreground">Filters + search across your people.</div>
            <div className="mt-3 space-y-2">
            {(
              [
                { id: "inner", label: "Inner circle", count: counts.inner },
                { id: "active", label: "Active", count: counts.active },
                { id: "dormant", label: "Dormant", count: counts.dormant },
                { id: "all", label: "All contacts", count: counts.all },
              ] as const
            ).map((item) => (
              <Button
                key={item.id}
                variant={segment === item.id ? "secondary" : "ghost"}
                className="w-full justify-between"
                onClick={() => setSegment(item.id)}
              >
                <span>{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.count}</span>
              </Button>
            ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Quick actions</div>
            <div className="mt-3 grid gap-2">
              <Button variant="secondary" onClick={() => toast({ title: "Add contact", description: "Coming soon — contact capture flow." })}>
                Add contact
              </Button>
              <Button variant="outline" onClick={() => toast({ title: "Log moment", description: "Use Moments to save context." })}>
                Log moment
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Main list */}
      <div className="lg:col-span-9 space-y-4">
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">People</div>
              <div className="text-sm text-muted-foreground">
                Structured, private relationship management — no public likes/comments.
              </div>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people…" className="pl-9" />
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <Card className="p-6 text-sm text-muted-foreground">Loading your network…</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">No matches. Try a different filter or search term.</Card>
          ) : (
            sections.map((s) => (
              <div key={s.id} className="space-y-3">
                <div className="px-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">{s.label}</div>
                    <Badge variant="secondary">{s.items.length}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
                </div>

                {s.items.length === 0 ? (
                  <Card className="p-4 text-sm text-muted-foreground">No people in this section yet.</Card>
                ) : (
                  s.items.map((p) => (
                    <Card
                      key={p.id}
                      className="p-4 hover:bg-accent/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/network/${p.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <Avatar className="h-11 w-11 ring-1 ring-border">
                            <AvatarImage src={p.photoUrl} />
                            <AvatarFallback className="text-xs">
                              {p.name
                                .split(" ")
                                .map((x) => x[0])
                                .slice(0, 2)
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium truncate">{p.name}</div>
                              <Badge variant="outline" className="text-[10px]">
                                {segmentFor(p)}
                              </Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Briefcase className="h-3.5 w-3.5" />
                                {[p.role, p.company].filter(Boolean).join(" • ") || "—"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {p.location || "—"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Last: {formatLastInteraction(p.lastInteractionDate)}
                              </span>
                            </div>
                            {p.status ? <div className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.status}</div> : null}
                          </div>
                        </div>

                        <div className="flex gap-2 sm:justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/messages");
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({ title: "Schedule", description: "Coming soon — event & calendar integration." });
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast({ title: "Add note", description: "Use Moments to keep a private timeline." });
                            }}
                          >
                            <NotebookPen className="h-4 w-4 mr-2" />
                            Note
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


