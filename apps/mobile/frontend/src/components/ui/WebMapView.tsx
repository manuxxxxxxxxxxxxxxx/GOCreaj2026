import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import type { Coordinate } from "../../lib/mapcn/types";
import { useTheme } from "../../theme/ThemeContext";

/**
 * Mapa real (Leaflet + tiles CARTO) dentro de un WebView, en vez de un módulo
 * nativo compilado (`@maplibre/maplibre-react-native`). Expo Go solo trae los
 * módulos nativos que ya vienen de fábrica con la app -- uno propio como
 * MapLibre nunca va a estar ahí sin compilar un build a la medida. WebView SÍ
 * es uno de esos módulos de fábrica, así que este mapa funciona en Expo Go
 * sin instalar nada aparte, y usa exactamente los mismos tiles que la versión
 * web de SV[Go] (ver apps/web/web/src/components/ui/MapView.tsx).
 */

export interface WebMapMarker {
  id: string | number;
  coordinate: Coordinate;
  color?: string;
  label?: string;
}

export interface WebMapRoute {
  coordinates: Coordinate[];
  color?: string;
  width?: number;
}

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
}

const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function buildHtml(dark: boolean): string {
  const tileUrl = dark ? TILE_DARK : TILE_LIGHT;
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${dark ? "#0f1420" : "#ebeef5"}; }
    .leaflet-control-attribution { font-size: 9px; }
    .go-pin { border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); }
    .go-puck { border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 4px rgba(56,214,255,0.35); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([0, 0], 2);
    L.tileLayer('${tileUrl}', { subdomains: 'abcd', maxZoom: 19 }).addTo(map);

    var markersLayer = L.layerGroup().addTo(map);
    var routeLayer = L.layerGroup().addTo(map);
    var puckLayer = L.layerGroup().addTo(map);

    function post(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }

    map.on('click', function (e) {
      post({ type: 'mapPress', coordinate: [e.latlng.lng, e.latlng.lat] });
    });

    window.goSetView = function (lng, lat, zoom) {
      map.setView([lat, lng], zoom, { animate: true });
    };

    window.goSetMarkers = function (json) {
      var markers = JSON.parse(json);
      markersLayer.clearLayers();
      markers.forEach(function (m) {
        var icon = L.divIcon({
          className: '',
          html: '<div class="go-pin" style="width:18px;height:18px;background:' + m.color + '"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        var marker = L.marker([m.coordinate[1], m.coordinate[0]], { icon: icon }).addTo(markersLayer);
        marker.on('click', function () { post({ type: 'markerPress', id: m.id }); });
      });
    };

    window.goSetRoute = function (json) {
      routeLayer.clearLayers();
      if (!json) return;
      var r = JSON.parse(json);
      var latlngs = r.coordinates.map(function (c) { return [c[1], c[0]]; });
      L.polyline(latlngs, { color: r.color || '#0891b2', weight: r.width || 4, opacity: 0.85 }).addTo(routeLayer);
    };

    window.goSetUserLocation = function (json) {
      puckLayer.clearLayers();
      if (!json) return;
      var c = JSON.parse(json);
      var icon = L.divIcon({
        className: '',
        html: '<div class="go-puck" style="width:16px;height:16px;background:#38d6ff"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([c[1], c[0]], { icon: icon, interactive: false }).addTo(puckLayer);
    };

    window.goFitBounds = function (json) {
      var pts = JSON.parse(json).map(function (c) { return [c[1], c[0]]; });
      if (pts.length === 0) return;
      if (pts.length === 1) { map.setView(pts[0], 14); return; }
      map.fitBounds(pts, { padding: [40, 40] });
    };

    window.goSetInteractive = function (on) {
      if (on) { map.dragging.enable(); map.touchZoom.enable(); map.scrollWheelZoom.enable(); map.doubleClickZoom.enable(); }
      else { map.dragging.disable(); map.touchZoom.disable(); map.scrollWheelZoom.disable(); map.doubleClickZoom.disable(); }
    };

    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

export function WebMapView({ center, zoom = 14, markers = [], route = null, userLocation = null, interactive = true, fitToMarkers = false, onPress, onMarkerPress, style, height = "100%" }: Props) {
  const { isDark, tokens } = useTheme();
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(() => buildHtml(isDark), [isDark]);

  const run = (js: string) => webRef.current?.injectJavaScript(`${js};true;`);

  useEffect(() => {
    if (!ready) return;
    run(`window.goSetView(${center[0]}, ${center[1]}, ${zoom})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, center[0], center[1], zoom]);

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

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "ready") {
        setReady(true);
      } else if (msg.type === "mapPress" && onPress) {
        onPress(msg.coordinate as Coordinate);
      } else if (msg.type === "markerPress" && onMarkerPress) {
        onMarkerPress(msg.id);
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
    </View>
  );
}
