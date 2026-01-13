import * as React from "react";
import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";

type Props = {
  center?: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number };
  variant?: "hero" | "rail";
  markers: Array<{
    id: string;
    lat?: number | null;
    lng?: number | null;
    label: string;
    personId?: string;
    photoUrl?: string | null;
    distanceLabel?: string | null;
  }>;
};

export function NearbyLunchesMap({ center, userLocation, variant = "rail", markers }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const markerRefs = React.useRef<mapboxgl.Marker[]>([]);
  const moveHandlerRef = React.useRef<(() => void) | null>(null);

  const [selected, setSelected] = React.useState<(Props["markers"][number] & { x: number; y: number }) | null>(null);

  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapCenter = userLocation ?? center;

  // Create map once.
  React.useEffect(() => {
    if (!token) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;
    if (!mapCenter) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      // Colorful streets map — alive, not dead!
      style: "mapbox://styles/mapbox/streets-v12",
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 12,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
    mapRef.current = map;

    return () => {
      if (moveHandlerRef.current) {
        map.off("move", moveHandlerRef.current);
        moveHandlerRef.current = null;
      }
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token, mapCenter?.lat, mapCenter?.lng]);

  // Keep center in sync with user location.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapCenter) return;
    map.easeTo({ center: [mapCenter.lng, mapCenter.lat], duration: 600 });
  }, [mapCenter?.lat, mapCenter?.lng]);

  // Render markers.
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];
    setSelected(null);

    // User marker (YOU) — yellow with pulse ring
    if (userLocation) {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "9999px";
      el.style.border = "3px solid #2d3640";
      el.style.background = "#fdbc59"; // yellow = you
      el.style.boxShadow = "0 0 0 6px rgba(253, 188, 89, 0.35), 0 4px 12px rgba(45, 54, 64, 0.3)";
      markerRefs.current.push(new mapboxgl.Marker({ element: el }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map));
    }

    // Suggestions (clickable)
    markers
      .filter((m) => typeof m.lat === "number" && typeof m.lng === "number")
      .forEach((m) => {
        const el = document.createElement("button");
        el.type = "button";
        el.style.width = "18px";
        el.style.height = "18px";
        el.style.borderRadius = "9999px";
        el.style.border = "3px solid #2d3640";
        // Branded pin: pink accent — pops on colorful map
        el.style.background = "#fd9fff";
        el.style.boxShadow = "0 4px 12px rgba(45, 54, 64, 0.4)";
        el.style.cursor = "pointer";

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([m.lng as number, m.lat as number])
          .addTo(map);

        const select = () => {
          const p = map.project([m.lng as number, m.lat as number]);
          setSelected({ ...m, x: p.x, y: p.y });
        };

        el.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          select();
        });

        markerRefs.current.push(marker);
      });

    // Update overlay position on map move
    if (moveHandlerRef.current) {
      map.off("move", moveHandlerRef.current);
      moveHandlerRef.current = null;
    }
    const onMove = () => {
      setSelected((cur) => {
        if (!cur || typeof cur.lat !== "number" || typeof cur.lng !== "number") return cur;
        const p = map.project([cur.lng as number, cur.lat as number]);
        return { ...cur, x: p.x, y: p.y };
      });
    };
    moveHandlerRef.current = onMove;
    map.on("move", onMove);
  }, [markers, userLocation]);

  if (!token) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-medium">Map</div>
        <div className="text-xs text-muted-foreground mt-1">
          Missing Mapbox token. Set <span className="font-mono">VITE_MAPBOX_TOKEN</span> in your frontend env.
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          Demo pins: {markers.length}. Once you add the token, the interactive map will render here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden relative shadow-network">
      {variant === "rail" ? (
        <div className="px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Map</div>
          <div className="text-xs text-muted-foreground mt-1">Pins show people near you.</div>
        </div>
      ) : null}

      <div ref={containerRef} className={variant === "hero" ? "h-[420px] w-full" : "h-[320px] w-full"} />

      {/* Branded popup anchored to the clicked pin */}
      {selected ? (
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{
            transform: `translate(${Math.max(12, Math.min(selected.x, 9999))}px, ${Math.max(12, Math.min(selected.y, 9999))}px)`,
          }}
        >
          <div className="pointer-events-auto -translate-x-1/2 -translate-y-[calc(100%+14px)] w-[260px] max-w-[80vw] rounded-lg border border-border bg-card shadow-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate text-foreground">{selected.label}</div>
                {selected.distanceLabel ? (
                  <div className="text-xs text-muted-foreground mt-1">{selected.distanceLabel}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="h-6 w-6 rounded-md bg-muted grid place-items-center text-muted-foreground hover:bg-secondary transition-colors text-sm"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                onClick={() => setSelected(null)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


