import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGlobal } from "../context/GlobalContext";
import Header from '../components/Header';
import { api } from '../api';
import '../../css/Chat.css';

type ChatTab = 'todos' | 'noLeidos' | 'favoritos' | 'archivados';

const SIGNAL_URL  = 'http://localhost:3001';
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface ReplySnap {
  id: number;
  mensaje: string;
  tipo?: string;
  emisor_id: number;
  adjunto?: string | null;
}

interface Message {
  id: number;
  emisor_id: number;
  receptor_id: number;
  mensaje: string;
  tipo?: 'texto' | 'imagen' | 'ubicacion';
  adjunto?: string | null;
  lat?: number | null;
  lng?: number | null;
  leido: number;
  created_at: string;
  reply_to_id?: number | null;
  reply_snapshot?: ReplySnap | null;
}

interface Contact {
  id: number;
  nombre: string;
  username?: string | null;
  foto_perfil?: string | null;
  rol: string;
  en_linea?: number;
  no_leidos?: number;
  archivado?: number;
  favorito?: number;
  ultimo_mensaje?: { mensaje: string; tipo?: string; adjunto?: string | null; created_at: string } | null;
}

interface ActiveCall {
  llamadaId: number;
  tipo: 'voz' | 'video';
  elapsed: number;
  room: string;
  connected: boolean;
}

interface IncomingCall {
  llamadaId: number;
  tipo: 'voz' | 'video';
  room: string;
  nombre: string;
  foto_perfil?: string | null;
  emisor_id: number;
  sdp?: RTCSessionDescriptionInit;
  fromSocketId?: string;
}

const API_BASE = 'http://localhost/GOCreaj2026/apps/mobile/backend';

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  const m = path.match(/\/uploads\/(.+)$/);
  if (m) return `${API_BASE}/uploads/${m[1]}`;
  if (path.startsWith('http')) return path;
  return `${API_BASE}/uploads/${path}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Ayer';
  return d.toLocaleDateString('es-SV', { day: '2-digit', month: 'short' });
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const ROLE_COLOR: Record<string, string> = {
  vendedor: '#4A6D8C', repartidor: '#27AE8F', comprador: '#8E44AD', admin: '#C0392B',
};

function formatDuration(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ─── ReplyCard ─────────────────────────────────────────────────────────────────

function ReplyCard({ snap, mine }: { snap: ReplySnap; mine: boolean }) {
  const isImg  = snap.tipo === 'imagen';
  const preview = isImg ? '📷 Imagen' : (snap.mensaje ?? '').slice(0, 80);
  return (
    <div style={{ borderLeft: '3px solid #3B82F6', padding: '5px 8px', marginBottom: 6, background: mine ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.06)', borderRadius: '0 6px 6px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
      {isImg && snap.adjunto && (
        <img src={imgUri(snap.adjunto)} alt="" style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
      )}
      <span style={{ fontSize: 12, color: mine ? 'rgba(255,255,255,0.65)' : '#94A3B8', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
        {preview}
      </span>
    </div>
  );
}

// ─── ReplyBar ──────────────────────────────────────────────────────────────────

function ReplyBar({ target, onCancel }: { target: Message; onCancel: () => void }) {
  const preview = target.tipo === 'imagen' ? '📷 Imagen' : target.mensaje.slice(0, 70);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0F172A', borderTop: '1px solid #334155', borderLeft: '3px solid #3B82F6', padding: '8px 16px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700, marginBottom: 2 }}>Respondiendo a</div>
        <div style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
      </div>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}>✕</button>
    </div>
  );
}

// ─── LocationMsg ───────────────────────────────────────────────────────────────

function LocationMsg({ lat, lng, mine }: { lat: number | null | undefined; lng: number | null | undefined; mine: boolean }) {
  const [mapErr, setMapErr] = useState(false);
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!numLat || !numLng) return <span style={{ fontSize: 14 }}>📍 Ubicación</span>;
  const mapUrl  = `https://staticmap.openstreetmap.de/staticmap.php?center=${numLat},${numLng}&zoom=14&size=220x100&markers=${numLat},${numLng},red`;
  const mapsUrl = `https://www.google.com/maps?q=${numLat},${numLng}`;
  return (
    <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', width: 220 }}>
        {!mapErr
          ? <img src={mapUrl} alt="Mapa" style={{ width: 220, height: 100, objectFit: 'cover', display: 'block' }} onError={() => setMapErr(true)} />
          : <div style={{ width: 220, height: 100, background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🗺️</div>
        }
        <div style={{ background: mine ? 'rgba(0,0,0,0.25)' : '#1E293B', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>📍</span>
          <span style={{ fontSize: 12, color: mine ? 'rgba(255,255,255,0.8)' : '#94A3B8' }}>
            {numLat.toFixed(4)}, {numLng.toFixed(4)} →
          </span>
        </div>
      </div>
    </a>
  );
}

// ─── Active Call Modal ─────────────────────────────────────────────────────────

function ActiveCallModal({ call, contacto, onHangup }: {
  call: ActiveCall;
  contacto: Contact | null;
  onHangup: () => void;
}) {
  const name  = contacto?.nombre ?? 'Desconocido';
  const color = contacto ? (ROLE_COLOR[contacto.rol] ?? '#3B82F6') : '#3B82F6';
  return (
    <div style={S.callOverlay}>
      <div style={S.callCard}>
        <div style={{ ...S.callAvatarRing, borderColor: call.connected ? '#22C55E' : '#3B82F6' }}>
          <div style={{ ...S.callAvatar, background: color }}>
            {imgUri(contacto?.foto_perfil)
              ? <img src={imgUri(contacto?.foto_perfil)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : <span style={S.callAvatarTxt}>{getInitials(name)}</span>
            }
          </div>
        </div>
        <div style={S.callName}>{name}</div>
        <div style={S.callStatus}>
          {call.connected
            ? formatDuration(call.elapsed)
            : call.tipo === 'video' ? 'Videollamada...' : 'Llamando...'
          }
        </div>
        {!call.connected && <div style={S.callWait}>Esperando respuesta...</div>}
        <button style={S.hangupBtn} onClick={onHangup}><span style={{ fontSize: 24 }}>📞</span></button>
        <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>Colgar</div>
      </div>
    </div>
  );
}

// ─── Incoming Call Modal ───────────────────────────────────────────────────────

function IncomingCallModal({ call, onAccept, onReject }: {
  call: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div style={S.callOverlay}>
      <div style={S.callCard}>
        <div style={{ ...S.callAvatarRing, borderColor: '#22C55E' }}>
          <div style={{ ...S.callAvatar, background: '#4A6D8C' }}>
            {call.foto_perfil
              ? <img src={imgUri(call.foto_perfil)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : <span style={S.callAvatarTxt}>{getInitials(call.nombre)}</span>
            }
          </div>
        </div>
        <div style={S.callName}>{call.nombre}</div>
        <div style={S.callStatus}>{call.tipo === 'video' ? '📹 Videollamada entrante' : '📞 Llamada entrante'}</div>
        <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button style={{ ...S.hangupBtn, background: '#EF4444' }} onClick={onReject}>
              <span style={{ fontSize: 24 }}>📞</span>
            </button>
            <div style={{ color: '#64748B', fontSize: 12 }}>Rechazar</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button style={{ ...S.hangupBtn, background: '#22C55E' }} onClick={onAccept}>
              <span style={{ fontSize: 24 }}>📞</span>
            </button>
            <div style={{ color: '#64748B', fontSize: 12 }}>Aceptar</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Chat() {
  const { user } = useGlobal();

  const [contacts, setContacts]           = useState<Contact[]>([]);
  const [selected, setSelected]           = useState<Contact | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [msgInput, setMsgInput]           = useState('');
  const [tab, setTab]                     = useState<ChatTab>('todos');
  const [search, setSearch]               = useState('');
  const [totalUnread, setTotalUnread]     = useState(0);
  const [sending, setSending]             = useState(false);
  const [activeCall, setActiveCall]       = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall]   = useState<IncomingCall | null>(null);
  const [replyTarget, setReplyTarget]     = useState<Message | null>(null);
  const [imgFullscreen, setImgFullscreen] = useState<string | null>(null);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const callPollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef        = useRef<Socket | null>(null);
  const pcRef            = useRef<RTCPeerConnection | null>(null);
  const localStreamRef   = useRef<MediaStream | null>(null);
  const remoteAudioRef   = useRef<HTMLAudioElement>(null);
  const pendingCandidates= useRef<RTCIceCandidateInit[]>([]);

  const scrollBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── WebRTC helpers ──────────────────────────────────────────────────────────

  const closePeerConnection = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pendingCandidates.current = [];
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  };

  const createPeerConnection = useCallback((room: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = e => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { room, candidate: e.candidate });
      }
    };

    pc.ontrack = e => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setActiveCall(c => c ? { ...c, connected: true } : c);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        closeCallCleanup();
      }
    };

    return pc;
  }, []);

  const addPendingCandidates = async (pc: RTCPeerConnection) => {
    for (const c of pendingCandidates.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidates.current = [];
  };

  const closeCallCleanup = useCallback(async () => {
    closePeerConnection();
    setActiveCall(null);
    setIncomingCall(null);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
  }, []);

  // ── Socket.io setup ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(SIGNAL_URL, { reconnection: true, reconnectionDelay: 2000 });
    socketRef.current = socket;

    socket.on('peer-joined', async ({ socketId }: { socketId: string }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        socket.emit('offer', { room: pc.localDescription?.sdp ? (pcRef.current as RTCPeerConnection & { _room?: string })._room ?? '' : '', sdp: offer, to: socketId });
      } catch (e) { console.warn('[webrtc] offer error', e); }
    });

    socket.on('offer', async ({ sdp, from }: { sdp: RTCSessionDescriptionInit; from: string }) => {
      // Update incoming call state with the SDP (callee receives offer when they join the room)
      setIncomingCall(ic => ic ? { ...ic, sdp, fromSocketId: from } : ic);
    });

    socket.on('answer', async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      try { await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp)); } catch {}
      await addPendingCandidates(pcRef.current!);
    });

    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      } else {
        pendingCandidates.current.push(candidate);
      }
    });

    socket.on('peer-left', () => {
      closeCallCleanup();
    });

    return () => { socket.disconnect(); };
  }, [user?.id, closeCallCleanup]);

  // ── Incoming call polling (DB-based) ────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    callPollRef.current = setInterval(async () => {
      if (activeCall || incomingCall) return;
      try {
        const res = await api.get('/chat_multi.php?action=llamadas_entrantes');
        const ll = res.data.llamada;
        if (ll) {
          setIncomingCall({
            llamadaId: ll.id,
            tipo: ll.tipo ?? 'voz',
            room: ll.webrtc_room,
            nombre: ll.nombre,
            foto_perfil: ll.foto_perfil ?? null,
            emisor_id: ll.emisor_id,
          });
        }
      } catch {}
    }, 4000);
    return () => { if (callPollRef.current) clearInterval(callPollRef.current); };
  }, [user?.id, activeCall, incomingCall]);

  // ── Call timer ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeCall?.connected) {
      callTimerRef.current = setInterval(() => setActiveCall(c => c ? { ...c, elapsed: c.elapsed + 1 } : c), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [activeCall?.connected]);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchContacts = useCallback(async (t = tab, q = search) => {
    try {
      const res = await api.get(`/chat_multi.php?action=conversaciones&tab=${t}&q=${encodeURIComponent(q)}`);
      if (res.data.ok) {
        setContacts(res.data.conversaciones ?? []);
        setTotalUnread(res.data.total_no_leidos ?? 0);
      }
    } catch {}
  }, [tab, search]);

  const fetchMessages = useCallback(async (otroId: number) => {
    try {
      const res = await api.get(`/chat_multi.php?action=mensajes&otro_id=${otroId}`);
      if (res.data.ok) { setMessages(res.data.mensajes ?? []); scrollBottom(); }
    } catch {}
  }, []);

  useEffect(() => { void fetchContacts(tab, search); }, [tab, search]);

  useEffect(() => {
    if (!selected) return;
    void fetchMessages(selected.id);
    pollRef.current = setInterval(() => void fetchMessages(selected.id), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, fetchMessages]);

  useEffect(() => { scrollBottom(); }, [messages]);

  // ── Call actions ────────────────────────────────────────────────────────────

  const initCall = async (tipo: 'voz' | 'video') => {
    if (!selected) return;
    try {
      const res = await api.post('/chat_multi.php?action=iniciar_llamada', { receptor_id: selected.id, tipo });
      if (!res.data.ok) return;
      const room = res.data.room as string;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null);
      const pc = createPeerConnection(room);
      (pc as RTCPeerConnection & { _room?: string })._room = room;
      if (stream) {
        localStreamRef.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
      }

      socketRef.current?.emit('join-call', { room, userId: user?.id });
      setActiveCall({ llamadaId: res.data.llamada_id, tipo, elapsed: 0, room, connected: false });
    } catch (e) { console.warn('[call] initCall error', e); }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      await api.post('/chat_multi.php?action=responder_llamada', { llamada_id: incomingCall.llamadaId, aceptar: true });
      const room = incomingCall.room;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null);
      const pc = createPeerConnection(room);
      (pc as RTCPeerConnection & { _room?: string })._room = room;
      if (stream) {
        localStreamRef.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
      }

      socketRef.current?.emit('join-call', { room, userId: user?.id });
      setActiveCall({ llamadaId: incomingCall.llamadaId, tipo: incomingCall.tipo, elapsed: 0, room, connected: false });
      setIncomingCall(null);

      // If offer already received, answer it
      if (incomingCall.sdp && incomingCall.fromSocketId) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit('answer', { room, sdp: answer, to: incomingCall.fromSocketId });
        await addPendingCandidates(pc);
      }
    } catch (e) { console.warn('[call] acceptCall error', e); }
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    await api.post('/chat_multi.php?action=responder_llamada', { llamada_id: incomingCall.llamadaId, aceptar: false }).catch(() => {});
    setIncomingCall(null);
  };

  const hangup = async () => {
    if (!activeCall) return;
    socketRef.current?.emit('hang-up', { room: activeCall.room });
    await api.post('/chat_multi.php?action=finalizar_llamada', { llamada_id: activeCall.llamadaId, duracion: activeCall.elapsed }).catch(() => {});
    closeCallCleanup();
  };

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!msgInput.trim() || !selected) return;
    const text = msgInput.trim();
    setMsgInput('');
    setSending(true);
    try {
      const body: Record<string, unknown> = { receptor_id: selected.id, mensaje: text };
      if (replyTarget) {
        body.reply_to_id = replyTarget.id;
        body.reply_snapshot = { id: replyTarget.id, mensaje: replyTarget.mensaje, tipo: replyTarget.tipo, emisor_id: replyTarget.emisor_id, adjunto: replyTarget.adjunto ?? null };
        setReplyTarget(null);
      }
      await api.post('/chat_multi.php?action=enviar', body);
      void fetchMessages(selected.id);
      void fetchContacts(tab, search);
    } finally { setSending(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async () => {
      setSending(true);
      try {
        await api.post('/chat_multi.php?action=enviar', { receptor_id: selected.id, tipo: 'imagen', mensaje: '📷 Imagen', adjunto: reader.result });
        void fetchMessages(selected.id);
        void fetchContacts(tab, search);
      } finally { setSending(false); }
    };
    reader.readAsDataURL(file);
  };

  const shareLocation = () => {
    if (!selected) return;
    if (!navigator.geolocation) { alert('Geolocalización no disponible.'); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      setSending(true);
      try {
        await api.post('/chat_multi.php?action=enviar', { receptor_id: selected.id, tipo: 'ubicacion', mensaje: '📍 Ubicación compartida', lat: pos.coords.latitude, lng: pos.coords.longitude });
        void fetchMessages(selected.id);
        void fetchContacts(tab, search);
      } finally { setSending(false); }
    }, () => alert('No se pudo obtener tu ubicación.'));
  };

  const toggleArchivado = async (c: Contact) => {
    await api.post('/chat_multi.php?action=toggle_archivado', { otro_id: c.id });
    void fetchContacts(tab, search);
  };

  const toggleFavorito = async (c: Contact) => {
    await api.post('/chat_multi.php?action=toggle_favorito', { otro_id: c.id });
    void fetchContacts(tab, search);
  };

  const TABS: { key: ChatTab; label: string }[] = [
    { key: 'todos', label: 'Todos' }, { key: 'noLeidos', label: 'No leídos' },
    { key: 'favoritos', label: 'Favoritos' }, { key: 'archivados', label: 'Archivados' },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <Header activeTab="chat" />

      {/* Hidden audio element for remote WebRTC stream */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      {activeCall && (
        <ActiveCallModal call={activeCall} contacto={selected} onHangup={() => void hangup()} />
      )}
      {incomingCall && !activeCall && (
        <IncomingCallModal call={incomingCall} onAccept={() => void acceptCall()} onReject={() => void rejectCall()} />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

      {imgFullscreen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }} onClick={() => setImgFullscreen(null)}>
          <img src={imgFullscreen} alt="" style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 12, objectFit: 'contain' }} />
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', borderRadius: 20, width: 36, height: 36, cursor: 'pointer', fontSize: 18 }} onClick={() => setImgFullscreen(null)}>✕</button>
        </div>
      )}

      <div style={S.layout}>
        {/* ── Sidebar ── */}
        <aside style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <div>
              <div style={S.sidebarTitle}>Mensajes</div>
              {totalUnread > 0 && <div style={S.sidebarSub}>{totalUnread} sin leer</div>}
            </div>
            <button style={S.iconBtn} title="Nuevo chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
          </div>

          <div style={S.searchWrap}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" width="14" height="14" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input style={S.searchInput} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={S.tabRow}>
            {TABS.map(t => (
              <button key={t.key} style={{ ...S.tabBtn, ...(tab === t.key ? S.tabBtnActive : {}) }} onClick={() => setTab(t.key)}>
                {t.label}
                {t.key === 'noLeidos' && totalUnread > 0 && <span style={S.tabBadge}>{totalUnread > 99 ? '99+' : totalUnread}</span>}
              </button>
            ))}
          </div>

          <div style={S.contactList}>
            {contacts.length === 0 && (
              <div style={S.emptyList}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
                <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 15 }}>
                  {tab === 'noLeidos' ? 'Todo leído ✓' : tab === 'favoritos' ? 'Sin favoritos' : tab === 'archivados' ? 'Sin archivados' : 'Sin conversaciones'}
                </div>
              </div>
            )}
            {contacts.map(c => {
              const color    = ROLE_COLOR[c.rol] ?? '#4A6D8C';
              const uri      = imgUri(c.foto_perfil);
              const isActive = selected?.id === c.id;
              const unread   = c.no_leidos ?? 0;
              const lastMsg  = c.ultimo_mensaje?.tipo === 'imagen' ? '📷 Imagen'
                             : c.ultimo_mensaje?.tipo === 'ubicacion' ? '📍 Ubicación'
                             : (c.ultimo_mensaje?.mensaje ?? 'Iniciar conversación');
              return (
                <div
                  key={c.id}
                  style={{ ...S.contactItem, ...(isActive ? S.contactItemActive : {}) }}
                  onClick={() => setSelected(c)}
                  className="contact-item"
                  onContextMenu={e => { e.preventDefault(); if (window.confirm(`¿${c.favorito ? 'Quitar favorito' : 'Agregar favorito'} a ${c.nombre}?`)) toggleFavorito(c); }}
                >
                  <div style={{ ...S.contactAvatar, background: color }}>
                    {uri ? <img src={uri} alt="" style={S.avatarImg} /> : getInitials(c.nombre)}
                    {c.en_linea === 1 && <span style={S.onlineDot} />}
                  </div>
                  <div style={S.contactInfo}>
                    <div style={S.contactTop}>
                      <span style={{ ...S.contactName, fontWeight: unread > 0 ? 800 : 600 }}>
                        {c.nombre}{c.favorito ? ' ★' : ''}
                      </span>
                      <span style={{ ...S.contactTime, color: unread > 0 ? '#3B82F6' : '#475569' }}>
                        {c.ultimo_mensaje ? formatTime(c.ultimo_mensaje.created_at) : ''}
                      </span>
                    </div>
                    <div style={S.contactBot}>
                      <span style={{ ...S.contactPreview, fontWeight: unread > 0 ? 600 : 400 }} title={lastMsg}>{lastMsg}</span>
                      {unread > 0 && <span style={S.unreadBadge}>{unread > 99 ? '99+' : unread}</span>}
                    </div>
                  </div>
                  <div style={S.hoverActions} className="hover-actions">
                    <button style={S.hoverBtn} onClick={e => { e.stopPropagation(); toggleFavorito(c); }} title={c.favorito ? 'Quitar' : 'Favorito'}>{c.favorito ? '★' : '☆'}</button>
                    <button style={S.hoverBtn} onClick={e => { e.stopPropagation(); toggleArchivado(c); }} title={c.archivado ? 'Desarchivar' : 'Archivar'}>{c.archivado ? '📂' : '🗂'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Chat Main ── */}
        <main style={S.chatMain}>
          {selected ? (
            <div style={S.chatWindow}>
              <div style={S.chatHeader}>
                <div style={{ ...S.headerAvatar, background: ROLE_COLOR[selected.rol] ?? '#4A6D8C' }}>
                  {imgUri(selected.foto_perfil) ? <img src={imgUri(selected.foto_perfil)} alt="" style={S.avatarImg} /> : getInitials(selected.nombre)}
                  {selected.en_linea === 1 && <span style={S.onlineDot} />}
                </div>
                <div style={S.headerMeta}>
                  <div style={S.headerName}>
                    {selected.nombre}
                    <span style={{ ...S.rolePill, background: `${ROLE_COLOR[selected.rol] ?? '#4A6D8C'}22`, color: ROLE_COLOR[selected.rol] ?? '#4A6D8C' }}>{selected.rol}</span>
                  </div>
                  {selected.en_linea === 1
                    ? <div style={{ color: '#22C55E', fontSize: 12, fontWeight: 600 }}>En línea</div>
                    : <div style={{ color: '#475569', fontSize: 12 }}>Fuera de línea</div>
                  }
                </div>
                <div style={S.headerActions}>
                  <button style={S.headerBtn} title="Llamada de voz" onClick={() => void initCall('voz')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17z"/>
                    </svg>
                  </button>
                  <button style={S.headerBtn} title="Videollamada" onClick={() => void initCall('video')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </button>
                  <button style={S.headerBtn} title={selected.favorito ? 'Quitar favorito' : 'Marcar favorito'} onClick={() => toggleFavorito(selected)}>
                    <span style={{ fontSize: 16 }}>{selected.favorito ? '★' : '☆'}</span>
                  </button>
                  <button style={S.headerBtn} title={selected.archivado ? 'Desarchivar' : 'Archivar'} onClick={() => toggleArchivado(selected)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
                      <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div style={S.messagesArea}>
                <div style={S.dateSep}>Conversación</div>
                {messages.map(m => {
                  const mine    = m.emisor_id === Number(user?.id);
                  const tipo    = m.tipo ?? 'texto';
                  const isMedia = tipo === 'imagen' || tipo === 'ubicacion';
                  return (
                    <div
                      key={m.id}
                      style={{ ...S.msgRow, justifyContent: mine ? 'flex-end' : 'flex-start' }}
                      onContextMenu={e => { e.preventDefault(); setReplyTarget(m); }}
                      title="Clic derecho para responder"
                    >
                      <div style={S.bubbleWrap}>
                        <div style={{
                          ...S.bubble,
                          background: mine ? 'linear-gradient(135deg,#4f6ef7,#7c3aed)' : '#1E293B',
                          color: mine ? '#FFF' : '#F1F5F9',
                          borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          padding: isMedia ? 4 : '10px 14px',
                        }}>
                          {m.reply_snapshot && (
                            <div style={{ padding: isMedia ? '6px 6px 2px' : '0 0 6px' }}>
                              <ReplyCard snap={m.reply_snapshot} mine={mine} />
                            </div>
                          )}
                          {tipo === 'imagen' && m.adjunto ? (
                            <img
                              src={imgUri(m.adjunto)} alt="Imagen"
                              style={{ width: 230, maxHeight: 200, objectFit: 'cover', borderRadius: 14, display: 'block', cursor: 'zoom-in' }}
                              onClick={() => { const u = imgUri(m.adjunto); if (u) setImgFullscreen(u); }}
                            />
                          ) : tipo === 'ubicacion' ? (
                            <LocationMsg lat={m.lat} lng={m.lng} mine={mine} />
                          ) : (
                            <span style={{ lineHeight: 1.5 }}>{m.mensaje}</span>
                          )}
                        </div>
                        <div style={{ ...S.msgMeta, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                          <span>{formatTime(m.created_at)}</span>
                          {mine && <span style={{ color: m.leido ? '#3B82F6' : '#475569', marginLeft: 4 }}>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {replyTarget && <ReplyBar target={replyTarget} onCancel={() => setReplyTarget(null)} />}

              <div style={S.inputBar}>
                <form style={S.inputForm} onSubmit={handleSend}>
                  <button type="button" style={S.barBtn} title="Adjuntar imagen" onClick={() => fileInputRef.current?.click()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </button>
                  <button type="button" style={S.barBtn} title="Compartir ubicación" onClick={shareLocation}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </button>
                  <textarea
                    style={S.textArea}
                    placeholder="Escribe un mensaje... (clic derecho en mensaje para responder)"
                    rows={1} value={msgInput} disabled={sending}
                    onChange={e => { setMsgInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); (e.target as HTMLTextAreaElement).style.height = 'auto'; } }}
                  />
                  <button
                    type="submit" disabled={sending || !msgInput.trim()}
                    style={{ ...S.sendBtn, background: msgInput.trim() ? 'linear-gradient(135deg,#4f6ef7,#7c3aed)' : '#1E293B', color: msgInput.trim() ? '#FFF' : '#475569', cursor: msgInput.trim() ? 'pointer' : 'default', transform: msgInput.trim() ? 'scale(1)' : 'scale(0.9)', boxShadow: msgInput.trim() ? '0 4px 14px rgba(79,110,247,0.4)' : 'none' }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div style={S.emptyMain}>
              <div style={S.emptyIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" width="52" height="52">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={S.emptyTitle}>Tus mensajes</div>
              <div style={S.emptySub}>Selecciona una conversación para empezar.</div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .hover-actions { opacity: 0; transition: opacity 0.15s; }
        .contact-item:hover .hover-actions { opacity: 1; }
        .contact-item:hover { background: #0F172A !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 4px; }
        textarea { resize: none; outline: none; }
        button { cursor: pointer; border: none; outline: none; }
      `}</style>
    </div>
  );
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:   { display: 'flex', flexDirection: 'column', height: '100vh', background: '#020817', fontFamily: 'system-ui,-apple-system,sans-serif' },
  layout: { display: 'flex', flex: 1, overflow: 'hidden' },

  sidebar:          { width: 320, minWidth: 260, display: 'flex', flexDirection: 'column', background: '#0A0F1E', borderRight: '1px solid #1E293B' },
  sidebarHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 12px', borderBottom: '1px solid #1E293B' },
  sidebarTitle:     { fontSize: 20, fontWeight: 900, color: '#F1F5F9', letterSpacing: -0.5 },
  sidebarSub:       { fontSize: 12, color: '#3B82F6', fontWeight: 600, marginTop: 2 },
  iconBtn:          { width: 36, height: 36, borderRadius: 18, background: '#1E293B', color: '#94A3B8', display: 'grid', placeItems: 'center', cursor: 'pointer' },
  searchWrap:       { display: 'flex', alignItems: 'center', gap: 8, margin: '10px 12px', background: '#1E293B', borderRadius: 10, padding: '8px 12px' },
  searchInput:      { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#F1F5F9', fontSize: 14, fontWeight: 500 },
  tabRow:           { display: 'flex', overflowX: 'auto', borderBottom: '1px solid #1E293B', padding: '0 4px' },
  tabBtn:           { flexShrink: 0, padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#475569', background: 'none', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 },
  tabBtnActive:     { color: '#3B82F6', borderBottomColor: '#3B82F6' },
  tabBadge:         { background: '#3B82F6', color: '#FFF', fontSize: 10, fontWeight: 900, borderRadius: 9, padding: '1px 5px' },
  contactList:      { flex: 1, overflowY: 'auto' },
  emptyList:        { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, color: '#475569' },
  contactItem:      { display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid #0F172A', position: 'relative', gap: 10 },
  contactItemActive:{ background: '#0F172A' },
  contactAvatar:    { width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#FFF', flexShrink: 0, position: 'relative', overflow: 'hidden' },
  avatarImg:        { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
  onlineDot:        { width: 10, height: 10, borderRadius: 5, background: '#22C55E', position: 'absolute', bottom: 1, right: 1, border: '2px solid #0A0F1E' },
  contactInfo:      { flex: 1, minWidth: 0 },
  contactTop:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  contactName:      { fontSize: 14, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 },
  contactTime:      { fontSize: 11, fontWeight: 600, flexShrink: 0 },
  contactBot:       { display: 'flex', alignItems: 'center', gap: 6 },
  contactPreview:   { fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 },
  unreadBadge:      { background: '#3B82F6', color: '#FFF', fontSize: 10, fontWeight: 900, borderRadius: 9, padding: '1px 6px', flexShrink: 0 },
  hoverActions:     { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4, background: '#0A0F1E', borderRadius: 8, padding: '2px 4px' },
  hoverBtn:         { background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s' },

  chatMain:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#020817' },
  chatWindow:   { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  chatHeader:   { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: '#0A0F1E', borderBottom: '1px solid #1E293B', flexShrink: 0 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#FFF', flexShrink: 0, position: 'relative', overflow: 'hidden' },
  headerMeta:   { flex: 1 },
  headerName:   { fontSize: 16, fontWeight: 800, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 8 },
  rolePill:     { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' as const },
  headerActions:{ display: 'flex', gap: 8 },
  headerBtn:    { width: 36, height: 36, borderRadius: 10, background: '#1E293B', color: '#94A3B8', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 14, transition: 'background 0.15s' },

  messagesArea: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  dateSep:      { textAlign: 'center' as const, fontSize: 11, color: '#475569', fontWeight: 700, letterSpacing: 0.5, marginBottom: 20 },
  msgRow:       { display: 'flex', marginBottom: 8, width: '100%' },
  bubbleWrap:   { maxWidth: '70%' },
  bubble:       { fontSize: 14, fontWeight: 500, lineHeight: 1.5, wordBreak: 'break-word' as const, overflow: 'hidden' },
  msgMeta:      { display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 10, color: '#475569' },

  inputBar:  { background: '#0A0F1E', borderTop: '1px solid #1E293B', padding: '12px 20px', flexShrink: 0 },
  inputForm: { display: 'flex', alignItems: 'flex-end', gap: 10 },
  barBtn:    { width: 38, height: 38, borderRadius: 10, background: '#1E293B', color: '#64748B', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' },
  textArea:  { flex: 1, background: '#1E293B', border: '1.5px solid #334155', borderRadius: 12, padding: '9px 14px', color: '#F1F5F9', fontSize: 14, fontWeight: 500, lineHeight: '20px', minHeight: 38, maxHeight: 120, overflow: 'auto' },
  sendBtn:   { width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all 0.2s cubic-bezier(0.175,0.885,0.32,1.275)' },

  emptyMain:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyIcon:  { width: 88, height: 88, borderRadius: 44, background: '#1E293B', display: 'grid', placeItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: 800, color: '#F1F5F9', letterSpacing: -0.3 },
  emptySub:   { fontSize: 14, color: '#475569', fontWeight: 500 },

  callOverlay:   { position: 'fixed' as const, inset: 0, background: 'rgba(2,8,23,0.94)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  callCard:      { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '48px 32px', gap: 12 },
  callAvatarRing:{ width: 120, height: 120, borderRadius: 60, border: '3px solid #3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  callAvatar:    { width: 100, height: 100, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' as const },
  callAvatarTxt: { color: '#FFF', fontSize: 38, fontWeight: 800 },
  callName:      { fontSize: 26, fontWeight: 800, color: '#F1F5F9', letterSpacing: -0.5 },
  callStatus:    { fontSize: 18, fontWeight: 700, color: '#3B82F6' },
  callWait:      { fontSize: 13, color: '#475569', fontWeight: 600 },
  hangupBtn:     { width: 64, height: 64, borderRadius: 32, background: '#EF4444', display: 'grid', placeItems: 'center', cursor: 'pointer', marginTop: 20, transition: 'transform 0.15s' },
};
