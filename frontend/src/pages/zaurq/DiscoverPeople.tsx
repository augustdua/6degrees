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
  const popupRef = React.useRef<mapboxgl.Popup | null>(null);
  const didInitLayersRef = React.useRef(false);

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
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Clustered markers (GeoJSON source + layers) + fit bounds.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pts = markers
      .filter((p) => typeof p.work_lat === "number" && typeof p.work_lng === "number")
      .map((p) => ({
        p,
        lng: p.work_lng as number,
        lat: p.work_lat as number,
        label: (p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown").trim(),
      }));

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point, any> = {
      type: "FeatureCollection",
      features: pts.map((it) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [it.lng, it.lat] },
        properties: {
          slug: it.p.slug,
          label: it.label,
          subtitle: it.p.work_address || it.p.location || "",
        },
      })),
    };

    const ensureLayers = () => {
      if (didInitLayersRef.current) return;
      if (!map.getSource("discover-people")) {
        map.addSource("discover-people", {
          type: "geojson",
          data: geojson as any,
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 13,
        });
      }

      // Cluster "halo" (soft glow)
      if (!map.getLayer("discover-clusters-halo")) {
        map.addLayer({
          id: "discover-clusters-halo",
          type: "circle",
          source: "discover-people",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "rgba(253, 159, 255, 0.18)",
            "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 50, 26, 200, 30],
            "circle-blur": 0.6,
          },
        });
      }

      // Cluster bubble
      if (!map.getLayer("discover-clusters")) {
        map.addLayer({
          id: "discover-clusters",
          type: "circle",
          source: "discover-people",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": ["step", ["get", "point_count"], "#fd9fff", 10, "#ff7adf", 50, "#ff4fc6", 200, "#d92aa2"],
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 22, 200, 26],
            "circle-stroke-color": "#2d3640",
            "circle-stroke-width": 2,
          },
        });
      }

      // Cluster count label
      if (!map.getLayer("discover-cluster-count")) {
        map.addLayer({
          id: "discover-cluster-count",
          type: "symbol",
          source: "discover-people",
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#0b0f14",
          },
        });
      }

      // Unclustered halo
      if (!map.getLayer("discover-unclustered-halo")) {
        map.addLayer({
          id: "discover-unclustered-halo",
          type: "circle",
          source: "discover-people",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "rgba(253, 159, 255, 0.18)",
            "circle-radius": 12,
            "circle-blur": 0.7,
          },
        });
      }

      // Unclustered pin
      if (!map.getLayer("discover-unclustered")) {
        map.addLayer({
          id: "discover-unclustered",
          type: "circle",
          source: "discover-people",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#fd9fff",
            "circle-radius": 7,
            "circle-stroke-color": "#2d3640",
            "circle-stroke-width": 2,
          },
        });
      }

      // Interactions
      map.on("click", "discover-clusters", async (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const clusterId = (feature.properties as any)?.cluster_id;
        const source = map.getSource("discover-people") as mapboxgl.GeoJSONSource | undefined;
        if (!source || clusterId == null) return;
        (source as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          const coords = (feature.geometry as any)?.coordinates as [number, number] | undefined;
          if (!coords) return;
          map.easeTo({ center: coords, zoom: Math.min(zoom, 14), duration: 500 });
        });
      });

      map.on("click", "discover-unclustered", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = (feature.properties as any) || {};
        const slug = String(props.slug || "");
        const label = String(props.label || "Person");
        const subtitle = String(props.subtitle || "");
        const coords = (feature.geometry as any)?.coordinates as [number, number] | undefined;

        // Lightweight popup; click inside navigates.
        popupRef.current?.remove();
        if (coords) {
          const html = `
            <div style="font-family: ui-sans-serif, system-ui; min-width: 180px;">
              <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${label.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              ${subtitle ? `<div style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">${subtitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>` : ""}
              <button data-open-profile="1" style="background:#0b0f14;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;">
                View profile
              </button>
            </div>
          `;
          const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12 }).setLngLat(coords).setHTML(html).addTo(map);
          popupRef.current = popup;
          popup.getElement().addEventListener("click", (evt) => {
            const t = evt.target as HTMLElement | null;
            if (t && (t as any).dataset?.openProfile === "1") {
              evt.preventDefault();
              evt.stopPropagation();
              if (slug) navigate(`/p/${slug}`);
            }
          });
        } else if (slug) {
          navigate(`/p/${slug}`);
        }
      });

      const setCursor = (cursor: string) => {
        map.getCanvas().style.cursor = cursor;
      };
      map.on("mouseenter", "discover-clusters", () => setCursor("pointer"));
      map.on("mouseleave", "discover-clusters", () => setCursor(""));
      map.on("mouseenter", "discover-unclustered", () => setCursor("pointer"));
      map.on("mouseleave", "discover-unclustered", () => setCursor(""));

      didInitLayersRef.current = true;
    };

    if (map.isStyleLoaded()) ensureLayers();
    else map.once("load", ensureLayers);

    // Update source data (works for subsequent searches)
    const src = map.getSource("discover-people") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(geojson as any);

    // Fit bounds
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


