import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MarkerSpec {
  lat: number;
  lng: number;
  color?: string;
}

interface Props {
  lat: number;
  lng: number;
  markers?: MarkerSpec[];
  pickable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  zoom?: number;
}

// Mapa propio: tiles de OpenStreetMap renderizados con Leaflet dentro de un
// WebView. Cero SDKs nativos de mapas (Google/Apple Maps) — 100% Expo Go.
function buildHtml(lat: number, lng: number, markers: MarkerSpec[], pickable: boolean, zoom: number): string {
  const markerJs = markers
    .map(m => `L.circleMarker([${m.lat},${m.lng}],{radius:9,color:'#fff',weight:2,fillColor:'${m.color ?? '#3B82F6'}',fillOpacity:1}).addTo(map);`)
    .join('\n');

  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;background:#0B0F19;}
.leaflet-control-attribution{font-size:9px!important;}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  ${markerJs}
  ${pickable ? `
    var pin = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
    function sendPick(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: lat, lng: lng }));
    }
    pin.on('dragend', function () { var p = pin.getLatLng(); sendPick(p.lat, p.lng); });
    map.on('click', function (e) { pin.setLatLng(e.latlng); sendPick(e.latlng.lat, e.latlng.lng); });
  ` : ''}
</script>
</body></html>`;
}

export default function LeafletMapView({ lat, lng, markers, pickable = false, onPick, zoom = 15 }: Props) {
  const html = buildHtml(lat, lng, markers ?? [{ lat, lng }], pickable, zoom);
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={styles.web}
      javaScriptEnabled
      domStorageEnabled
      onMessage={e => {
        if (!onPick) return;
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'pick') onPick(msg.lat, msg.lng);
        } catch { /* ignore */ }
      }}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#0B0F19' },
});
