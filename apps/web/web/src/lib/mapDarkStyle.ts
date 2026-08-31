import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

/**
 * Both map themes are derived from CARTO's Voyager style (colorful,
 * Google-Maps-like: labeled roads, green parks, blue water, colorful POI
 * icons) instead of light-mode-Voyager vs dark-mode-Dark-Matter, which
 * would leave dark mode looking like a completely different, less detailed
 * product. Two adjustments are applied to the fetched style before either
 * theme renders it:
 *
 * 1. Label declutter (both themes): Voyager's neighborhood/suburb-tier
 *    place labels have a low minzoom, so a Salvadoran city block -- which
 *    has dozens of named "colonias"/"residenciales" -- renders all of them
 *    at once and reads as noise. Their minzoom is raised so they only
 *    appear once zoomed in close enough to matter.
 * 2. Dark palette (dark theme only): rather than algorithmically inverting
 *    every color (which flattens the deliberate light/dark hierarchy
 *    Voyager already encodes via color, e.g. cream vs amber vs gold roads),
 *    the visually dominant layers -- background, water, parks, buildings,
 *    residential fill, the main road classes, boundaries, and every label
 *    layer -- get an explicit, hand-picked dark color so the result reads
 *    as a *designed* dark map, not an inverted one. Anything not covered by
 *    that curated list (tunnel/bridge/ramp variants, rail, misc symbols)
 *    falls back to a generic HSL-based darken so nothing is left unstyled.
 */
const VOYAGER_STYLE_URL = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const DARK_MATTER_FALLBACK_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Only reveal neighborhood-level place names once zoomed in close enough
// that they're not all competing for space at once.
const LABEL_MINZOOM_OVERRIDES: Record<string, number> = {
  place_suburbs: 14,
  place_hamlet: 15,
  place_villages: 13,
};

function applyLabelDeclutter(layers: LayerSpecification[]): LayerSpecification[] {
  return layers.map((layer) => {
    const bump = LABEL_MINZOOM_OVERRIDES[layer.id];
    if (bump === undefined) return layer;
    return { ...layer, minzoom: Math.max(bump, (layer as { minzoom?: number }).minzoom ?? 0) } as LayerSpecification;
  });
}

// ---- generic fallback darken (for layers not explicitly curated below) ----

const COLOR_PAINT_KEYS = ["background-color", "fill-color", "fill-outline-color", "line-color", "text-color", "text-halo-color"];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parseColor(input: string): [number, number, number, number] | null {
  const s = input.trim();
  let m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return [r, g, b, 1];
  }
  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p2: number, q2: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
    if (t < 1 / 2) return q2;
    if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
    return p2;
  };
  return [Math.round(hue2rgb(p, q, h + 1 / 3) * 255), Math.round(hue2rgb(p, q, h) * 255), Math.round(hue2rgb(p, q, h - 1 / 3) * 255)];
}

function darken(input: string): string {
  const c = parseColor(input);
  if (!c) return input;
  const [r, g, b, a] = c;
  const [h, s, l] = rgbToHsl(r, g, b);
  let newL: number;
  let newS = s;
  if (l >= 90) {
    newL = clamp(8 + (100 - l) * 0.6, 6, 14);
    newS = Math.min(s, 8);
  } else if (l >= 70) {
    newL = clamp(100 - l - 15, 12, 22);
    newS = clamp(s * 0.9, 0, 40);
  } else if (l <= 15) {
    newL = l;
  } else {
    newL = clamp(100 - l, 16, 40);
    newS = clamp(s * 1.15, 0, 90);
  }
  const [nr, ng, nb] = hslToRgb(h, newS, newL);
  return a < 1 ? `rgba(${nr},${ng},${nb},${a})` : `rgb(${nr},${ng},${nb})`;
}

function transformValue(v: unknown): unknown {
  if (typeof v === "string") return darken(v);
  if (Array.isArray(v)) return v.map(transformValue);
  return v;
}

function darkenPaintFallback(paint: Record<string, unknown>): Record<string, unknown> {
  const out = { ...paint };
  for (const key of COLOR_PAINT_KEYS) {
    if (key in out) out[key] = transformValue(out[key]);
  }
  return out;
}

// ---- curated dark palette for the visually dominant layers ----

const DARK_BG = "#0b0f1a";
const DARK_LABEL_TEXT = "#c7d3e0";
const DARK_LABEL_HALO = DARK_BG;

const DARK_COLOR_OVERRIDES: Record<string, Record<string, unknown>> = {
  background: { "background-color": DARK_BG },
  water: { "fill-color": "#12283a" },
  water_shadow: { "fill-color": "#0f2231" },
  waterway: { "line-color": "#1a3a4f" },
  landcover: { "fill-color": "#182a1f" },
  park_national_park: { "fill-color": "#1d3527" },
  park_nature_reserve: { "fill-color": "#1d3527" },
  landuse: { "fill-color": "#171a1f" },
  landuse_residential: { "fill-color": "rgba(30,34,42,0.35)" },
  building: { "fill-color": "#20242c" },
  "building-top": { "fill-color": "#262b34", "fill-outline-color": "#39404c" },

  // Road hierarchy reads through lightness alone (darker -> brighter as
  // roads get more important), all one blue-gray family that fits the navy
  // background -- no gold/amber, which read as an out-of-place "orange".
  road_minor_case: { "line-color": "#20242c" },
  road_minor_fill: { "line-color": "#3c4250" },
  road_service_case: { "line-color": "#1c1f26" },
  road_service_fill: { "line-color": "#2c303a" },
  road_path: { "line-color": "#2c303a" },
  rail: { "line-color": "#2c303a" },
  rail_dash: { "line-color": "#2c303a" },
  road_sec_case_noramp: { "line-color": "#242a35" },
  road_sec_fill_noramp: { "line-color": "#5a6578" },
  road_pri_case_noramp: { "line-color": "#232833" },
  road_pri_fill_noramp: { "line-color": "#7d8aa0" },
  road_trunk_case_noramp: { "line-color": "#262c38" },
  road_trunk_fill_noramp: { "line-color": "#99a5ba" },
  road_mot_case_noramp: { "line-color": "#2a303d" },
  road_mot_fill_noramp: { "line-color": "#b7c2d4" },

  boundary_state: { "line-color": "#2e343f" },
  boundary_county: { "line-color": "#262b34" },
  boundary_country_outline: { "line-color": "#4a5566" },
  boundary_country_inner: { "line-color": "#333a46" },
};

// Ramps, tunnels and bridges reuse their parent road class's colors above --
// generated instead of hand-listed so no gold/amber variant gets missed.
const ROAD_CLASS_COLOR: Record<string, { case: string; fill: string }> = {
  mot: { case: "#2a303d", fill: "#b7c2d4" },
  trunk: { case: "#262c38", fill: "#99a5ba" },
  pri: { case: "#232833", fill: "#7d8aa0" },
  sec: { case: "#242a35", fill: "#5a6578" },
  minor: { case: "#20242c", fill: "#3c4250" },
  service: { case: "#1c1f26", fill: "#2c303a" },
};
for (const [cls, { case: caseColor, fill }] of Object.entries(ROAD_CLASS_COLOR)) {
  if (cls === "mot" || cls === "trunk" || cls === "pri") {
    DARK_COLOR_OVERRIDES[`road_${cls}_case_ramp`] = { "line-color": caseColor };
    DARK_COLOR_OVERRIDES[`road_${cls}_fill_ramp`] = { "line-color": fill };
  }
  DARK_COLOR_OVERRIDES[`tunnel_${cls}_case`] = { "line-color": caseColor };
  DARK_COLOR_OVERRIDES[`tunnel_${cls}_fill`] = { "line-color": fill };
  DARK_COLOR_OVERRIDES[`bridge_${cls}_case`] = { "line-color": caseColor };
  DARK_COLOR_OVERRIDES[`bridge_${cls}_fill`] = { "line-color": fill };
}
DARK_COLOR_OVERRIDES.bridge_sec_fill = { "line-color": ROAD_CLASS_COLOR.sec.fill };
DARK_COLOR_OVERRIDES.tunnel_path = { "line-color": "#2c303a" };
DARK_COLOR_OVERRIDES.bridge_path = { "line-color": "#2c303a" };
DARK_COLOR_OVERRIDES.tunnel_rail = { "line-color": "#2c303a" };
DARK_COLOR_OVERRIDES.tunnel_rail_dash = { "line-color": "#2c303a" };

function isLabelLayer(id: string): boolean {
  return id.startsWith("place_") || id.startsWith("watername_") || id.startsWith("poi_");
}

function buildDarkLayers(layers: LayerSpecification[]): LayerSpecification[] {
  return layers.map((layer) => {
    const paint = (layer as { paint?: Record<string, unknown> }).paint;
    if (!paint) return layer;
    const overrides = DARK_COLOR_OVERRIDES[layer.id];
    if (overrides) {
      return { ...layer, paint: { ...paint, ...overrides } } as LayerSpecification;
    }
    if (isLabelLayer(layer.id) && ("text-color" in paint || "text-halo-color" in paint)) {
      const next: Record<string, unknown> = { ...paint };
      if ("text-color" in next) next["text-color"] = DARK_LABEL_TEXT;
      if ("text-halo-color" in next) next["text-halo-color"] = DARK_LABEL_HALO;
      if ("icon-color" in next) next["icon-color"] = DARK_LABEL_TEXT;
      return { ...layer, paint: next } as LayerSpecification;
    }
    return { ...layer, paint: darkenPaintFallback(paint) } as LayerSpecification;
  });
}

let lightStylePromise: Promise<StyleSpecification> | null = null;
let darkStylePromise: Promise<StyleSpecification> | null = null;

/** Voyager, decluttered, unmodified colors -- the light theme. */
export function getLightVoyagerStyle(): Promise<StyleSpecification> {
  if (!lightStylePromise) {
    lightStylePromise = fetch(VOYAGER_STYLE_URL)
      .then((r) => r.json())
      .then((style: StyleSpecification) => ({ ...style, layers: applyLabelDeclutter(style.layers) }));
  }
  return lightStylePromise;
}

/** Voyager, decluttered, dark-recolored -- the dark theme. */
export function getDarkVoyagerStyle(): Promise<StyleSpecification> {
  if (!darkStylePromise) {
    darkStylePromise = fetch(VOYAGER_STYLE_URL)
      .then((r) => r.json())
      .then((style: StyleSpecification) => ({ ...style, layers: buildDarkLayers(applyLabelDeclutter(style.layers)) }))
      .catch(() => fetch(DARK_MATTER_FALLBACK_URL).then((r) => r.json())) as Promise<StyleSpecification>;
  }
  return darkStylePromise;
}
