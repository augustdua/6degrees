import * as React from "react";
import { MapPin, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

import { apiGet, apiPost } from "@/lib/api";
import { getInitialsFromFullName } from "@/lib/avatarUtils";
import { NearbyLunchesMap } from "@/components/zaurq/lunches/NearbyLunchesMap";

type Suggestion = {
  id: string;
  personId: string;
  personName: string;
  profession?: string | null;
  photoUrl?: string | null;
  headline?: string | null;
  locationLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
  distanceMeters?: number | null;
};

type SuggestionsResponse = {
  suggestions: Suggestion[];
};

function formatDistance(meters?: number | null) {
  if (!meters && meters !== 0) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Get initials from name
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Personalized animated avatar (like WhatsApp/Memoji style)
// Using DiceBear "lorelei" - modern, friendly, personalized feel
function getAnimatedAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b4a0ff,fdbc59,a8ccff,fd9fff&backgroundType=gradientLinear`;
}

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "denied" }
  | { status: "error"; message: string }
  | { status: "granted"; lat: number; lng: number };

type Props = {
  variant?: "hero" | "rail";
};

export function NearbyLunchesCard({ variant = "rail" }: Props) {
  const navigate = useNavigate();
  const [geo, setGeo] = React.useState<GeoState>({ status: "idle" });
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [tab, setTab] = React.useState<"list" | "map">("list");
  const [demoMode, setDemoMode] = React.useState(true);

  const demoCenter = React.useMemo(() => ({ lat: 12.9716, lng: 77.5946 }), []); // Bangalore (demo)
  const demoSuggestions = React.useMemo<Suggestion[]>(
    () => [
      {
        id: "demo-1",
        personId: "demo-1",
        personName: "Kavita Rao",
        profession: "Product Manager",
        locationLabel: "Indiranagar",
        lat: 12.9784,
        lng: 77.6408,
        distanceMeters: 3400,
      },
      {
        id: "demo-2",
        personId: "demo-2",
        personName: "Ravi Mehta",
        profession: "Founder & CEO",
        locationLabel: "Koramangala",
        lat: 12.9352,
        lng: 77.6245,
        distanceMeters: 5100,
      },
      {
        id: "demo-3",
        personId: "demo-3",
        personName: "Sneha Iyer",
        profession: "Investor at Sequoia",
        locationLabel: "MG Road",
        lat: 12.9756,
        lng: 77.6069,
        distanceMeters: 1800,
      },
    ],
    [],
  );

  // Show demo data immediately so the Home UI is never empty in development/demo.
  React.useEffect(() => {
    if (!demoMode) return;
    setSuggestions(demoSuggestions);
  }, [demoMode, demoSuggestions]);

  // Best-effort permission precheck (no prompt).
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // @ts-expect-error - PermissionName typing varies across TS/libdom versions
        const perm = await navigator.permissions?.query?.({ name: "geolocation" });
        if (!alive || !perm) return;
        if (perm.state === "denied") setGeo({ status: "denied" });
      } catch {
        // ignore: Permissions API not supported
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fetchSuggestions = React.useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const radiusKm = 5;
      const res = (await apiGet(
        `/api/lunches/suggestions?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&radiusKm=${radiusKm}`,
        { skipCache: true },
      )) as SuggestionsResponse;

      setSuggestions(Array.isArray(res?.suggestions) ? res.suggestions : []);
      setDemoMode(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load lunch suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ status: "error", message: "Geolocation is not supported on this device." });
      return;
    }
    setGeo({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeo({ status: "granted", lat, lng });
        fetchSuggestions(lat, lng);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeo({ status: "denied" });
        else setGeo({ status: "error", message: err.message || "Failed to get location." });
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  }, [fetchSuggestions]);

  const actOnSuggestion = React.useCallback(
    async (id: string, action: "accept" | "reject") => {
      const prev = suggestions;
      setSuggestions((s) => s.filter((x) => x.id !== id));
      try {
        if (demoMode && id.startsWith("demo-")) {
          toast.message(`Demo: ${action}ed`);
          return;
        }
        await apiPost(`/api/lunches/suggestions/${encodeURIComponent(id)}/${action}`);
      } catch (e: any) {
        setSuggestions(prev);
        toast.error(e?.message || `Failed to ${action}`);
      }
    },
    [demoMode, suggestions],
  );

  const openProfile = React.useCallback(
    (personId: string) => {
      // NOTE: lunch suggestions are keyed by user_id; the most stable deep-link is the public profile route.
      // If you later want this to go to the internal connection profile, we can translate user_id -> connection_id.
      navigate(`/profile/${encodeURIComponent(personId)}`);
    },
    [navigate],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          People near you
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">
              {demoMode ? "Demo mode (sample people nearby)" : geo.status === "granted" ? "Using your current location" : "Location not enabled"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {geo.status === "granted" ? (
              <Button size="sm" variant="outline" onClick={() => fetchSuggestions(geo.lat, geo.lng)} disabled={loading}>
                Refresh
              </Button>
            ) : (
              <Button size="sm" onClick={requestLocation} disabled={geo.status === "requesting"}>
                {geo.status === "requesting" ? "Getting location…" : "Use my location"}
              </Button>
            )}
          </div>
        </div>

        {geo.status === "denied" ? (
          <div className="text-xs text-destructive">
            Location permission is blocked. You can still preview the demo map, or enable location in browser settings.
          </div>
        ) : null}
        {geo.status === "error" ? <div className="text-xs text-destructive">{geo.message}</div> : null}

        {/* DECISION-FIRST: Single card stack + contextual map */}
        {variant === "hero" ? (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* LEFT: Decision Stack — one featured person */}
            <div className="flex-1 min-w-0 order-2 lg:order-1">
              {loading ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                  Finding people nearby…
                </div>
              ) : suggestions.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                  No one nearby right now. Check back later!
                </div>
              ) : (
                <div className="relative">
                  {/* Card Stack — featured card on top, others peeking */}
                  <div className="relative" style={{ height: '360px' }}>
                    {suggestions.slice(0, 3).map((s, idx) => (
                      <div
                        key={s.id}
                        className="absolute inset-x-0 rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300"
                        style={{
                          top: idx * 8,
                          zIndex: 3 - idx,
                          transform: `scale(${1 - idx * 0.03})`,
                          opacity: idx === 0 ? 1 : 0.6,
                          pointerEvents: idx === 0 ? 'auto' : 'none',
                        }}
                      >
                        {idx === 0 ? (
                          /* Featured card — full content */
                          <div className="p-6">
                            {/* Avatar: personalized, animated style */}
                            <div className="flex justify-center mb-5">
                              <div className="relative">
                                <img
                                  src={getAnimatedAvatar(s.personName)}
                                  alt=""
                                  className="h-24 w-24 rounded-full ring-4 ring-brand-lav-tint"
                                />
                                {/* Distance badge */}
                                {formatDistance(s.distanceMeters) && (
                                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 text-xs font-medium rounded-full bg-card border border-border text-muted-foreground whitespace-nowrap">
                                    {formatDistance(s.distanceMeters)} away
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Name + Role — centered */}
                            <div className="text-center mb-6">
                              <h3 className="text-xl font-semibold text-foreground">
                                {s.personName}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {s.profession || s.headline || "Professional nearby"}
                              </p>
                            </div>

                            {/* CTA: The hero — full width, dominant */}
                            <Button 
                              className="w-full h-12 text-base font-semibold"
                              onClick={() => actOnSuggestion(s.id, "accept")}
                            >
                              CrossLunch?
                            </Button>

                            {/* Secondary actions */}
                            <div className="flex items-center justify-center gap-4 mt-4">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => openProfile(s.personId)}
                              >
                                View profile
                              </Button>
                              <span className="text-border">•</span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => actOnSuggestion(s.id, "reject")}
                              >
                                Skip
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Peeking cards — just enough to show stack */
                          <div className="p-6 h-full bg-card" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Progress indicator */}
                  {suggestions.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-4">
                      {suggestions.slice(0, Math.min(5, suggestions.length)).map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-all ${
                            idx === 0 ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Contextual Map — demoted, supportive */}
            <div className="w-full lg:w-[400px] shrink-0 order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start">
              <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                <span>People nearby</span>
                <span>{suggestions.length} found</span>
              </div>
              <NearbyLunchesMap
                center={demoMode ? demoCenter : undefined}
                userLocation={geo.status === "granted" ? { lat: geo.lat, lng: geo.lng } : undefined}
                variant="hero"
                markers={suggestions.map((s) => ({
                  id: s.id,
                  lat: s.lat,
                  lng: s.lng,
                  label: s.personName,
                  personId: s.personId,
                  photoUrl: null,
                  distanceLabel: formatDistance(s.distanceMeters) || null,
                }))}
              />
            </div>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "list" | "map")}>
            <TabsList className="w-full">
              <TabsTrigger value="list" className="flex-1">
                List
              </TabsTrigger>
              <TabsTrigger value="map" className="flex-1">
                Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-3 space-y-3">
              {loading ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading…</div>
              ) : suggestions.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  No one nearby right now.
                </div>
              ) : (
                suggestions.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex items-start gap-3">
                      {/* Initials avatar */}
                      <div 
                        className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-base font-semibold text-foreground"
                        style={{ backgroundColor: '#F0ECFF' }}
                      >
                        {getInitials(s.personName)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-semibold truncate">{s.personName}</div>
                        <div className="text-[13px] text-muted-foreground truncate">
                          {s.profession || s.headline || "Professional"}
                          {formatDistance(s.distanceMeters) && ` · ${formatDistance(s.distanceMeters)}`}
                        </div>

                        <div className="mt-2.5 flex gap-2">
                          <Button size="sm" className="h-8 px-4 font-semibold" onClick={() => actOnSuggestion(s.id, "accept")}>
                            CrossLunch?
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => openProfile(s.personId)}>
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="map" className="mt-3">
              <NearbyLunchesMap
                center={demoMode ? demoCenter : undefined}
                userLocation={geo.status === "granted" ? { lat: geo.lat, lng: geo.lng } : undefined}
                variant="rail"
                markers={suggestions.map((s) => ({
                  id: s.id,
                  lat: s.lat,
                  lng: s.lng,
                  label: s.profession ? `${s.personName} • ${s.profession}` : s.personName,
                  personId: s.personId,
                  photoUrl: s.photoUrl || null,
                  distanceLabel: formatDistance(s.distanceMeters) ? `${formatDistance(s.distanceMeters)} away` : null,
                }))}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}


