import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// Vite must bundle the worker as a self-contained same-origin chunk (its own
// sibling module imports get resolved into it) -- `?worker&url` does that.
// A plain `?url` copies the file verbatim and its internal `import` breaks;
// pointing at an external CDN (the previous attempt) hits browsers' strict
// same-origin rules for dedicated workers and fails silently (canvas stays
// black, the worker never posts a single tile-load message back) even
// though the tile servers themselves are reachable. This is what broke
// MapLibre here before, not the tile provider -- see git history for the
// abandoned raster-tile Leaflet fallback this file replaces.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { ArrowClockwise, MapTrifold, Mountains, Planet, Stack, WarningCircle } from "@phosphor-icons/react";
import { useTheme } from "../../context/ThemeContext";
import { getDarkVoyagerStyle, getLightVoyagerStyle } from "../../lib/mapDarkStyle";
import { SATELLITE_STYLE, TERRAIN_STYLE, type BaseLayer } from "../../lib/mapLayers";

if (typeof window !== "undefined" && !maplibregl.getWorkerUrl()) {
  maplibregl.setWorkerUrl(maplibreWorkerUrl);
}

export interface MapMarkerData {
  id: string | number;
  lat: number;
  lng: number;
  color?: string;
  label?: string;
  /** Circular avatar shown on the pin itself instead of a plain dot. */
  photo?: string | null;
  /** Wide banner image shown at the top of the popup when the pin is clicked. */
  banner?: string | null;
  subtitle?: string;
  rating?: number;
  ratingCount?: number;
  actionLabel?: string;
  onClick?: () => void;
}

export interface MapRouteData {
  coordinates: { lat: number; lng: number }[];
  color?: string;
  width?: number;
}

interface Props {
  markers: MapMarkerData[];
  /** Optional straight-line path (e.g. courier -> destination). */
  route?: MapRouteData | null;
  height?: number | string;
  fitToMarkers?: boolean;
  zoom?: number;
  /** [lng, lat] -- matches MapLibre/GeoJSON convention, not Leaflet's [lat,lng]. */
  center?: [number, number];
  className?: string;
  style?: React.CSSProperties;
  radius?: string;
  /** Shows the Google-Maps-style layer picker (Mapa/Satélite/Terreno + Bicicleta). */
  layersControl?: boolean;
}

const PIN_YELLOW = "#eab308";
const PIN_YELLOW_DARK = "#facc15";
const DEFAULT_CENTER: [number, number] = [-89.2182, 13.6929];
const ROUTE_SOURCE_ID = "gocreaj-route";
const ROUTE_LAYER_ID = "gocreaj-route-line";

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function markerElement(m: MapMarkerData, color: string): HTMLDivElement {
  const size = m.photo ? 40 : 16;
  const el = document.createElement("div");
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.border = `3px solid ${color}`;
  el.style.boxShadow = `0 0 0 2px rgba(0,0,0,0.15), 0 2px 10px ${color}66`;
  el.style.cursor = "pointer";
  el.style.background = m.photo ? `var(--surface-1) url('${m.photo}') center/cover no-repeat` : color;
  return el;
}

function buildPopupContent(m: MapMarkerData): HTMLDivElement {
  const card = document.createElement("div");
  card.style.width = "200px";
  card.style.fontFamily = "var(--font-body)";
  card.innerHTML = `
    ${m.banner ? `<div style="height:84px;margin:-13px -19px 8px;border-radius:2px 2px 0 0;overflow:hidden;background:var(--surface-2)"><img src="${m.banner}" style="width:100%;height:100%;object-fit:cover" /></div>` : ""}
    <div style="font-weight:700;font-size:13.5px;color:var(--text-primary);margin-bottom:2px;font-family:var(--font-display)">${m.label ?? ""}</div>
    ${m.subtitle ? `<div style="font-size:11.5px;color:var(--text-muted);margin-bottom:5px">${m.subtitle}</div>` : ""}
    ${
      m.rating !== undefined
        ? `<div style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:var(--text-primary)"><span style="color:var(--warn)">★</span>${m.rating ? m.rating.toFixed(1) : "Nuevo"}${m.ratingCount ? `<span style="color:var(--text-muted);font-weight:400">(${m.ratingCount})</span>` : ""}</div>`
        : ""
    }
  `;
  if (m.onClick) {
    const btn = document.createElement("button");
    btn.textContent = m.actionLabel ?? "Ver tienda";
    btn.style.cssText =
      "margin-top:8px;width:100%;height:30px;border:none;border-radius:var(--radius-sm);background:var(--cyan);color:var(--cyan-ink);font-weight:700;font-size:12px;cursor:pointer;font-family:var(--font-display)";
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      m.onClick?.();
    });
    card.appendChild(btn);
  }
  return card;
}

function hasPopupContent(m: MapMarkerData): boolean {
  return m.banner !== undefined || m.rating !== undefined || !!m.subtitle;
}

export function MapView({ markers, route, height = 320, fitToMarkers = true, zoom = 13, center, className, style, radius = "var(--radius-lg)", layersControl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string | number, maplibregl.Marker>>(new Map());
  const popupsRef = useRef<Map<string | number, maplibregl.Popup>>(new Map());
  const animRef = useRef<Map<string | number, number>>(new Map());
  const lastFitIdsRef = useRef<string>("");
  const routeRef = useRef<MapRouteData | null | undefined>(route);
  const { resolvedTheme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [baseLayer, setBaseLayer] = useState<BaseLayer>("default");
  const [pickerOpen, setPickerOpen] = useState(false);
  const baseLayerRef = useRef(baseLayer);
  const pinColor = resolvedTheme === "dark" ? PIN_YELLOW_DARK : PIN_YELLOW;

  useEffect(() => {
    routeRef.current = route;
  }, [route]);
  useEffect(() => {
    baseLayerRef.current = baseLayer;
  }, [baseLayer]);

  const resolveStyle = async (theme: string, base: BaseLayer) => {
    if (base === "satellite") return SATELLITE_STYLE;
    if (base === "terrain") return TERRAIN_STYLE;
    return theme === "dark" ? getDarkVoyagerStyle() : getLightVoyagerStyle();
  };

  const ensureRouteLayer = (map: maplibregl.Map) => {
    const r = routeRef.current;
    if (!map.isStyleLoaded()) return;
    if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
    if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
    if (!r || r.coordinates.length < 2) return;
    // WebGL paint properties can't resolve CSS custom properties, so a
    // concrete fallback (matching the app's actual cyan tokens) is needed
    // when the caller doesn't pass an explicit color.
    const fallbackColor = resolvedTheme === "dark" ? "#38D6FF" : "#0891B2";
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: r.coordinates.map((c) => [c.lng, c.lat]) },
      },
    });
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": r.color ?? fallbackColor, "line-width": r.width ?? 4 },
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    let timeoutId = 0;
    setLoaded(false);
    setErrored(false);
    lastFitIdsRef.current = "";

    (async () => {
      const styleValue = await resolveStyle(resolvedTheme, baseLayerRef.current);
      if (cancelled || !containerRef.current) return;

      const initialCenter: [number, number] = center ?? (markers[0] ? [markers[0].lng, markers[0].lat] : DEFAULT_CENTER);
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleValue,
        center: initialCenter,
        zoom,
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      timeoutId = window.setTimeout(() => setErrored(true), 8000);
      map.on("load", () => {
        window.clearTimeout(timeoutId);
        setLoaded(true);
        ensureRouteLayer(map);
      });
      map.on("style.load", () => ensureRouteLayer(map));
      map.on("error", () => {
        window.clearTimeout(timeoutId);
        setErrored(true);
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      animRef.current.forEach((id) => cancelAnimationFrame(id));
      animRef.current.clear();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      popupsRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // Swaps the whole style in place on theme toggle or base-layer change
  // instead of remounting the map (which would reset zoom/markers/animation
  // state). Markers are plain DOM overlays, not part of the style, so they
  // survive this automatically; the route layer doesn't, so `style.load`
  // above re-adds it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const styleValue = await resolveStyle(resolvedTheme, baseLayer);
      if (!cancelled) mapRef.current?.setStyle(styleValue);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, baseLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) ensureRouteLayer(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string | number>();

    markers.forEach((m) => {
      seen.add(m.id);
      const color = m.color ?? pinColor;
      const to: [number, number] = [m.lng, m.lat];
      const existing = markersRef.current.get(m.id);

      if (existing) {
        const el = existing.getElement();
        const size = m.photo ? 40 : 16;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.border = `3px solid ${color}`;
        el.style.boxShadow = `0 0 0 2px rgba(0,0,0,0.15), 0 2px 10px ${color}66`;
        el.style.background = m.photo ? `var(--surface-1) url('${m.photo}') center/cover no-repeat` : color;

        const from = existing.getLngLat();
        const fromArr: [number, number] = [from.lng, from.lat];
        if (haversineMeters(fromArr, to) > 0.5) {
          const prevAnim = animRef.current.get(m.id);
          if (prevAnim) cancelAnimationFrame(prevAnim);
          const duration = 900;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            existing.setLngLat([fromArr[0] + (to[0] - fromArr[0]) * eased, fromArr[1] + (to[1] - fromArr[1]) * eased]);
            if (t < 1) {
              animRef.current.set(m.id, requestAnimationFrame(step));
            } else {
              animRef.current.delete(m.id);
            }
          };
          animRef.current.set(m.id, requestAnimationFrame(step));
        }

        if (hasPopupContent(m)) {
          const popup = popupsRef.current.get(m.id);
          if (!popup || !popup.isOpen()) {
            const newPopup = new maplibregl.Popup({ closeButton: true, maxWidth: "220px", offset: 14 }).setDOMContent(buildPopupContent(m));
            existing.setPopup(newPopup);
            popupsRef.current.set(m.id, newPopup);
          }
        }
      } else {
        const marker = new maplibregl.Marker({ element: markerElement(m, color) }).setLngLat(to);
        if (hasPopupContent(m)) {
          const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "220px", offset: 14 }).setDOMContent(buildPopupContent(m));
          marker.setPopup(popup);
          popupsRef.current.set(m.id, popup);
        } else if (m.onClick) {
          marker.getElement().addEventListener("click", () => m.onClick?.());
        }
        marker.addTo(map);
        markersRef.current.set(m.id, marker);
      }
    });

    markersRef.current.forEach((marker, id) => {
      if (!seen.has(id)) {
        const anim = animRef.current.get(id);
        if (anim) cancelAnimationFrame(anim);
        animRef.current.delete(id);
        marker.remove();
        markersRef.current.delete(id);
        popupsRef.current.delete(id);
      }
    });

    if (!fitToMarkers || markers.length === 0) return;
    // Only re-fit the camera when the *set* of markers changes (added/removed),
    // not on every live position update -- otherwise a moving courier marker
    // would fight the smooth interpolation above by re-centering every poll.
    const idsKey = markers.map((m) => m.id).sort().join(",");
    if (idsKey === lastFitIdsRef.current) return;
    lastFitIdsRef.current = idsKey;
    if (markers.length === 1) {
      map.panTo([markers[0].lng, markers[0].lat], { animate: true });
    } else {
      const bounds = markers.reduce(
        (b, m) => b.extend([m.lng, m.lat]),
        new maplibregl.LngLatBounds([markers[0].lng, markers[0].lat], [markers[0].lng, markers[0].lat]),
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, fitToMarkers, pinColor]);

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: radius, overflow: "hidden", ...style }}>
      <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />
      {!loaded && !errored && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-2)", pointerEvents: "none" }}>
          <span className="spinner" aria-hidden="true" style={{ color: "var(--cyan)" }} />
        </div>
      )}
      {errored && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "var(--surface-2)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <WarningCircle size={26} color="var(--text-muted)" />
          <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 260 }}>No se pudo cargar el mapa. Revisa tu conexión a internet.</p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface-1)",
              color: "var(--text-primary)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowClockwise size={14} /> Reintentar
          </button>
        </div>
      )}
      {layersControl && loaded && !errored && (
        <LayersPicker open={pickerOpen} onOpenChange={setPickerOpen} baseLayer={baseLayer} onBaseLayerChange={setBaseLayer} />
      )}
    </div>
  );
}

function LayersPicker({
  open,
  onOpenChange,
  baseLayer,
  onBaseLayerChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseLayer: BaseLayer;
  onBaseLayerChange: (v: BaseLayer) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onOpenChange]);

  const BASE_OPTIONS: { key: BaseLayer; label: string; icon: React.ReactNode }[] = [
    { key: "default", label: "Predeterminado", icon: <MapTrifold size={26} weight="fill" /> },
    { key: "satellite", label: "Satélite", icon: <Planet size={26} weight="fill" /> },
    { key: "terrain", label: "Terreno", icon: <Mountains size={26} weight="fill" /> },
  ];

  return (
    <div ref={rootRef} style={{ position: "absolute", left: 12, bottom: 12, zIndex: 5 }}>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            padding: 12,
            width: 260,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {BASE_OPTIONS.map((opt) => {
              const active = baseLayer === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onBaseLayerChange(opt.key)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 6px",
                    borderRadius: "var(--radius-sm)",
                    border: active ? "2px solid var(--cyan)" : "1px solid var(--border)",
                    background: active ? "var(--cyan-bg)" : "var(--surface-2)",
                    color: active ? "var(--cyan)" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {opt.icon}
                  <span style={{ fontSize: 11, fontWeight: 700, textAlign: "center" }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          boxShadow: "var(--shadow-md)",
          color: "var(--text-primary)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <Stack size={17} weight="bold" />
        Mapa
      </button>
    </div>
  );
}

export type { MapMarkerData as MapMarker };
