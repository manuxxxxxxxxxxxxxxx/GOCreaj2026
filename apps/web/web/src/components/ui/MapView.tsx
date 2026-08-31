import { useEffect, useRef, useState, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
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

interface PinIconProps {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  color?: string;
}

export interface MapMarkerData {
  id: string | number;
  lat: number;
  lng: number;
  color?: string;
  label?: string;
  /** Category glyph shown inside the pin head -- takes priority over `photo`/`icon`. */
  emoji?: string;
  /** Circular avatar shown on the pin itself instead of a plain dot. */
  photo?: string | null;
  /** Wide banner image shown at the top of the popup when the pin is clicked. */
  banner?: string | null;
  subtitle?: string;
  rating?: number;
  ratingCount?: number;
  /** "abierto"/"cerrado" ahora mismo, según hora_apertura/hora_cierre -- omitido cuando la tienda no publicó horario. */
  estado?: "abierto" | "cerrado" | null;
  actionLabel?: string;
  onClick?: () => void;
  /** Renders as a classic map-pin shape with this icon inside (falls back
   * to a photo avatar or plain dot when omitted, same as before). */
  icon?: ComponentType<PinIconProps>;
  /** Slightly enlarges and adds a glow ring -- e.g. the currently selected pin. */
  active?: boolean;
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

const PIN_W = 30;
const PIN_H = 38;

/** Classic teardrop map pin -- a category glyph (emoji, falling back to a
 * store photo or Phosphor icon for callers that don't pass one) sits in the
 * round head, the point anchors to the exact coordinate. */
function PinShape({ color, Icon, emoji, photo, active }: { color: string; Icon?: ComponentType<PinIconProps>; emoji?: string; photo?: string | null; active?: boolean }) {
  const scale = active ? 1.18 : 1;
  return (
    <div style={{ width: PIN_W, height: PIN_H, position: "relative", transform: `scale(${scale})`, transformOrigin: "50% 100%", transition: "transform var(--dur-fast) var(--ease-spring)" }}>
      <svg width={PIN_W} height={PIN_H} viewBox="0 0 30 38" style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.4))" }}>
        <path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 23 15 23s15-11.8 15-23C30 6.7 23.3 0 15 0z" fill={color} stroke="#fff" strokeWidth="2" />
        {active && <circle cx="15" cy="15" r="16.5" fill="none" stroke={color} strokeWidth="2" opacity="0.5" />}
      </svg>
      <div style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {emoji ? (
          <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
        ) : photo ? (
          <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : Icon ? (
          <Icon size={14} weight="fill" color="#fff" />
        ) : null}
      </div>
    </div>
  );
}

function buildPopupContent(m: MapMarkerData): HTMLDivElement {
  const card = document.createElement("div");
  card.style.width = "200px";
  card.style.fontFamily = "var(--font-body)";
  const estadoBadge =
    m.estado != null
      ? `<div style="position:absolute;top:6px;right:6px;padding:2px 8px;border-radius:999px;font-size:9.5px;font-weight:700;color:#fff;background:${m.estado === "abierto" ? "rgba(16,185,129,0.92)" : "rgba(100,116,139,0.9)"}">${m.estado === "abierto" ? "Abierto ahora" : "Cerrado"}</div>`
      : "";
  card.innerHTML = `
    ${m.banner ? `<div style="position:relative;height:84px;margin:-13px -19px 8px;border-radius:2px 2px 0 0;overflow:hidden;background:var(--surface-2)"><img src="${m.banner}" style="width:100%;height:100%;object-fit:cover" />${estadoBadge}</div>` : ""}
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
  const pinRootsRef = useRef<Map<string | number, Root>>(new Map());
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
  // The mount effect below already sets the correct initial style when it
  // constructs the map. Without this guard, the theme/base-layer effect
  // ALSO fires on that same initial mount (effects run for every dependency
  // on first render, not just on subsequent changes) and calls setStyle()
  // again a moment later -- MapLibre aborts the still-loading first style
  // ("Unable to perform style diff... Rebuilding from scratch") and restarts,
  // which can blow past the load timeout and land on the error state.
  const skipNextStyleEffectRef = useRef(true);
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
    let resizeObserver: ResizeObserver | undefined;
    setLoaded(false);
    setErrored(false);
    lastFitIdsRef.current = "";
    skipNextStyleEffectRef.current = true;

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

      timeoutId = window.setTimeout(() => setErrored(true), 12000);
      map.on("load", () => {
        window.clearTimeout(timeoutId);
        // A slow first Voyager fetch (uncached, all its sprite/glyph
        // dependencies) can legitimately take longer than the watchdog
        // above on a cold cache -- if 'load' still ends up firing after
        // that already flipped errored to true, this undoes it instead of
        // being stuck showing the error screen over a map that's actually
        // fine now.
        setErrored(false);
        setLoaded(true);
        ensureRouteLayer(map);
      });
      map.on("style.load", () => ensureRouteLayer(map));
      map.on("error", () => {
        window.clearTimeout(timeoutId);
        setErrored(true);
      });

      mapRef.current = map;

      // MapLibre reads the container's size once at construction time and
      // otherwise relies on its own internal resize tracking, which doesn't
      // reliably catch every layout change this component can go through
      // (the error/retry screen swap, a sidebar collapsing, this panel
      // becoming visible after being display:none) -- when it misses one,
      // the canvas stays frozen at a stale/default size instead of filling
      // its container. Watching the container directly and forcing a
      // resize on every change is the robust fix.
      resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(containerRef.current!);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      resizeObserver?.disconnect();
      animRef.current.forEach((id) => cancelAnimationFrame(id));
      animRef.current.clear();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      pinRootsRef.current.forEach((root) => root.unmount());
      pinRootsRef.current.clear();
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
    if (skipNextStyleEffectRef.current) {
      skipNextStyleEffectRef.current = false;
      return;
    }
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
    // `loaded` isn't read below, but it's a required dependency: on remount
    // (e.g. toggling Mapa/Lista unmounts and recreates this component) this
    // effect's first run can land before the async map-construction effect
    // above has set mapRef.current, so it bails out via the guard above and
    // never runs again once the map is actually ready -- markers never got
    // added. Re-running when `loaded` flips true closes that race.
    if (!loaded) return;

    const seen = new Set<string | number>();

    markers.forEach((m) => {
      seen.add(m.id);
      const color = m.color ?? pinColor;
      const to: [number, number] = [m.lng, m.lat];
      const existing = markersRef.current.get(m.id);

      if (existing) {
        if (m.icon || m.emoji) {
          pinRootsRef.current.get(m.id)?.render(<PinShape color={color} Icon={m.icon} emoji={m.emoji} photo={m.photo} active={m.active} />);
        } else {
          const el = existing.getElement();
          const size = m.photo ? 40 : 16;
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.border = `3px solid ${color}`;
          el.style.boxShadow = `0 0 0 2px rgba(0,0,0,0.15), 0 2px 10px ${color}66`;
          el.style.background = m.photo ? `var(--surface-1) url('${m.photo}') center/cover no-repeat` : color;
        }

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
        let marker: maplibregl.Marker;
        if (m.icon || m.emoji) {
          const el = document.createElement("div");
          el.style.cursor = "pointer";
          const root = createRoot(el);
          root.render(<PinShape color={color} Icon={m.icon} emoji={m.emoji} photo={m.photo} active={m.active} />);
          pinRootsRef.current.set(m.id, root);
          marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(to);
        } else {
          marker = new maplibregl.Marker({ element: markerElement(m, color) }).setLngLat(to);
        }
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
        pinRootsRef.current.get(id)?.unmount();
        pinRootsRef.current.delete(id);
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
  }, [markers, fitToMarkers, pinColor, loaded]);

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
    <div ref={rootRef} style={{ position: "absolute", left: 12, top: 12, zIndex: 5 }}>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
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
