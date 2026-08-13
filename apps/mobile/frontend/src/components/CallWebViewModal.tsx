import React from 'react';
import { Modal, View } from 'react-native';
import { WebView } from 'react-native-webview';

const WEB_URL: string = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://192.168.1.63:5173';

export interface CallInfo {
  llamadaId: number;
  tipo: 'voz' | 'video';
  room: string;
}

// Llamadas reales (WebRTC) sin salir de Expo Go: react-native-webrtc requiere
// un development build nativo, así que en su lugar cargamos, dentro de un
// WebView, la misma página de llamada que ya usa el navegador en la web
// (getUserMedia corre de forma nativa dentro del motor del WebView).
export default function CallWebViewModal({ call, nombre, fotoUri, token, onClose }: {
  call: CallInfo;
  nombre: string;
  fotoUri?: string;
  token: string | null;
  onClose: () => void;
}) {
  const url = `${WEB_URL}/call-embed?room=${encodeURIComponent(call.room)}&tipo=${call.tipo}`
    + `&llamadaId=${call.llamadaId}&token=${encodeURIComponent(token ?? '')}`
    + `&nombre=${encodeURIComponent(nombre)}&foto=${encodeURIComponent(fotoUri ?? '')}`;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#0B0F19' }}>
        <WebView
          source={{ uri: url }}
          style={{ flex: 1 }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onMessage={e => {
            try {
              const msg = JSON.parse(e.nativeEvent.data);
              if (msg.type === 'hangup') onClose();
            } catch { /* ignore */ }
          }}
        />
      </View>
    </Modal>
  );
}
