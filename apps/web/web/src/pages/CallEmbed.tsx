import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, RotateCw, Volume2, PhoneOff } from 'lucide-react';
import { API_URL, SOCKET_URL } from '../api';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function getParam(name: string): string {
  return new URLSearchParams(window.location.search).get(name) ?? '';
}

function postToNative(msg: Record<string, unknown>) {
  const w = window as unknown as { ReactNativeWebView?: { postMessage: (s: string) => void } };
  w.ReactNativeWebView?.postMessage(JSON.stringify(msg));
}

function formatDuration(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Página mínima de llamada, pensada para cargarse dentro de un WebView ──────
// nativo (Expo Go no soporta react-native-webrtc). Reutiliza la señalización de
// apps/socket y la lógica WebRTC ya probada en Chat.tsx, sin sidebar ni layout.
export default function CallEmbed() {
  const room      = getParam('room');
  const tipo      = getParam('tipo') === 'video' ? 'video' : 'voz';
  const llamadaId = getParam('llamadaId');
  const token     = getParam('token');
  const nombre    = getParam('nombre') || 'Contacto';
  const foto      = getParam('foto');

  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [muted, setMuted]         = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [facing, setFacing]       = useState<'user' | 'environment'>('user');
  const [status, setStatus]       = useState('Conectando…');

  const socketRef       = useRef<Socket | null>(null);
  const pcRef            = useRef<RTCPeerConnection | null>(null);
  const localStreamRef   = useRef<MediaStream | null>(null);
  const pendingCandidates= useRef<RTCIceCandidateInit[]>([]);
  const remoteAudioRef   = useRef<HTMLAudioElement>(null);
  const remoteVideoRef   = useRef<HTMLVideoElement>(null);
  const localVideoRef    = useRef<HTMLVideoElement>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef         = useRef(false);

  const finalizar = useCallback(async (duracion: number) => {
    if (!llamadaId) return;
    try {
      await fetch(`${API_URL}/chat_multi.php?action=finalizar_llamada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ llamada_id: Number(llamadaId), duracion }),
      });
    } catch { /* best effort */ }
  }, [llamadaId, token]);

  const endCall = useCallback((notifyPeer: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (notifyPeer) socketRef.current?.emit('hang-up', { room });
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    void finalizar(elapsed);
    postToNative({ type: 'hangup' });
  }, [room, elapsed, finalizar]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: tipo === 'video' });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        setStatus('No se pudo acceder al micrófono/cámara');
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));

      pc.onicecandidate = e => {
        if (e.candidate) socketRef.current?.emit('ice-candidate', { room, candidate: e.candidate });
      };
      pc.ontrack = e => {
        if (tipo === 'video' && remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') { setConnected(true); setStatus('En llamada'); }
        else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') endCall(false);
      };

      const socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1500 });
      socketRef.current = socket;

      socket.on('peer-joined', async ({ socketId }: { socketId: string }) => {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: tipo === 'video' });
          await pc.setLocalDescription(offer);
          socket.emit('offer', { room, sdp: offer, to: socketId });
        } catch { /* ignore */ }
      });

      socket.on('offer', async ({ sdp, from }: { sdp: RTCSessionDescriptionInit; from: string }) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { room, sdp: answer, to: from });
          for (const c of pendingCandidates.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ } }
          pendingCandidates.current = [];
        } catch { /* ignore */ }
      });

      socket.on('answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          for (const c of pendingCandidates.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ } }
          pendingCandidates.current = [];
        } catch { /* ignore */ }
      });

      socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (pc.remoteDescription) { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ } }
        else pendingCandidates.current.push(candidate);
      });

      socket.on('peer-left', () => endCall(false));

      socket.emit('join-call', { room, userId: 'mobile-' + Date.now() });
    }

    void start();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, tipo]);

  useEffect(() => {
    if (connected) timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connected]);

  const toggleMute = () => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMuted(next);
  };

  const toggleSpeaker = async () => {
    const next = !speakerOn;
    if (remoteAudioRef.current && 'setSinkId' in remoteAudioRef.current) {
      try {
        if (next) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const speaker = devices.find(d => d.kind === 'audiooutput' && d.deviceId !== 'default');
          if (speaker) await (remoteAudioRef.current as any).setSinkId(speaker.deviceId);
        } else {
          await (remoteAudioRef.current as any).setSinkId('default');
        }
      } catch { /* setSinkId no disponible en este WebView */ }
    }
    setSpeakerOn(next);
  };

  const toggleCamera = async () => {
    if (tipo !== 'video') return;
    const nextFacing = facing === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing }, audio: false });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);

      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      oldTrack?.stop();
      if (localStreamRef.current) {
        if (oldTrack) localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(newTrack);
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setFacing(nextFacing);
    } catch { /* algunos dispositivos solo tienen una cámara */ }
  };

  return (
    <div style={S.page}>
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      {tipo === 'video' && (
        <div style={S.videoLayer}>
          <video ref={remoteVideoRef} autoPlay playsInline style={S.remoteVideo} />
          <video ref={localVideoRef} autoPlay playsInline muted style={S.localVideo} />
        </div>
      )}

      <div style={S.card}>
        <div style={{ ...S.ring, borderColor: connected ? '#22C55E' : '#3B82F6' }}>
          <div style={S.avatar}>
            {foto ? <img src={foto} alt="" style={S.avatarImg} /> : <span style={S.avatarTxt}>{getInitials(nombre)}</span>}
          </div>
        </div>
        <div style={S.name}>{nombre}</div>
        <div style={{ ...S.statusPill, background: connected ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)', color: connected ? '#22C55E' : '#3B82F6' }}>
          {connected ? formatDuration(elapsed) : status}
        </div>

        <div style={S.controls}>
          <button onClick={toggleMute} style={{ ...S.ctrlBtn, background: muted ? '#EF4444' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Micrófono">
            {muted ? <MicOff size={20} strokeWidth={2} /> : <Mic size={20} strokeWidth={2} />}
          </button>
          {tipo === 'video' && (
            <button onClick={() => void toggleCamera()} style={{ ...S.ctrlBtn, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cambiar cámara">
              <RotateCw size={20} strokeWidth={2} />
            </button>
          )}
          <button onClick={() => void toggleSpeaker()} style={{ ...S.ctrlBtn, background: speakerOn ? '#3B82F6' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Altavoz">
            <Volume2 size={20} strokeWidth={2} />
          </button>
          <button onClick={() => endCall(true)} style={{ ...S.hangupBtn, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Colgar"><PhoneOff size={20} strokeWidth={2} /></button>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:        { position: 'fixed', inset: 0, background: '#0B0F19', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,-apple-system,sans-serif', overflow: 'hidden' },
  videoLayer:  { position: 'absolute', inset: 0 },
  remoteVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  localVideo:  { position: 'absolute', bottom: 100, right: 16, width: 100, height: 140, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' },
  card:        { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24, zIndex: 2 },
  ring:        { width: 116, height: 116, borderRadius: 58, border: '3px solid #3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatar:      { width: 96, height: 96, borderRadius: 48, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:   { width: '100%', height: '100%', objectFit: 'cover' },
  avatarTxt:   { color: '#FFF', fontSize: 34, fontWeight: 800 },
  name:        { fontSize: 24, fontWeight: 800, color: '#F1F5F9' },
  statusPill:  { padding: '6px 16px', borderRadius: 20, fontSize: 14, fontWeight: 700 },
  controls:    { display: 'flex', gap: 24, marginTop: 24 },
  ctrlBtn:     { width: 56, height: 56, borderRadius: 28, border: 'none', fontSize: 22, cursor: 'pointer' },
  hangupBtn:   { width: 64, height: 64, borderRadius: 32, border: 'none', background: '#EF4444', fontSize: 24, cursor: 'pointer', transform: 'rotate(135deg)' },
};
