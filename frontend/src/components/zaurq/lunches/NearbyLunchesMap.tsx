import * as React from "react";
import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";

type Props = {
  center?: { lat: number; lng: number };
  userLocation?: { lat: number; lng: number };
  markers: Array<{
    id: string;
    lat?: number | null;
    lng?: number | null;
    label: string;
  }>;
};

export function NearbyLunchesMap({ center, userLocation, markers }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const markerRefs = React.useRef<mapboxgl.Marker[]>([]);

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
      style: "mapbox://styles/mapbox/streets-v12",
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 12,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "bottom-right");
    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token, userLocation]);

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

    // User marker
    if (userLocation) {
      const el = document.createElement("div");
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "9999px";
      el.style.background = "hsl(var(--primary))";
      el.style.boxShadow = "0 0 0 4px hsl(var(--primary) / 0.2)";
      markerRefs.current.push(new mapboxgl.Marker({ element: el }).setLngLat([userLocation.lng, userLocation.lat]).addTo(map));
    }

    // Suggestions
    markers
      .filter((m) => typeof m.lat === "number" && typeof m.lng === "number")
      .forEach((m) => {
        const popup = new mapboxgl.Popup({ offset: 16 }).setText(m.label);
        markerRefs.current.push(
          new mapboxgl.Marker().setLngLat([m.lng as number, m.lat as number]).setPopup(popup).addTo(map),
        );
      });
  }, [markers, userLocation]);

  if (!token) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-medium">Map view</div>
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-sm font-medium">Map</div>
        <div className="text-xs text-muted-foreground mt-1">Pins show nearby lunch suggestions.</div>
      </div>
      <div ref={containerRef} className="h-[320px] w-full" />
    </div>
  );
}


