import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export interface MapPin {
  id: number;
  lat: number;
  lng: number;
  precio: number;
  nombre: string;
  tiendaNombre?: string;
}

export interface ExploreMapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  reset: () => void;
}

interface Props {
  pins: MapPin[];
  selectedId: number | null;
  isDark: boolean;
  accent: string;
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  onSelectMarker: (id: number) => void;
}

const SV_LAT = 13.6929;
const SV_LNG = -89.2182;

// Mapa propio (Leaflet + tiles CartoDB) dentro de un WebView — cero SDKs
// nativos de mapas. preferCanvas + keepBuffer + updateWhenZooming:false hacen
// que el pan/zoom se sienta fluido. Los pines se actualizan vía
// injectJavaScript (sin recargar el WebView) para que no haya parpadeo.
function buildBaseHtml(isDark: boolean, accent: string, lat: number, lng: number, zoom: number): string {
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:${isDark ? '#0B0F19' : '#EFF6FF'};}
  .pin{border-radius:18px;padding:5px 12px;font-size:12px;font-weight:800;white-space:nowrap;
    background:${isDark ? '#111827' : '#fff'};color:${accent};border:2px solid ${accent};
    box-shadow:0 3px 12px rgba(0,0,0,0.3);position:relative;transition:transform .15s;}
  .pin.sel{background:${accent};color:#fff;transform:scale(1.15);z-index:9999 !important;}
  .pin i{position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;
    border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${accent};}
  .tip{background:${isDark ? '#111827' : '#fff'} !important;color:${isDark ? '#F1F5F9' : '#0F172A'} !important;
    border:1px solid ${isDark ? '#1E293B' : '#E2E8F0'} !important;border-radius:10px !important;
    font-family:system-ui !important;box-shadow:0 4px 16px rgba(0,0,0,0.2) !important;padding:6px 10px !important;}
  .tip .sub{color:#94A3B8;font-size:11px;}
  .tip::before{display:none !important;}
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', {
    center: [${lat}, ${lng}], zoom: ${zoom},
    zoomControl: false, preferCanvas: true, fadeAnimation: true, zoomAnimation: true
  });
  L.tileLayer('${tileUrl}', {
    subdomains: 'abcd', maxZoom: 19, keepBuffer: 6, updateWhenZooming: false, updateWhenIdle: false
  }).addTo(map);

  var markersById = {};
  function esc(s) { var d = document.createElement('div'); d.innerText = s || ''; return d.innerHTML; }
  function pinIcon(precio, sel) {
    var html = '<div class="pin ' + (sel ? 'sel' : '') + '"><span>$' + Number(precio).toFixed(2) + '</span><i></i></div>';
    return L.divIcon({ className: '', html: html, iconSize: [70, 32], iconAnchor: [35, 38] });
  }
  window.setPins = function (pinsJson) {
    var pins = JSON.parse(pinsJson);
    var seen = {};
    pins.forEach(function (p) {
      seen[p.id] = true;
      if (markersById[p.id]) {
        markersById[p.id].setIcon(pinIcon(p.precio, p.sel));
        markersById[p.id].setLatLng([p.lat, p.lng]);
      } else {
        var m = L.marker([p.lat, p.lng], { icon: pinIcon(p.precio, p.sel) }).addTo(map);
        m.bindTooltip('<strong>' + esc(p.nombre) + '</strong><br/><span class="sub">' + esc(p.tiendaNombre) + '</span>', { direction: 'top', offset: [0, -14], className: 'tip' });
        m.on('click', function () { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id: p.id })); });
        markersById[p.id] = m;
      }
    });
    Object.keys(markersById).forEach(function (id) {
      if (!seen[id]) { map.removeLayer(markersById[id]); delete markersById[id]; }
    });
  };
  window.flyTo = function (lat, lng, zoom) { map.flyTo([lat, lng], zoom || 16, { duration: 0.6 }); };
  window.resetView = function (zoom) { map.flyTo([${SV_LAT}, ${SV_LNG}], zoom || ${zoom}, { duration: 0.6 }); };
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
</script>
</body></html>`;
}

const ExploreMapView = forwardRef<ExploreMapHandle, Props>(function ExploreMapView(
  { pins, selectedId, isDark, accent, initialLat = SV_LAT, initialLng = SV_LNG, initialZoom = 12, onSelectMarker }, ref
) {
  const webRef  = useRef<WebView>(null);
  const ready   = useRef(false);
  const htmlRef = useRef(buildBaseHtml(isDark, accent, initialLat, initialLng, initialZoom));

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 16) => webRef.current?.injectJavaScript(`window.flyTo(${lat}, ${lng}, ${zoom}); true;`),
    reset: () => webRef.current?.injectJavaScript('window.resetView(); true;'),
  }));

  const pushPins = () => {
    const payload = pins.map(p => ({ ...p, sel: p.id === selectedId }));
    webRef.current?.injectJavaScript(`window.setPins(${JSON.stringify(JSON.stringify(payload))}); true;`);
  };

  useEffect(() => {
    if (ready.current) pushPins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, selectedId]);

  return (
    <View style={styles.fill}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: htmlRef.current }}
        style={styles.fill}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        onMessage={e => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'select') onSelectMarker(msg.id);
            if (msg.type === 'ready') { ready.current = true; pushPins(); }
          } catch { /* ignore */ }
        }}
      />
    </View>
  );
});

export default ExploreMapView;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
