import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceMobileIcon, MapTrifoldIcon, MountainsIcon, PlanetIcon, StackIcon } from "phosphor-react-native";
import type { Coordinate } from "../../lib/mapcn/types";
import { useTheme } from "../../theme/ThemeContext";
import type { ThemeTokens } from "../../theme/tokens";

/**
 * Mapa real (MapLibre GL + tiles vectoriales CARTO Voyager) dentro de un
 * WebView, en vez de un módulo nativo compilado
 * (`@maplibre/maplibre-react-native`). Expo Go solo trae los módulos
 * nativos que ya vienen de fábrica con la app -- uno propio como MapLibre
 * nunca va a estar ahí sin compilar un build a la medida. WebView SÍ es uno
 * de esos módulos de fábrica, y como es solo HTML/JS corriendo dentro,
 * puede cargar la build standalone de MapLibre GL JS desde un CDN igual que
 * cualquier página sin bundler -- sin el problema de worker que sí afecta a
 * Vite en la web (ver apps/web/web/src/components/ui/MapView.tsx). Esto usa
 * exactamente el mismo estilo, misma paleta oscura y mismas capas
 * (satélite/terreno) que la versión web, para que ambas plataformas se vean
 * iguales -- ver apps/web/web/src/lib/{mapDarkStyle,mapLayers}.ts, de donde
 * se portó esta lógica.
 */

export interface WebMapMarker {
  id: string | number;
  coordinate: Coordinate;
  color?: string;
  label?: string;
  /** Renders as a map-pin shape with this category's emoji glyph inside
   * (mirrors the web version's Phosphor-icon pins -- the WebView here is
   * plain HTML/JS, not React, so a glyph is used instead of a component). */
  category?: string;
}

export interface WebMapRoute {
  coordinates: Coordinate[];
  color?: string;
  width?: number;
}

export type MapBaseLayer = "default" | "satellite" | "terrain";

interface Props {
  center: Coordinate;
  zoom?: number;
  markers?: WebMapMarker[];
  route?: WebMapRoute | null;
  userLocation?: Coordinate | null;
  interactive?: boolean;
  fitToMarkers?: boolean;
  onPress?: (coordinate: Coordinate) => void;
  onMarkerPress?: (id: string | number) => void;
  style?: StyleProp<ViewStyle>;
  height?: DimensionValue;
  /** Shows the Google-Maps-style layer picker (Predeterminado/Satélite/Terreno). */
  layersControl?: boolean;
  /** Cuando se da, recuerda en disco el último centro/zoom/capa que el usuario dejó en
   * este mapa (por moveend real, no por los `center`/`zoom` que le mande el padre) y los
   * restaura la próxima vez que se monte -- así un cambio de filtro en la pantalla de
   * arriba (categoría, búsqueda, zona) ya no le pisa la posición manual del usuario. */
  persistKey?: string;
}

// Embedded inside the WebView's <script> tag as plain JS (no TS, no bundler)
// -- ported 1:1 from apps/web/web/src/lib/mapDarkStyle.ts and mapLayers.ts so
// both platforms render the identical palette. Kept in single-quoted/plain
// JS syntax throughout (no backticks) since this whole thing lives inside a
// TypeScript template literal already.
const MAP_ENGINE_JS = `
var VOYAGER_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
var DARK_MATTER_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

var LABEL_MINZOOM = { place_suburbs: 14, place_hamlet: 15, place_villages: 13 };

function applyLabelDeclutter(layers) {
  return layers.map(function (layer) {
    var bump = LABEL_MINZOOM[layer.id];
    if (bump === undefined) return layer;
    var copy = Object.assign({}, layer);
    copy.minzoom = Math.max(bump, layer.minzoom || 0);
    return copy;
  });
}

var COLOR_PAINT_KEYS = ['background-color', 'fill-color', 'fill-outline-color', 'line-color', 'text-color', 'text-halo-color'];

function clampNum(n, min, max) { return Math.min(max, Math.max(min, n)); }

function parseColor(input) {
  var s = input.trim();
  var m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    var r3 = parseInt(m[1][0] + m[1][0], 16), g3 = parseInt(m[1][1] + m[1][1], 16), b3 = parseInt(m[1][2] + m[1][2], 16);
    return [r3, g3, b3, 1];
  }
  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  m = s.match(/^rgba?\\(([^)]+)\\)$/i);
  if (m) {
    var parts = m[1].split(',').map(function (p) { return parseFloat(p.trim()); });
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  return null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { var v = Math.round(l * 255); return [v, v, v]; }
  var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  var p = 2 * l - q;
  function hue2rgb(p2, q2, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
    if (t < 1 / 2) return q2;
    if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
    return p2;
  }
  return [Math.round(hue2rgb(p, q, h + 1 / 3) * 255), Math.round(hue2rgb(p, q, h) * 255), Math.round(hue2rgb(p, q, h - 1 / 3) * 255)];
}

function darkenColor(input) {
  var c = parseColor(input);
  if (!c) return input;
  var hsl = rgbToHsl(c[0], c[1], c[2]);
  var h = hsl[0], s = hsl[1], l = hsl[2];
  var newL, newS = s;
  if (l >= 90) { newL = clampNum(8 + (100 - l) * 0.6, 6, 14); newS = Math.min(s, 8); }
  else if (l >= 70) { newL = clampNum(100 - l - 15, 12, 22); newS = clampNum(s * 0.9, 0, 40); }
  else if (l <= 15) { newL = l; }
  else { newL = clampNum(100 - l, 16, 40); newS = clampNum(s * 1.15, 0, 90); }
  var rgb = hslToRgb(h, newS, newL);
  return c[3] < 1 ? 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + c[3] + ')' : 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
}

function transformValue(v) {
  if (typeof v === 'string') return darkenColor(v);
  if (Array.isArray(v)) return v.map(transformValue);
  return v;
}

function darkenPaintFallback(paint) {
  var out = Object.assign({}, paint);
  COLOR_PAINT_KEYS.forEach(function (key) {
    if (key in out) out[key] = transformValue(out[key]);
  });
  return out;
}

var DARK_BG = '#0b0f1a';
var DARK_LABEL_TEXT = '#c7d3e0';
var DARK_LABEL_HALO = DARK_BG;

var DARK_OVERRIDES = {
  background: { 'background-color': DARK_BG },
  water: { 'fill-color': '#12283a' },
  water_shadow: { 'fill-color': '#0f2231' },
  waterway: { 'line-color': '#1a3a4f' },
  landcover: { 'fill-color': '#182a1f' },
  park_national_park: { 'fill-color': '#1d3527' },
  park_nature_reserve: { 'fill-color': '#1d3527' },
  landuse: { 'fill-color': '#171a1f' },
  landuse_residential: { 'fill-color': 'rgba(30,34,42,0.35)' },
  building: { 'fill-color': '#20242c' },
  'building-top': { 'fill-color': '#262b34', 'fill-outline-color': '#39404c' },
  road_minor_case: { 'line-color': '#20242c' },
  road_minor_fill: { 'line-color': '#3c4250' },
  road_service_case: { 'line-color': '#1c1f26' },
  road_service_fill: { 'line-color': '#2c303a' },
  road_path: { 'line-color': '#2c303a' },
  rail: { 'line-color': '#2c303a' },
  rail_dash: { 'line-color': '#2c303a' },
  road_sec_case_noramp: { 'line-color': '#242a35' },
  road_sec_fill_noramp: { 'line-color': '#5a6578' },
  road_pri_case_noramp: { 'line-color': '#232833' },
  road_pri_fill_noramp: { 'line-color': '#7d8aa0' },
  road_trunk_case_noramp: { 'line-color': '#262c38' },
  road_trunk_fill_noramp: { 'line-color': '#99a5ba' },
  road_mot_case_noramp: { 'line-color': '#2a303d' },
  road_mot_fill_noramp: { 'line-color': '#b7c2d4' },
  boundary_state: { 'line-color': '#2e343f' },
  boundary_county: { 'line-color': '#262b34' },
  boundary_country_outline: { 'line-color': '#4a5566' },
  boundary_country_inner: { 'line-color': '#333a46' },
};

var ROAD_CLASS_COLOR = {
  mot: { c: '#2a303d', f: '#b7c2d4' },
  trunk: { c: '#262c38', f: '#99a5ba' },
  pri: { c: '#232833', f: '#7d8aa0' },
  sec: { c: '#242a35', f: '#5a6578' },
  minor: { c: '#20242c', f: '#3c4250' },
  service: { c: '#1c1f26', f: '#2c303a' },
};
Object.keys(ROAD_CLASS_COLOR).forEach(function (cls) {
  var cc = ROAD_CLASS_COLOR[cls].c, ff = ROAD_CLASS_COLOR[cls].f;
  if (cls === 'mot' || cls === 'trunk' || cls === 'pri') {
    DARK_OVERRIDES['road_' + cls + '_case_ramp'] = { 'line-color': cc };
    DARK_OVERRIDES['road_' + cls + '_fill_ramp'] = { 'line-color': ff };
  }
  DARK_OVERRIDES['tunnel_' + cls + '_case'] = { 'line-color': cc };
  DARK_OVERRIDES['tunnel_' + cls + '_fill'] = { 'line-color': ff };
  DARK_OVERRIDES['bridge_' + cls + '_case'] = { 'line-color': cc };
  DARK_OVERRIDES['bridge_' + cls + '_fill'] = { 'line-color': ff };
});
DARK_OVERRIDES.bridge_sec_fill = { 'line-color': ROAD_CLASS_COLOR.sec.f };
DARK_OVERRIDES.tunnel_path = { 'line-color': '#2c303a' };
DARK_OVERRIDES.bridge_path = { 'line-color': '#2c303a' };
DARK_OVERRIDES.tunnel_rail = { 'line-color': '#2c303a' };
DARK_OVERRIDES.tunnel_rail_dash = { 'line-color': '#2c303a' };

function isLabelLayer(id) {
  return id.indexOf('place_') === 0 || id.indexOf('watername_') === 0 || id.indexOf('poi_') === 0;
}

function buildDarkLayers(layers) {
  return layers.map(function (layer) {
    var paint = layer.paint;
    if (!paint) return layer;
    var overrides = DARK_OVERRIDES[layer.id];
    if (overrides) {
      return Object.assign({}, layer, { paint: Object.assign({}, paint, overrides) });
    }
    if (isLabelLayer(layer.id) && ('text-color' in paint || 'text-halo-color' in paint)) {
      var next = Object.assign({}, paint);
      if ('text-color' in next) next['text-color'] = DARK_LABEL_TEXT;
      if ('text-halo-color' in next) next['text-halo-color'] = DARK_LABEL_HALO;
      if ('icon-color' in next) next['icon-color'] = DARK_LABEL_TEXT;
      return Object.assign({}, layer, { paint: next });
    }
    return Object.assign({}, layer, { paint: darkenPaintFallback(paint) });
  });
}

var SATELLITE_STYLE = {
  version: 8,
  sources: {
    'esri-imagery': { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 },
    'esri-labels': { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 },
  },
  layers: [
    { id: 'esri-imagery-layer', type: 'raster', source: 'esri-imagery' },
    { id: 'esri-labels-layer', type: 'raster', source: 'esri-labels' },
  ],
};

var TERRAIN_STYLE = {
  version: 8,
  sources: {
    opentopomap: {
      type: 'raster',
      tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://b.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 17,
    },
  },
  layers: [{ id: 'opentopomap-layer', type: 'raster', source: 'opentopomap' }],
};

var lightStylePromise = null;
var darkStylePromise = null;

function getLightVoyagerStyle() {
  if (!lightStylePromise) {
    lightStylePromise = fetch(VOYAGER_URL).then(function (r) { return r.json(); }).then(function (style) {
      return Object.assign({}, style, { layers: applyLabelDeclutter(style.layers) });
    });
  }
  return lightStylePromise;
}

function getDarkVoyagerStyle() {
  if (!darkStylePromise) {
    darkStylePromise = fetch(VOYAGER_URL).then(function (r) { return r.json(); }).then(function (style) {
      return Object.assign({}, style, { layers: buildDarkLayers(applyLabelDeclutter(style.layers)) });
    }).catch(function () {
      return fetch(DARK_MATTER_URL).then(function (r) { return r.json(); });
    });
  }
  return darkStylePromise;
}

function resolveStyle(base) {
  if (base === 'satellite') return Promise.resolve(SATELLITE_STYLE);
  if (base === 'terrain') return Promise.resolve(TERRAIN_STYLE);
  return IS_DARK ? getDarkVoyagerStyle() : getLightVoyagerStyle();
}

// Mirrors src/lib/categoryIcons.tsx's CATEGORIA_COLOR/CATEGORIA_EMOJI --
// same category -> color/glyph mapping as the app itself, ported here
// since this WebView can't import a React component module.
var CATEGORIA_COLOR = {
  comida: '#f97316', mercado: '#10b981', farmacia: '#14b8a6', bebidas: '#3b82f6',
  panaderia: '#d97706', postres: '#ec4899', frutas: '#84cc16', verduras: '#15803d',
  ropa: '#7c3aed', calzado: '#0891b2', electronica: '#475569', hogar: '#b45309',
  envios: '#6366f1', general: '#64748b',
  comida_rapida: '#ea580c', restaurantes: '#b91c1c', comida_saludable: '#16a34a', vegana: '#15803d', comida_tipica: '#b45309', pizza: '#dc2626', sushi: '#db2777', mexicana: '#ea580c', italiana: '#ca8a04', pollo: '#d97706', mariscos: '#0891b2', parrilla: '#dc2626', desayunos: '#f59e0b', almuerzos: '#78716c', catering: '#7c3aed', dieta_especial: '#059669', cafe: '#78350f', jugos: '#f97316', cerveceria: '#ca8a04', vinos: '#7c2d12', energeticas: '#eab308', te: '#65a30d', agua_refrescos: '#0ea5e9', reposteria: '#ec4899', heladeria: '#38bdf8', chocolateria: '#78350f', dulces_tipicos: '#f472b6', snacks: '#eab308', carniceria: '#b91c1c', pescaderia: '#0284c7', organicos: '#22c55e', granel: '#a16207', lacteos: '#64748b', huevos: '#ca8a04', especias: '#dc2626', optica: '#0891b2', dental: '#06b6d4', suplementos: '#16a34a', equipo_medico: '#dc2626', adulto_mayor: '#6366f1', primeros_auxilios: '#ef4444', cosmeticos: '#ec4899', cuidado_piel: '#f472b6', peluqueria: '#a855f7', perfumeria: '#d946ef', higiene: '#06b6d4', barberia: '#1e293b', unas: '#f43f5e', ropa_mujer: '#db2777', ropa_hombre: '#2563eb', ropa_infantil: '#f59e0b', ropa_deportiva: '#16a34a', lenceria: '#f43f5e', uniformes: '#475569', accesorios: '#a16207', joyeria: '#eab308', lentes_sol: '#1e293b', muebles: '#92400e', decoracion: '#d946ef', electrodomesticos: '#64748b', electro_pequeno: '#0891b2', blancos: '#3b82f6', cocina: '#ea580c', ferreteria: '#52525b', pintura: '#dc2626', jardineria: '#16a34a', limpieza: '#06b6d4', celulares: '#2563eb', computadoras: '#1e293b', videojuegos: '#7c3aed', audio: '#ea580c', camaras: '#0f172a', domotica: '#eab308', bebes: '#ec4899', juguetes: '#f59e0b', escolar_ninos: '#2563eb', sillas_auto: '#16a34a', mascotas: '#a16207', veterinaria: '#dc2626', peluqueria_canina: '#0891b2', papeleria: '#2563eb', libreria: '#78350f', oficina: '#475569', impresiones: '#64748b', deportes: '#16a34a', suple_deportivo: '#dc2626', bicicletas: '#0891b2', gimnasio: '#7c3aed', repuestos: '#475569', accesorios_auto: '#1e293b', lubricantes: '#78350f', llantas: '#27272a', lavado_autos: '#0ea5e9', motos: '#dc2626', flores: '#ec4899', regalos: '#dc2626', pinateria: '#f59e0b', globos: '#a855f7', tarjetas: '#ec4899', peluches: '#f472b6', construccion: '#f59e0b', herramientas: '#52525b', electricidad_plomeria: '#eab308', instrumentos: '#7c2d12', manualidades: '#d946ef', fotografia: '#1e293b', entretenimiento: '#7c3aed', lavanderia: '#0891b2', mudanzas: '#78716c', reparaciones: '#ca8a04', cerrajeria: '#52525b', segunda_mano: '#16a34a', importados: '#2563eb', religiosos: '#a16207', souvenirs: '#ea580c',
};
var CATEGORIA_EMOJI = {
  comida: '🍔', mercado: '🛒', farmacia: '💊', bebidas: '🥤',
  panaderia: '🍞', postres: '🍰', frutas: '🍎', verduras: '🥕',
  ropa: '👕', calzado: '👟', electronica: '📱', hogar: '🛋️',
  envios: '🚚', general: '📦',
  comida_rapida: '🍔', restaurantes: '🍽️', comida_saludable: '🥑', vegana: '🌱', comida_tipica: '🫓', pizza: '🍕', sushi: '🍣', mexicana: '🌮', italiana: '🍝', pollo: '🍗', mariscos: '🦐', parrilla: '🥩', desayunos: '🍳', almuerzos: '🍱', catering: '🥂', dieta_especial: '💚', cafe: '☕', jugos: '🧃', cerveceria: '🍺', vinos: '🍷', energeticas: '⚡', te: '🍵', agua_refrescos: '🥤', reposteria: '🎂', heladeria: '🍦', chocolateria: '🍫', dulces_tipicos: '🍬', snacks: '🍿', carniceria: '🥩', pescaderia: '🐟', organicos: '🌿', granel: '🌾', lacteos: '🥛', huevos: '🥚', especias: '🌶️', optica: '👓', dental: '🦷', suplementos: '💊', equipo_medico: '🩺', adulto_mayor: '🧓', primeros_auxilios: '🚑', cosmeticos: '💄', cuidado_piel: '🧴', peluqueria: '💇', perfumeria: '🌸', higiene: '🧼', barberia: '💈', unas: '💅', ropa_mujer: '👗', ropa_hombre: '👔', ropa_infantil: '🧒', ropa_deportiva: '🎽', lenceria: '👙', uniformes: '🥼', accesorios: '👜', joyeria: '💍', lentes_sol: '🕶️', muebles: '🛋️', decoracion: '🖼️', electrodomesticos: '🧺', electro_pequeno: '🔌', blancos: '🛏️', cocina: '🍳', ferreteria: '🔧', pintura: '🎨', jardineria: '🪴', limpieza: '🧽', celulares: '📱', computadoras: '💻', videojuegos: '🎮', audio: '🎧', camaras: '📷', domotica: '💡', bebes: '👶', juguetes: '🧸', escolar_ninos: '🎒', sillas_auto: '🍼', mascotas: '🐾', veterinaria: '🐶', peluqueria_canina: '🐩', papeleria: '✏️', libreria: '📚', oficina: '🗂️', impresiones: '🖨️', deportes: '⚽', suple_deportivo: '🏋️', bicicletas: '🚲', gimnasio: '🏋️‍♂️', repuestos: '🔩', accesorios_auto: '🚗', lubricantes: '🛢️', llantas: '🛞', lavado_autos: '🚿', motos: '🏍️', flores: '💐', regalos: '🎁', pinateria: '🎉', globos: '🎈', tarjetas: '💌', peluches: '🧸', construccion: '🏗️', herramientas: '🧰', electricidad_plomeria: '⚡', instrumentos: '🎸', manualidades: '🖌️', fotografia: '📸', entretenimiento: '🎟️', lavanderia: '🧺', mudanzas: '🚚', reparaciones: '🛠️', cerrajeria: '🔑', segunda_mano: '♻️', importados: '🌎', religiosos: '🙏', souvenirs: '🎁',
};
function categoriaColor(cat) {
  var key = cat ? cat.toLowerCase() : 'general';
  return CATEGORIA_COLOR[key] || CATEGORIA_COLOR.general;
}
function categoriaEmoji(cat) {
  var key = cat ? cat.toLowerCase() : 'general';
  return CATEGORIA_EMOJI[key] || CATEGORIA_EMOJI.general;
}
`;

function buildHtml(isDark: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${isDark ? "#0b0f1a" : "#e9ecf3"}; }
    .maplibregl-ctrl-attrib { font-size: 9px; }
    .go-pin { border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); }
    .go-puck { border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 4px rgba(56,214,255,0.35); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    var IS_DARK = ${isDark ? "true" : "false"};
    ${MAP_ENGINE_JS}

    var map = null;
    var currentBase = 'default';
    var markerObjs = {};
    var puckMarker = null;
    var pendingView = null;
    var pendingMarkers = null;
    var pendingRoute = null;
    var pendingUserLocation = null;
    var pendingInteractive = null;

    function post(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }

    var ROUTE_SOURCE = 'go-route';
    var ROUTE_LAYER = 'go-route-line';

    function ensureRouteLayer() {
      if (!map.isStyleLoaded()) return;
      if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
      if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
      if (!pendingRoute) return;
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pendingRoute.coordinates } } });
      map.addLayer({ id: ROUTE_LAYER, type: 'line', source: ROUTE_SOURCE, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': pendingRoute.color || (IS_DARK ? '#38D6FF' : '#0891B2'), 'line-width': pendingRoute.width || 4 } });
    }

    function pinHtml(color, emoji) {
      return '<div style="position:relative;width:30px;height:38px;">' +
        '<svg width="30" height="38" viewBox="0 0 30 38" style="position:absolute;inset:0;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.4))">' +
        '<path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 23 15 23s15-11.8 15-23C30 6.7 23.3 0 15 0z" fill="' + color + '" stroke="#fff" stroke-width="2"/>' +
        '</svg>' +
        '<div style="position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;">' + emoji + '</div>' +
        '</div>';
    }

    function applyMarkers(list) {
      var seen = {};
      list.forEach(function (m) {
        seen[m.id] = true;
        var existing = markerObjs[m.id];
        if (existing) {
          existing.setLngLat(m.coordinate);
          if (m.category) existing.getElement().innerHTML = pinHtml(m.color || categoriaColor(m.category), categoriaEmoji(m.category));
        } else {
          var el = document.createElement('div');
          el.style.cursor = 'pointer';
          var marker;
          if (m.category) {
            el.innerHTML = pinHtml(m.color || categoriaColor(m.category), categoriaEmoji(m.category));
            marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(m.coordinate).addTo(map);
          } else {
            el.className = 'go-pin';
            el.style.width = '18px';
            el.style.height = '18px';
            el.style.background = m.color || '#38D6FF';
            marker = new maplibregl.Marker({ element: el }).setLngLat(m.coordinate).addTo(map);
          }
          el.addEventListener('click', function (ev) {
            ev.stopPropagation();
            post({ type: 'markerPress', id: m.id });
          });
          markerObjs[m.id] = marker;
        }
      });
      Object.keys(markerObjs).forEach(function (id) {
        if (!seen[id]) {
          markerObjs[id].remove();
          delete markerObjs[id];
        }
      });
    }

    function applyUserLocation() {
      if (puckMarker) { puckMarker.remove(); puckMarker = null; }
      if (!pendingUserLocation) return;
      var el = document.createElement('div');
      el.className = 'go-puck';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.background = '#38d6ff';
      puckMarker = new maplibregl.Marker({ element: el }).setLngLat(pendingUserLocation).addTo(map);
    }

    function applyInteractive() {
      if (pendingInteractive === null) return;
      var on = pendingInteractive;
      ['dragPan', 'scrollZoom', 'doubleClickZoom', 'touchZoomRotate'].forEach(function (k) {
        if (on) map[k].enable(); else map[k].disable();
      });
    }

    function cloneStyle(styleValue) {
      // MapLibre normalizes/mutates the style spec object it's handed (both on
      // map construction and on setStyle) -- SATELLITE_STYLE/TERRAIN_STYLE are
      // shared module-level literals and the Voyager style promise resolves to
      // the same cached object every time, so reusing that same reference
      // across multiple setStyle() calls (e.g. satellite -> default -> ...)
      // hands MapLibre an already-mutated spec the second time around and the
      // switch silently no-ops. A fresh deep clone per use avoids that.
      return JSON.parse(JSON.stringify(styleValue));
    }

    function initMap() {
      resolveStyle('default').then(function (styleValue) {
        map = new maplibregl.Map({ container: 'map', style: cloneStyle(styleValue), center: [0, 0], zoom: 2, attributionControl: { compact: true } });
        map.on('load', function () {
          if (pendingView) map.jumpTo({ center: pendingView.center, zoom: pendingView.zoom });
          if (pendingMarkers) applyMarkers(pendingMarkers);
          ensureRouteLayer();
          applyUserLocation();
          applyInteractive();
          post({ type: 'ready' });
        });
        map.on('style.load', function () { ensureRouteLayer(); });
        map.on('click', function (e) {
          post({ type: 'mapPress', coordinate: [e.lngLat.lng, e.lngLat.lat] });
        });
        // e.originalEvent solo existe en moves iniciados por el usuario (drag, pellizco,
        // scroll-zoom) -- los nuestros via goSetView()/easeTo() no lo traen, así que esto
        // no se dispara en bucle contra nuestras propias llamadas.
        map.on('moveend', function (e) {
          if (!e.originalEvent) return;
          var c = map.getCenter();
          post({ type: 'moveend', center: [c.lng, c.lat], zoom: map.getZoom() });
        });
      });
    }

    window.goSetView = function (lng, lat, zoom) {
      pendingView = { center: [lng, lat], zoom: zoom };
      if (map) map.easeTo({ center: [lng, lat], zoom: zoom, duration: 400 });
    };

    window.goSetMarkers = function (json) {
      pendingMarkers = JSON.parse(json);
      if (map && map.isStyleLoaded()) applyMarkers(pendingMarkers);
    };

    window.goSetRoute = function (json) {
      pendingRoute = json ? JSON.parse(json) : null;
      if (map) ensureRouteLayer();
    };

    window.goSetUserLocation = function (json) {
      pendingUserLocation = json ? JSON.parse(json) : null;
      if (map) applyUserLocation();
    };

    window.goFitBounds = function (json) {
      if (!map) return;
      var pts = JSON.parse(json);
      if (pts.length === 0) return;
      if (pts.length === 1) { map.easeTo({ center: pts[0], zoom: 14 }); return; }
      var bounds = pts.reduce(function (b, p) { return b.extend(p); }, new maplibregl.LngLatBounds(pts[0], pts[0]));
      map.fitBounds(bounds, { padding: 40, animate: true });
    };

    window.goSetInteractive = function (on) {
      pendingInteractive = on;
      if (map) applyInteractive();
    };

    window.goSetBaseLayer = function (base) {
      currentBase = base;
      resolveStyle(base).then(function (styleValue) {
        if (map) map.setStyle(cloneStyle(styleValue));
      });
    };

    initMap();
  </script>
</body>
</html>`;
}

const BASE_OPTIONS: { key: MapBaseLayer; label: string; Icon: typeof MapTrifoldIcon }[] = [
  { key: "default", label: "Predeterminado", Icon: MapTrifoldIcon },
  { key: "satellite", label: "Satélite", Icon: PlanetIcon },
  { key: "terrain", label: "Terreno", Icon: MountainsIcon },
];

/** react-native-webview no tiene build para web (Expo Go/dispositivo real sí lo soportan
 * de fábrica) -- sin este corte, en la versión web de la app se veía el texto crudo sin
 * estilo "React Native WebView does not support this platform" en vez de un mapa. En
 * Android/iOS esto no se activa nunca, ahí WebMapView funciona normal. */
function WebMapUnsupportedFallback({ height, style, tokens }: { height: DimensionValue; style?: StyleProp<ViewStyle>; tokens: ThemeTokens }) {
  return (
    <View style={[{ height, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: tokens.surface2, borderRadius: 12, paddingHorizontal: 20 }, style]}>
      <DeviceMobileIcon size={22} color={tokens.textMuted} />
      <Text style={{ fontSize: 12.5, color: tokens.textMuted, textAlign: "center" }}>El mapa en vivo no está disponible en esta vista web.{"\n"}Ábrelo desde la app en tu teléfono.</Text>
    </View>
  );
}

export function WebMapView({
  center,
  zoom = 14,
  markers = [],
  route = null,
  userLocation = null,
  interactive = true,
  fitToMarkers = false,
  onPress,
  onMarkerPress,
  style,
  height = "100%",
  layersControl,
  persistKey,
}: Props) {
  const { isDark, tokens } = useTheme();
  if (Platform.OS === "web") return <WebMapUnsupportedFallback height={height} style={style} tokens={tokens} />;
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>("default");
  const [pickerOpen, setPickerOpen] = useState(false);
  const html = useMemo(() => buildHtml(isDark), [isDark]);
  // Una vez el usuario mueve el mapa a mano (o se restauró una vista guardada), los
  // cambios de `center`/`zoom` que mande el padre (p. ej. un filtro nuevo cambia cuál es
  // la primera tienda del resultado) dejan de pisarle la posición.
  const userMovedRef = useRef(false);
  const [restoreStatus, setRestoreStatus] = useState<"pending" | "done">(persistKey ? "pending" : "done");
  const storageKey = persistKey ? `mapview:${persistKey}` : null;
  const lastViewRef = useRef<{ lng: number; lat: number; zoom: number } | null>(null);

  const run = (js: string) => webRef.current?.injectJavaScript(`${js};true;`);

  const saveView = (view: { lng: number; lat: number; zoom: number; baseLayer: MapBaseLayer }) => {
    if (!storageKey) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(view)).catch(() => {});
  };

  // Restaura la última posición/capa guardada ANTES de dejar que el efecto de abajo
  // aplique el center/zoom que vino por props -- así no hay un salto visible de
  // "centro por defecto" a "centro guardado" apenas se abre el mapa.
  useEffect(() => {
    if (!ready || !storageKey || restoreStatus !== "pending") return;
    let cancelado = false;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (cancelado || !raw) return;
        const v = JSON.parse(raw) as { lng: number; lat: number; zoom: number; baseLayer: MapBaseLayer };
        if (typeof v.lng !== "number" || typeof v.lat !== "number" || typeof v.zoom !== "number") return;
        run(`window.goSetView(${v.lng}, ${v.lat}, ${v.zoom})`);
        if (v.baseLayer) setBaseLayer(v.baseLayer);
        lastViewRef.current = { lng: v.lng, lat: v.lat, zoom: v.zoom };
        userMovedRef.current = true;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelado) setRestoreStatus("done");
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, storageKey, restoreStatus]);

  useEffect(() => {
    if (!ready || restoreStatus !== "done" || userMovedRef.current) return;
    run(`window.goSetView(${center[0]}, ${center[1]}, ${zoom})`);
    lastViewRef.current = { lng: center[0], lat: center[1], zoom };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, restoreStatus, center[0], center[1], zoom]);

  useEffect(() => {
    if (!ready) return;
    run(`window.goSetMarkers(${JSON.stringify(JSON.stringify(markers))})`);
    if (fitToMarkers && markers.length > 0) {
      run(`window.goFitBounds(${JSON.stringify(JSON.stringify(markers.map((m) => m.coordinate)))})`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(markers), fitToMarkers]);

  useEffect(() => {
    if (!ready) return;
    run(`window.goSetRoute(${route ? JSON.stringify(JSON.stringify(route)) : "null"})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(route)]);

  useEffect(() => {
    if (!ready) return;
    run(`window.goSetUserLocation(${userLocation ? JSON.stringify(JSON.stringify(userLocation)) : "null"})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(userLocation)]);

  useEffect(() => {
    if (!ready) return;
    run(`window.goSetInteractive(${interactive ? "true" : "false"})`);
  }, [ready, interactive]);

  useEffect(() => {
    if (!ready) return;
    run(`window.goSetBaseLayer(${JSON.stringify(baseLayer)})`);
  }, [ready, baseLayer]);

  useEffect(() => {
    // Theme toggle rebuilds the whole HTML (default style is baked in via
    // IS_DARK) -- reset to the default base layer so the reload lands on a
    // sensible state instead of silently staying on satellite/terrain with
    // stale markers. Re-arma la restauración de la vista guardada para que la
    // recupere de nuevo en cuanto la nueva instancia del mapa esté lista.
    setBaseLayer("default");
    setReady(false);
    if (persistKey) setRestoreStatus("pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "ready") {
        setReady(true);
      } else if (msg.type === "mapPress" && onPress) {
        onPress(msg.coordinate as Coordinate);
      } else if (msg.type === "markerPress" && onMarkerPress) {
        onMarkerPress(msg.id);
      } else if (msg.type === "moveend") {
        userMovedRef.current = true;
        const [lng, lat] = msg.center as [number, number];
        lastViewRef.current = { lng, lat, zoom: msg.zoom as number };
        saveView({ lng, lat, zoom: msg.zoom as number, baseLayer });
      }
    } catch {
      // mensaje no-JSON del WebView -- se ignora
    }
  };

  return (
    <View style={[{ height }, style]}>
      <WebView
        ref={webRef}
        source={{ html }}
        onMessage={onMessage}
        originWhitelist={["*"]}
        style={{ flex: 1, backgroundColor: "transparent" }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface2 }]}>
            <ActivityIndicator color={tokens.cyan} />
          </View>
        )}
      />
      {!ready && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface2 }]}>
          <ActivityIndicator color={tokens.cyan} />
        </View>
      )}
      {layersControl && ready && (
        <MapLayersPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          baseLayer={baseLayer}
          onBaseLayerChange={(v) => {
            setBaseLayer(v);
            if (lastViewRef.current) saveView({ ...lastViewRef.current, baseLayer: v });
          }}
        />
      )}
    </View>
  );
}

function MapLayersPicker({
  open,
  onOpenChange,
  baseLayer,
  onBaseLayerChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseLayer: MapBaseLayer;
  onBaseLayerChange: (v: MapBaseLayer) => void;
}) {
  const { tokens } = useTheme();

  return (
    <View style={pickerStyles.wrap} pointerEvents="box-none">
      {open && (
        <View style={[pickerStyles.panel, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {BASE_OPTIONS.map((opt) => {
              const active = baseLayer === opt.key;
              const Icon = opt.Icon;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    onBaseLayerChange(opt.key);
                    onOpenChange(false);
                  }}
                  style={[
                    pickerStyles.option,
                    { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface2 },
                  ]}
                >
                  <Icon size={22} weight="fill" color={active ? tokens.cyan : tokens.textSecondary} />
                  <Text style={[pickerStyles.optionLabel, { color: active ? tokens.cyan : tokens.textSecondary }]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <Pressable onPress={() => onOpenChange(!open)} style={[pickerStyles.trigger, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
        <StackIcon size={16} weight="bold" color={tokens.textPrimary} />
      </Pressable>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, top: 12, zIndex: 5 },
  trigger: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  panel: { position: "absolute", top: 48, left: 0, width: 220, borderRadius: 14, borderWidth: 1, padding: 10 },
  option: { flex: 1, height: 64, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", gap: 4 },
  optionLabel: { fontSize: 9.5, fontFamily: "Inter_700Bold", textAlign: "center" },
});

export type { Coordinate };
