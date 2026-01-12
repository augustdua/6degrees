import * as React from "react";
import { MapPin, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { apiGet, apiPost } from "@/lib/api";
import { getAvatarColor, getInitialsFromFullName } from "@/lib/avatarUtils";
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

type GeoState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "denied" }
  | { status: "error"; message: string }
  | { status: "granted"; lat: number; lng: number };

export function NearbyLunchesCard() {
  const [geo, setGeo] = React.useState<GeoState>({ status: "idle" });
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [tab, setTab] = React.useState<"list" | "map">("list");

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
        await apiPost(`/api/lunches/suggestions/${encodeURIComponent(id)}/${action}`);
      } catch (e: any) {
        setSuggestions(prev);
        toast.error(e?.message || `Failed to ${action}`);
      }
    },
    [suggestions],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          Nearby Lunches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {geo.status !== "granted" ? (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="text-sm font-medium">Find nearby people for an offline lunch</div>
            <div className="text-xs text-muted-foreground">
              We use your device location to suggest nearby matches. You can accept or reject each suggestion.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={requestLocation} disabled={geo.status === "requesting"}>
                {geo.status === "requesting" ? "Getting location…" : "Enable location"}
              </Button>
              <Button variant="outline" onClick={() => toast.message("Tip: You can enable location in your browser settings.")}>
                How this works
              </Button>
            </div>
            {geo.status === "denied" ? (
              <div className="text-xs text-destructive">
                Location permission is blocked. Enable it in your browser settings and try again.
              </div>
            ) : null}
            {geo.status === "error" ? <div className="text-xs text-destructive">{geo.message}</div> : null}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Using your current location
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchSuggestions(geo.lat, geo.lng)}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "list" | "map")}>
              <TabsList className="w-full">
                <TabsTrigger value="list" className="flex-1">
                  List
                </TabsTrigger>
                <TabsTrigger value="map" className="flex-1">
                  Map
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-3 space-y-2">
                {loading ? (
                  <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading…</div>
                ) : suggestions.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    No nearby lunch suggestions right now.
                  </div>
                ) : (
                  suggestions.map((s) => (
                    <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 ring-1 ring-border shrink-0">
                          <AvatarImage src={s.photoUrl || undefined} alt={s.personName} />
                          <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(s.personName)} text-white`}>
                            {getInitialsFromFullName(s.personName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{s.personName}</div>
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {s.profession || s.headline || s.locationLabel || "Nearby"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistance(s.distanceMeters) ? `${formatDistance(s.distanceMeters)} away` : null}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => actOnSuggestion(s.id, "accept")}>
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => actOnSuggestion(s.id, "reject")}>
                              Reject
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
                  userLocation={{ lat: geo.lat, lng: geo.lng }}
                  markers={suggestions.map((s) => ({
                    id: s.id,
                    lat: s.lat,
                    lng: s.lng,
                    label: s.profession ? `${s.personName} • ${s.profession}` : s.personName,
                  }))}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}


