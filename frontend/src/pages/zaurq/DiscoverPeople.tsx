import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";

import { apiGet } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SeedProfileListItem = {
  id: string;
  slug: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  headline: string | null;
  location: string | null;
  work_address?: string | null;
  work_lat?: number | null;
  work_lng?: number | null;
  profile_picture_url: string | null;
  status: string;
  created_at: string;
};

function DiscoverPeopleMap({ markers }: { markers: SeedProfileListItem[] }) {
  const navigate = useNavigate();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const markerRefs = React.useRef<mapboxgl.Marker[]>([]);

  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  // Create map once.
  React.useEffect(() => {
    if (!token) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [78.9629, 20.5937], // India (default); we fit bounds once markers load.
      zoom: 4,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Render markers + fit bounds.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    const pts = markers
      .filter((p) => typeof p.work_lat === "number" && typeof p.work_lng === "number")
      .map((p) => ({ p, lng: p.work_lng as number, lat: p.work_lat as number }));

    for (const it of pts) {
      const el = document.createElement("button");
      el.type = "button";
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "9999px";
      el.style.border = "2px solid #2d3640";
      el.style.background = "#fd9fff";
      el.style.boxShadow = "0 2px 6px rgba(45, 54, 64, 0.3)";
      el.style.cursor = "pointer";

      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/p/${it.p.slug}`);
      });

      markerRefs.current.push(new mapboxgl.Marker({ element: el }).setLngLat([it.lng, it.lat]).addTo(map));
    }

    if (pts.length >= 2) {
      const bounds = new mapboxgl.LngLatBounds([pts[0].lng, pts[0].lat], [pts[0].lng, pts[0].lat]);
      for (const it of pts) bounds.extend([it.lng, it.lat]);
      map.fitBounds(bounds, { padding: 40, maxZoom: 11, duration: 600 });
    } else if (pts.length === 1) {
      map.easeTo({ center: [pts[0].lng, pts[0].lat], zoom: 11, duration: 600 });
    }
  }, [markers, navigate]);

  if (!token) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-medium">Map view</div>
        <div className="text-xs text-muted-foreground mt-1">
          Missing Mapbox token. Set <span className="font-mono">VITE_MAPBOX_TOKEN</span> in your frontend env.
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-[520px] w-full rounded-2xl border border-border overflow-hidden" />;
}

export default function DiscoverPeople() {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<SeedProfileListItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [offset, setOffset] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [view, setView] = React.useState<"directory" | "map">("directory");

  const pageSize = 24;

  const load = React.useCallback(
    async ({ reset }: { reset: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const nextOffset = reset ? 0 : offset;
        const params = new URLSearchParams();
        params.set("limit", String(pageSize));
        params.set("offset", String(nextOffset));
        if (q.trim()) params.set("q", q.trim());

        const data = await apiGet(`/api/seed-profiles?${params.toString()}`, { skipCache: true });
        const next = (data?.seed_profiles || []) as SeedProfileListItem[];

        setItems((prev) => (reset ? next : [...prev, ...next]));
        setOffset(nextOffset + next.length);
        setHasMore(next.length > 0);
      } catch (e: any) {
        setError(e?.message || "Failed to load people");
      } finally {
        setLoading(false);
      }
    },
    [offset, q]
  );

  const [mapItems, setMapItems] = React.useState<SeedProfileListItem[]>([]);
  const [mapLoading, setMapLoading] = React.useState(false);
  const loadMap = React.useCallback(async () => {
    setMapLoading(true);
    try {
      const params = new URLSearchParams();
      // Fetch a large enough set for pins (backend cap increased to allow this).
      params.set("limit", "2000");
      params.set("offset", "0");
      params.set("hasCoords", "1");
      if (q.trim()) params.set("q", q.trim());
      const data = await apiGet(`/api/seed-profiles?${params.toString()}`, { skipCache: true });
      setMapItems((data?.seed_profiles || []) as SeedProfileListItem[]);
    } finally {
      setMapLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    // Initial load
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setHasMore(true);
    load({ reset: true });
    if (view === "map") loadMap();
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold tracking-tight">Discover People</div>
        <div className="text-sm text-muted-foreground">Browse by work location (seed profiles + claimed profiles).</div>
      </div>

      <form onSubmit={onSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, headline, location..."
            className={cn(
              "w-full rounded-md border border-border bg-background px-9 py-2 text-sm outline-none",
              "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            )}
          />
        </div>
        <Button type="submit" disabled={loading}>
          Search
        </Button>
      </form>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={view === "directory" ? "default" : "outline"}
          onClick={() => setView("directory")}
        >
          Directory
        </Button>
        <Button
          type="button"
          variant={view === "map" ? "default" : "outline"}
          onClick={() => {
            setView("map");
            if (mapItems.length === 0) loadMap();
          }}
        >
          Map
        </Button>
        {view === "map" ? <div className="text-xs text-muted-foreground">{mapLoading ? "Loading map…" : `${mapItems.length} pins`}</div> : null}
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {view === "map" ? (
        <DiscoverPeopleMap markers={mapItems} />
      ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((p) => {
          const name =
            (p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown").trim();
          const initials = name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase())
            .join("");

          return (
            <Link
              key={p.id}
              to={`/p/${p.slug}`}
              className="rounded-2xl border border-border bg-card p-5 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 ring-1 ring-border">
                  <AvatarImage src={p.profile_picture_url || undefined} />
                  <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">{name}</div>
                  {p.headline ? <div className="truncate text-sm text-muted-foreground">{p.headline}</div> : null}
                  {p.location ? (
                    <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{p.location}</span>
                    </div>
                  ) : null}
                  {p.work_address ? <div className="truncate text-xs text-muted-foreground mt-1">{p.work_address}</div> : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      )}

      <div className="flex items-center justify-center pt-2">
        <Button
          variant="outline"
          onClick={() => load({ reset: false })}
          disabled={loading || !hasMore}
        >
          {loading ? "Loading..." : hasMore ? "Load more" : "No more results"}
        </Button>
      </div>
    </div>
  );
}


