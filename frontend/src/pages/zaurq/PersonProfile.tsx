import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Gift, MapPin, MessageSquare, NotebookPen, Users, Briefcase, ArrowLeft, Clock } from "lucide-react";

type Connection = {
  id: string;
  contact_name?: string;
  display_name?: string;
  photo_url?: string;
  email?: string;
  phone?: string;
  relationship_context?: string;
  how_we_met?: string;
  notes?: string;
  birthday?: string;
  location?: string;
  company?: string;
  role?: string;
  last_interaction_date?: string;
  created_at?: string;
};

function safeDate(value?: string): string | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString();
}

export default function PersonProfile() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [connection, setConnection] = React.useState<Connection | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    contact_name: "",
    role: "",
    company: "",
    location: "",
    relationship_context: "",
    how_we_met: "",
    notes: "",
    birthday: "",
  });

  React.useEffect(() => {
    if (!connectionId) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await apiGet(API_ENDPOINTS.CONNECTIONS, { skipCache: true });
        const list = Array.isArray(data) ? data : [];
        const found = list.find((c: any) => String(c?.id ?? c?.connection_id) === String(connectionId)) ?? null;

        // Normalize best-effort into the Connection shape expected by this page.
        const normalized: Connection | null = found
          ? {
              id: String(found.id ?? found.connection_id ?? connectionId),
              contact_name: found.contact_name ?? found.display_name ?? [found.first_name, found.last_name].filter(Boolean).join(" "),
              display_name: found.display_name,
              photo_url: found.photo_url ?? found.avatar_url,
              email: found.email,
              phone: found.phone,
              relationship_context: found.relationship_context ?? found.bio,
              how_we_met: found.how_we_met,
              notes: found.notes,
              birthday: found.birthday,
              location: found.location,
              company: found.company,
              role: found.role,
              last_interaction_date: found.last_interaction_date ?? found.connected_at,
              created_at: found.created_at ?? found.connected_at,
            }
          : null;

        if (!cancelled) {
          setConnection(normalized);
          setForm({
            contact_name: normalized?.contact_name ?? normalized?.display_name ?? "",
            role: normalized?.role ?? "",
            company: normalized?.company ?? "",
            location: normalized?.location ?? "",
            relationship_context: normalized?.relationship_context ?? "",
            how_we_met: normalized?.how_we_met ?? "",
            notes: normalized?.notes ?? "",
            birthday: normalized?.birthday ?? "",
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setConnection(null);
          toast({ title: "Couldn’t load profile", description: e?.message || "Please try again.", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [connectionId, toast]);

  const name = connection?.contact_name || connection?.display_name || "Unknown";

  if (loading) {
    return <div className="text-sm text-muted-foreground p-2">Loading profile…</div>;
  }

  if (!connection) {
    return (
      <div className="space-y-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Person not found.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Header */}
      <Card className="mb-4">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <Avatar className="h-20 w-20 ring-1 ring-border">
              <AvatarImage src={connection.photo_url || undefined} alt={name} className="object-cover" />
              <AvatarFallback className="text-lg">{name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {editing ? (
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
                  className="text-xl font-semibold"
                  placeholder="Name"
                />
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-semibold truncate">{name}</div>
                  <Badge variant="secondary">Private</Badge>
                </div>
              )}

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase className="h-4 w-4" />
                  {editing ? (
                    <div className="flex gap-2 w-full">
                      <Input
                        value={form.role}
                        onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                        placeholder="Role"
                      />
                      <Input
                        value={form.company}
                        onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                        placeholder="Company"
                      />
                    </div>
                  ) : (
                    <span className="truncate">{[connection.role, connection.company].filter(Boolean).join(" • ") || "—"}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4" />
                  {editing ? (
                    <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" />
                  ) : (
                    <span className="truncate">{connection.location || "—"}</span>
                  )}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Life update */}
              <div className="mt-4">
                <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Life update</div>
                {editing ? (
                  <Input
                    className="mt-2"
                    value={form.relationship_context}
                    onChange={(e) => setForm((p) => ({ ...p, relationship_context: e.target.value }))}
                    placeholder="What's current for them?"
                  />
                ) : (
                  <div className="mt-2 text-sm text-foreground">
                    {connection.relationship_context || <span className="text-muted-foreground italic">No update yet.</span>}
                  </div>
                )}
              </div>

              {/* Relationship snapshot */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">Last met</div>
                  <div className="mt-1 text-sm font-medium">{safeDate(connection.last_interaction_date) || "—"}</div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">Added</div>
                  <div className="mt-1 text-sm font-medium">{safeDate(connection.created_at) || "—"}</div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">Birthday</div>
                  <div className="mt-1 text-sm font-medium">{safeDate(connection.birthday) || "—"}</div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex md:flex-col gap-2">
              <Button onClick={() => navigate("/messages")} className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Message
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Schedule meetup", description: "Coming soon." })}>
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setEditing((v) => !v)}>
                <NotebookPen className="h-4 w-4" />
                {editing ? "Done" : "Edit"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Moments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                This is your private journal. (MVP: uses the existing “Notes” field as a first moment.)
              </div>
              {editing ? (
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Add a moment…"
                  className="min-h-[120px]"
                />
              ) : (
                <div className="rounded-xl border border-border p-4 text-sm">
                  {connection.notes ? (
                    <div className="whitespace-pre-wrap">{connection.notes}</div>
                  ) : (
                    <div className="text-muted-foreground italic">No moments yet.</div>
                  )}
                </div>
              )}
              <Button variant="secondary" onClick={() => toast({ title: "Add moment", description: "Coming soon — photo/location/event linking." })}>
                Add moment
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interaction history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last met</span>
                <span>{safeDate(connection.last_interaction_date) || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Added to network</span>
                <span>{safeDate(connection.created_at) || "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-3">Next: meetings + shared events timeline.</div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-[5.5rem] h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Relationship stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time invested</span>
                <span>—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Money invested</span>
                <span>—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Birthday</span>
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-muted-foreground" />
                  {safeDate(connection.birthday) || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last interaction</span>
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {safeDate(connection.last_interaction_date) || "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mutual connections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="text-muted-foreground">Coming soon — shows who you both know.</div>
              <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Mutuals", description: "Coming soon." })}>
                <Users className="h-4 w-4" />
                View mutuals
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Their ask</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Coming soon — capture what they need so you can help at the right time.
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save (MVP: local-only) */}
      {editing ? (
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => {
              setConnection((prev) => (prev ? { ...prev, ...form, contact_name: form.contact_name } : prev));
              setEditing(false);
              toast({ title: "Saved", description: "MVP: saved locally for now (API write coming next)." });
            }}
          >
            Save
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setForm({
                contact_name: connection.contact_name || connection.display_name || "",
                role: connection.role || "",
                company: connection.company || "",
                location: connection.location || "",
                relationship_context: connection.relationship_context || "",
                how_we_met: connection.how_we_met || "",
                notes: connection.notes || "",
                birthday: connection.birthday || "",
              });
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : null}
    </div>
  );
}


