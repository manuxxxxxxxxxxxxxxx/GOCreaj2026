import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useGlobal } from "../context/GlobalContext";
import Header from '../components/Header';
import { X, MapPin, Map, FileText, Eye, Mic, Copy, Reply, Forward, Trash2, MessageCircle, Video, Phone, Check, CheckCheck, Star, Play, Pause } from 'lucide-react';
import { api, API_URL, SOCKET_URL } from '../api';
import '../../css/Chat.css';

type ChatTab = 'todos' | 'noLeidos' | 'favoritos' | 'archivados';
type MsgTipo = 'texto' | 'imagen' | 'ubicacion' | 'pdf' | 'audio' | 'producto';

const SIGNAL_URL  = SOCKET_URL;
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
const REACTION_EMOJIS = ['🔥', '👏', '😂', '🙈', '🙏', '😡'];

interface ReplySnap {
  id: number;
  mensaje: string;
  tipo?: string;
  emisor_id: number;
  adjunto?: string | null;
}

interface Reaccion { emoji: string; count: number; mio: boolean; }

interface Message {
  id: number;
  emisor_id: number;
  receptor_id: number;
  mensaje: string;
  tipo?: MsgTipo;
  adjunto?: string | null;
  adjunto_nombre?: string | null;
  adjunto_tamano?: number | null;
  adjunto_duracion?: number | null;
  lat?: number | null;
  lng?: number | null;
  leido: number;
  created_at: string;
  reply_to_id?: number | null;
  reply_snapshot?: ReplySnap | null;
  reacciones?: Reaccion[];
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

function imgUri(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  const m = path.match(/\/uploads\/(.+)$/);
  if (m) return `${API_URL}/uploads/${m[1]}`;
  if (path.startsWith('http')) return path;
  return `${API_URL}/uploads/${path}`;
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

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ROLE_COLOR: Record<string, string> = {
  vendedor: '#1D5FD1', repartidor: '#27AE8F', comprador: '#8E44AD', admin: '#C0392B',
};

function formatDuration(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ─── ReplyCard ─────────────────────────────────────────────────────────────────

function ReplyCard({ snap, mine }: { snap: ReplySnap; mine: boolean }) {
  const isImg  = snap.tipo === 'imagen';
  const preview = isImg ? '[Imagen]'
    : snap.tipo === 'ubicacion' ? '[Ubicación]'
    : snap.tipo === 'pdf' ? '[Documento]'
    : snap.tipo === 'audio' ? '[Nota de voz]'
    : (snap.mensaje ?? '').slice(0, 80);
  return (
    <div style={{ borderLeft: '3px solid #5D91EE', padding: '5px 8px', marginBottom: 6, background: mine ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.06)', borderRadius: '0 6px 6px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
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
  const preview = target.tipo === 'imagen' ? '[Imagen]'
    : target.tipo === 'ubicacion' ? '[Ubicación]'
    : target.tipo === 'pdf' ? '[Documento]'
    : target.tipo === 'audio' ? '[Nota de voz]'
    : target.mensaje.slice(0, 70);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0F172A', borderTop: '1px solid #334155', borderLeft: '3px solid #5D91EE', padding: '8px 16px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#5D91EE', fontWeight: 700, marginBottom: 2 }}>Respondiendo a</div>
        <div style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
      </div>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', lineHeight: 1, padding: '2px 6px', display: 'flex' }}><X size={16} strokeWidth={2.2} /></button>
    </div>
  );
}

// ─── LocationMsg (abre modal con mapa embebido, ya no sale a otra pestaña) ────

function LocationMsg({ lat, lng, mine, onOpen }: { lat: number | null | undefined; lng: number | null | undefined; mine: boolean; onOpen: (lat: number, lng: number) => void }) {
  const [mapErr, setMapErr] = useState(false);
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!numLat || !numLng) return <span style={{ fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={14} strokeWidth={2.2} />Ubicación</span>;
  const mapUrl  = `https://staticmap.openstreetmap.de/staticmap.php?center=${numLat},${numLng}&zoom=14&size=220x100&markers=${numLat},${numLng},red`;
  return (
    <button onClick={() => onOpen(numLat, numLng)} style={{ display: 'block', border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', width: 220 }}>
        {!mapErr
          ? <img src={mapUrl} alt="Mapa" style={{ width: 220, height: 100, objectFit: 'cover', display: 'block' }} onError={() => setMapErr(true)} />
          : <div style={{ width: 220, height: 100, background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}><Map size={32} strokeWidth={1.6} /></div>
        }
        <div style={{ background: mine ? 'rgba(0,0,0,0.25)' : '#1E293B', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} strokeWidth={2.2} color={mine ? 'rgba(255,255,255,0.8)' : '#94A3B8'} />
          <span style={{ fontSize: 12, color: mine ? 'rgba(255,255,255,0.8)' : '#94A3B8' }}>
            {numLat.toFixed(4)}, {numLng.toFixed(4)} → Ver mapa
          </span>
        </div>
      </div>
    </button>
  );
}

function buildPickerHtml(lat: number, lng: number): string {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map').setView([${lat}, ${lng}], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  var pin = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
  function send(lat, lng) { window.parent.postMessage({ type: 'pick', lat: lat, lng: lng }, '*'); }
  pin.on('dragend', function () { var p = pin.getLatLng(); send(p.lat, p.lng); });
  map.on('click', function (e) { pin.setLatLng(e.latlng); send(e.latlng.lat, e.latlng.lng); });
</script>
</body></html>`;
}

function LocationPickerModal({ initialLat, initialLng, onConfirm, onClose }: {
  initialLat: number; initialLng: number;
  onConfirm: (lat: number, lng: number) => void; onClose: () => void;
}) {
  const [picked, setPicked] = useState({ lat: initialLat, lng: initialLng });

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'pick') setPicked({ lat: e.data.lat, lng: e.data.lng });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 720, height: '80vh', background: '#0B0F19', borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <iframe title="Elegir ubicación" srcDoc={buildPickerHtml(initialLat, initialLng)} style={{ width: '100%', height: '100%', border: 'none' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: '#FFF', border: 'none', borderRadius: 20, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} strokeWidth={2.2} /></button>
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, background: '#111827', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94A3B8', fontSize: 12, flex: 1 }}>Toca el mapa o arrastra el pin para ajustar</span>
          <button
            onClick={() => onConfirm(picked.lat, picked.lng)}
            style={{ background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#FFF', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Enviar ubicación
          </button>
        </div>
      </div>
    </div>
  );
}

function MapModal({ lat, lng, onClose }: { lat: number; lng: number; onClose: () => void }) {
  const delta = 0.01;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 720, height: '80vh', background: '#0B0F19', borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <iframe title="Mapa" src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: '#FFF', border: 'none', borderRadius: 20, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} strokeWidth={2.2} /></button>
        <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" style={{ position: 'absolute', top: 14, left: 14, background: '#FFF', color: '#0F172A', borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          Abrir en Google Maps
        </a>
      </div>
    </div>
  );
}

// ─── PdfMsg / PdfModal (visor embebido, ya no abre nueva pestaña) ─────────────

function PdfMsg({ msg, mine, onOpen }: { msg: Message; mine: boolean; onOpen: (url: string, nombre?: string | null) => void }) {
  const nombre = msg.adjunto_nombre || 'Documento.pdf';
  const tamano = formatBytes(msg.adjunto_tamano);
  return (
    <button
      onClick={() => msg.adjunto && onOpen(msg.adjunto, msg.adjunto_nombre)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: mine ? 'rgba(255,255,255,0.14)' : 'rgba(148,163,184,0.12)', borderRadius: 12, padding: 8, width: 230, cursor: 'pointer', textAlign: 'left' }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: mine ? 'rgba(255,255,255,0.18)' : 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: mine ? '#fff' : '#5D91EE', flexShrink: 0 }}><FileText size={18} strokeWidth={2} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: mine ? '#FFF' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre}</div>
        {!!tamano && <div style={{ fontSize: 10, fontWeight: 600, color: mine ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: 2 }}>{tamano} · PDF</div>}
      </div>
      <Eye size={16} strokeWidth={2} color={mine ? '#fff' : 'inherit'} />
    </button>
  );
}

function PdfModal({ url, nombre, onClose }: { url: string; nombre?: string | null; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 860, height: '86vh', background: '#0B0F19', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #1E293B' }}>
          <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 14, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombre ?? 'Documento.pdf'}</span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', borderRadius: 18, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} strokeWidth={2.2} /></button>
        </div>
        <iframe title="PDF" src={url} style={{ flex: 1, border: 'none', background: '#FFF' }} />
      </div>
    </div>
  );
}

// ─── AudioMsg (grabación/reproducción nativa del navegador) ───────────────────

function AudioMsg({ msg, mine }: { msg: Message; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [tiempo, setTiempo]     = useState(msg.adjunto_duracion ?? 0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause(); else void a.play();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: mine ? 'rgba(255,255,255,0.14)' : 'rgba(148,163,184,0.12)', borderRadius: 12, padding: 8, width: 210 }}>
      <audio
        ref={audioRef}
        src={imgUri(msg.adjunto)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={e => {
          const a = e.currentTarget;
          setTiempo(a.currentTime);
          if (a.duration) setProgreso(a.currentTime / a.duration);
        }}
        onLoadedMetadata={e => { if (isFinite(e.currentTarget.duration)) setTiempo(e.currentTarget.duration); }}
        style={{ display: 'none' }}
      />
      <button onClick={toggle} style={{ width: 34, height: 34, borderRadius: 17, border: 'none', background: mine ? '#FFF' : '#5D91EE', color: mine ? '#5D91EE' : '#FFF', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? <Pause size={14} fill="currentColor" strokeWidth={0} /> : <Play size={14} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ height: 4, borderRadius: 2, background: mine ? 'rgba(255,255,255,0.3)' : '#334155', overflow: 'hidden' }}>
          <div style={{ height: 4, borderRadius: 2, background: mine ? '#FFF' : '#5D91EE', width: `${progreso * 100}%` }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: mine ? 'rgba(255,255,255,0.8)' : '#94A3B8', marginTop: 4 }}>{formatDuration(Math.floor(tiempo))}</div>
      </div>
      <Mic size={14} strokeWidth={2} color={mine ? 'rgba(255,255,255,0.8)' : '#94A3B8'} />
    </div>
  );
}

// ─── ReactionsRow ───────────────────────────────────────────────────────────────

function ReactionsRow({ reacciones, mine, onPress }: { reacciones: Reaccion[]; mine: boolean; onPress: (emoji: string) => void }) {
  if (!reacciones?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      {reacciones.map(r => (
        <button
          key={r.emoji}
          onClick={() => onPress(r.emoji)}
          style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 99, border: `1px solid ${r.mio ? '#5D91EE' : '#334155'}`, background: r.mio ? 'rgba(59,130,246,0.15)' : '#1E293B', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 12 }}>{r.emoji}</span>
          {r.count > 1 && <span style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8' }}>{r.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ─── MessageActionMenu (clic derecho: reacciones + copiar/responder/reenviar/eliminar) ─

function MessageActionMenu({ msg, mine, x, y, onClose, onCopy, onReply, onForward, onDelete, onReact }: {
  msg: Message; mine: boolean; x: number; y: number;
  onClose: () => void;
  onCopy: (m: Message) => void;
  onReply: (m: Message) => void;
  onForward: (m: Message) => void;
  onDelete: (m: Message) => void;
  onReact: (m: Message, emoji: string) => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4000 }} onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }}>
      <div
        style={{ position: 'absolute', top: Math.min(y, window.innerHeight - 260), left: Math.min(x, window.innerWidth - 220), background: '#111827', border: '1px solid #1E293B', borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', width: 210 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 8px', borderBottom: '1px solid #1E293B' }}>
          {REACTION_EMOJIS.map(e => (
            <button key={e} onClick={() => { onReact(msg, e); onClose(); }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 2 }}>{e}</button>
          ))}
        </div>
        {[
          { label: 'Copiar', icon: <Copy size={16} strokeWidth={2} />, onPress: () => { onCopy(msg); onClose(); } },
          { label: 'Responder', icon: <Reply size={16} strokeWidth={2} />, onPress: () => { onReply(msg); onClose(); } },
          { label: 'Reenviar', icon: <Forward size={16} strokeWidth={2} />, onPress: () => { onForward(msg); onClose(); } },
          ...(mine ? [{ label: 'Eliminar', icon: <Trash2 size={16} strokeWidth={2} />, onPress: () => { onDelete(msg); onClose(); } }] : []),
        ].map(item => (
          <button
            key={item.label}
            onClick={item.onPress}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', color: item.label === 'Eliminar' ? '#EF4444' : '#F1F5F9', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
          >
            {item.icon}{item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PeoplePickerModal (contactos permitidos / reenviar a un chat existente) ──

function PeoplePickerModal({ title, people, loading, onClose, onSelect }: {
  title: string; people: Contact[]; loading: boolean;
  onClose: () => void; onSelect: (c: Contact) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? people.filter(u => u.nombre.toLowerCase().includes(q.toLowerCase()) || (u.username ?? '').toLowerCase().includes(q.toLowerCase()))
    : people;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0F172A', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1.5px solid #1E293B' }}>
          <strong style={{ flex: 1, fontSize: 16, color: '#F1F5F9' }}>{title}</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748B' }}>×</button>
        </div>
        <div style={{ padding: 14, borderBottom: '1.5px solid #1E293B' }}>
          <input
            type="text"
            autoFocus
            placeholder="Buscar..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #334155', background: '#1E293B', borderRadius: 12, outline: 'none', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', color: '#F1F5F9' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#64748B', padding: 30 }}>Cargando…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748B', padding: 30 }}>
              {people.length === 0 ? 'Aún no tienes contactos.\nAparecerán tras tu primer pedido.' : 'Sin resultados'}
            </div>
          ) : filtered.map(u => {
            const color = ROLE_COLOR[u.rol] ?? '#1D5FD1';
            return (
              <button
                key={u.id}
                onClick={() => onSelect(u)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, width: '100%', background: '#111827', border: '1.5px solid #1E293B', borderRadius: 12, marginBottom: 8, cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 22, background: color, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, overflow: 'hidden', flexShrink: 0 }}>
                  {u.foto_perfil ? <img src={imgUri(u.foto_perfil)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.nombre.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: '#F1F5F9', fontSize: 14 }}>{u.nombre}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                    {u.username && <span style={{ fontSize: 12, color: '#64748B' }}>@{u.username}</span>}
                    <span style={{ background: `${color}22`, color, fontSize: 9, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase', padding: '1px 6px', borderRadius: 8 }}>{u.rol}</span>
                    {u.en_linea === 1 && <span style={{ width: 7, height: 7, borderRadius: 4, background: '#10B981' }} />}
                  </div>
                </div>
                <span style={{ color: '#5D91EE', display: 'flex' }}><MessageCircle size={18} strokeWidth={2} /></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Static call UI styles (dark overlay, not theme-dependent) ─────────────────
const CS: Record<string, React.CSSProperties> = {
  callOverlay:   { position: 'fixed', inset: 0, background: 'rgba(2,8,23,0.94)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  callCard:      { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px', gap: 12 },
  callAvatarRing:{ width: 120, height: 120, borderRadius: 60, border: '3px solid #5D91EE', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  callAvatar:    { width: 100, height: 100, borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  callAvatarTxt: { color: '#FFF', fontSize: 38, fontWeight: 800 },
  callName:      { fontSize: 26, fontWeight: 800, color: '#F1F5F9', letterSpacing: -0.5 },
  callStatus:    { fontSize: 18, fontWeight: 700, color: '#5D91EE' },
  callWait:      { fontSize: 13, color: '#475569', fontWeight: 600 },
  hangupBtn:     { width: 64, height: 64, borderRadius: 32, background: '#EF4444', display: 'grid', placeItems: 'center', cursor: 'pointer', marginTop: 20, transition: 'transform 0.15s' },
  avatarImg:     { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
};

// ─── Active Call Modal ─────────────────────────────────────────────────────────

function ActiveCallModal({ call, contacto, onHangup, muted, speakerOn, onMuteToggle, onSpeakerToggle, onCameraToggle, remoteVideoRef, localVideoRef }: {
  call: ActiveCall;
  contacto: Contact | null;
  onHangup: () => void;
  muted: boolean;
  speakerOn: boolean;
  onMuteToggle: () => void;
  onSpeakerToggle: () => void;
  onCameraToggle: () => void;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const name  = contacto?.nombre ?? 'Desconocido';
  const color = contacto ? (ROLE_COLOR[contacto.rol] ?? '#5D91EE') : '#5D91EE';
  const isVideo = call.tipo === 'video';
  return (
    <div style={CS.callOverlay}>
      {isVideo && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: 140, right: 24, width: 110, height: 150, borderRadius: 16, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)' }} />
        </div>
      )}
      <div style={{ ...CS.callCard, position: 'relative' }}>
        <div style={{
          ...CS.callAvatarRing,
          borderColor: call.connected ? '#22C55E' : '#5D91EE',
          boxShadow: call.connected ? '0 0 0 8px rgba(34,197,94,0.15), 0 0 0 16px rgba(34,197,94,0.07)' : 'none',
          transition: 'box-shadow 0.4s',
        }}>
          <div style={{ ...CS.callAvatar, background: color }}>
            {imgUri(contacto?.foto_perfil)
              ? <img src={imgUri(contacto?.foto_perfil)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : <span style={CS.callAvatarTxt}>{getInitials(name)}</span>
            }
          </div>
        </div>

        <div style={CS.callName}>{name}</div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: call.connected ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
          borderRadius: 20, padding: '6px 16px',
          fontSize: 14, fontWeight: 700,
          color: call.connected ? '#22C55E' : '#5D91EE',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: call.connected ? '#22C55E' : '#5D91EE',
            animation: call.connected ? 'none' : 'callPulse 1.2s ease infinite',
          }} />
          {call.connected
            ? formatDuration(call.elapsed)
            : call.tipo === 'video' ? 'Videollamada...' : 'Llamando...'
          }
        </div>
        {!call.connected && (
          <div style={CS.callWait}>Esperando respuesta...</div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onMuteToggle}
              title={muted ? 'Activar micrófono' : 'Silenciar'}
              style={{
                width: 54, height: 54, borderRadius: 27,
                background: muted ? '#EF4444' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${muted ? '#EF4444' : 'rgba(255,255,255,0.15)'}`,
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                transition: 'all 0.2s',
              }}
            >
              {muted ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
            <span style={{ fontSize: 11, color: muted ? '#EF4444' : '#64748B', fontWeight: 600 }}>
              {muted ? 'Silenciado' : 'Micro'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              style={{ ...CS.hangupBtn, marginTop: 0 }}
              onClick={onHangup}
              title="Colgar"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" transform="rotate(135 12 12)"/>
              </svg>
            </button>
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Colgar</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <button
              onClick={onSpeakerToggle}
              title={speakerOn ? 'Altavoz activo' : 'Activar altavoz'}
              style={{
                width: 54, height: 54, borderRadius: 27,
                background: speakerOn ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${speakerOn ? '#5D91EE' : 'rgba(255,255,255,0.15)'}`,
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                transition: 'all 0.2s',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke={speakerOn ? '#5D91EE' : '#fff'} strokeWidth="2.5" strokeLinecap="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                {speakerOn ? (
                  <>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </>
                ) : (
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                )}
              </svg>
            </button>
            <span style={{ fontSize: 11, color: speakerOn ? '#5D91EE' : '#64748B', fontWeight: 600 }}>
              Altavoz
            </span>
          </div>

          {isVideo && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button
                onClick={onCameraToggle}
                title="Cambiar cámara"
                style={{
                  width: 54, height: 54, borderRadius: 27,
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Cámara</span>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes callPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ─── Incoming Call Modal ───────────────────────────────────────────────────────

// Notificación de llamada entrante como banner superior (no ocupa toda la
// pantalla): se puede seguir navegando/leyendo mientras decides.
function IncomingCallModal({ call, onAccept, onReject }: {
  call: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 14, background: '#121B2D', borderRadius: 18, padding: '12px 16px', boxShadow: '0 16px 48px rgba(0,0,0,0.45)', minWidth: 340, animation: 'callBannerIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ width: 46, height: 46, borderRadius: 23, background: '#1D5FD1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
        {call.foto_perfil
          ? <img src={imgUri(call.foto_perfil)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: '#FFF', fontWeight: 800, fontSize: 15 }}>{getInitials(call.nombre)}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#F1F5F9', fontWeight: 800, fontSize: 14 }}>{call.nombre}</div>
        <div style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          {call.tipo === 'video' ? <><Video size={13} strokeWidth={2.2} />Videollamada entrante</> : <><Phone size={13} strokeWidth={2.2} />Llamada entrante</>}
        </div>
      </div>
      <button onClick={onReject} title="Rechazar" style={{ width: 40, height: 40, borderRadius: 20, background: '#EF4444', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <button onClick={onAccept} title="Aceptar" style={{ width: 40, height: 40, borderRadius: 20, background: '#22C55E', display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="18" height="18"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17z"/></svg>
      </button>
      <style>{`@keyframes callBannerIn{from{opacity:0;transform:translate(-50%,-16px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Chat() {
  const { user, theme } = useGlobal();
  const isDark = theme === 'dark';
  const S = makeStyles(isDark);
  const myId = user?.id != null ? Number(user.id) : undefined;
  const location = useLocation();

  const [contacts, setContacts]           = useState<Contact[]>([]);
  const [selected, setSelected]           = useState<Contact | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [msgInput, setMsgInput]           = useState('');
  const [tab, setTab]                     = useState<ChatTab>('todos');
  const [search, setSearch]               = useState('');
  const [newChatOpen, setNewChatOpen]     = useState(false);
  const [misContactos, setMisContactos]   = useState<Contact[]>([]);
  const [contactosLoading, setContactosLoading] = useState(false);
  const [forwardOpen, setForwardOpen]     = useState(false);
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null);
  const [totalUnread, setTotalUnread]     = useState(0);
  const [sending, setSending]             = useState(false);
  const [activeCall, setActiveCall]       = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall]   = useState<IncomingCall | null>(null);
  const [callMuted, setCallMuted]         = useState(false);
  const [callSpeaker, setCallSpeaker]     = useState(false);
  const [replyTarget, setReplyTarget]     = useState<Message | null>(null);
  const [imgFullscreen, setImgFullscreen] = useState<string | null>(null);
  const [mapTarget, setMapTarget]         = useState<{ lat: number; lng: number } | null>(null);
  const [locPicker, setLocPicker]         = useState<{ lat: number; lng: number } | null>(null);
  const [pdfTarget, setPdfTarget]         = useState<{ url: string; nombre?: string | null } | null>(null);
  const [ctxMenu, setCtxMenu]             = useState<{ msg: Message; x: number; y: number } | null>(null);
  const [recording, setRecording]         = useState(false);
  const [recSeconds, setRecSeconds]       = useState(0);

  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const pdfInputRef      = useRef<HTMLInputElement>(null);
  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const contactsPollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const callTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const callPollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const recTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef        = useRef<Socket | null>(null);
  const pcRef            = useRef<RTCPeerConnection | null>(null);
  const localStreamRef   = useRef<MediaStream | null>(null);
  const remoteAudioRef   = useRef<HTMLAudioElement>(null);
  const remoteVideoRef   = useRef<HTMLVideoElement>(null);
  const localVideoRef    = useRef<HTMLVideoElement>(null);
  const [callFacing, setCallFacing] = useState<'user' | 'environment'>('user');
  const pendingCandidates= useRef<RTCIceCandidateInit[]>([]);
  const callAcceptedRef  = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef     = useRef<Blob[]>([]);
  const lastMsgsJson     = useRef('');

  const scrollBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── WebRTC helpers (sin cambios respecto a la versión anterior) ────────────

  const closePeerConnection = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pendingCandidates.current = [];
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
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
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPendingCandidates = async (pc: RTCPeerConnection) => {
    for (const c of pendingCandidates.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidates.current = [];
  };

  const closeCallCleanup = useCallback(async () => {
    closePeerConnection();
    callAcceptedRef.current = false;
    setActiveCall(null);
    setIncomingCall(null);
    setCallMuted(false);
    setCallSpeaker(false);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
  }, []);

  // ── Socket.io: señalización de llamadas + mensajería en tiempo real ────────

  useEffect(() => {
    if (!myId) return;

    const socket = io(SIGNAL_URL, { reconnection: true, reconnectionDelay: 2000 });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join-user', { userId: myId }));

    socket.on('peer-joined', async ({ socketId }: { socketId: string }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: activeCallRef.current?.tipo === 'video' });
        await pc.setLocalDescription(offer);
        socket.emit('offer', { room: (pc as any)._room ?? '', sdp: offer, to: socketId });
      } catch (e) { console.warn('[webrtc] offer error', e); }
    });

    socket.on('offer', async ({ sdp, from }: { sdp: RTCSessionDescriptionInit; from: string }) => {
      const pc = pcRef.current;
      if (pc && callAcceptedRef.current) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { room: (pc as any)._room ?? '', sdp: answer, to: from });
          await addPendingCandidates(pc);
        } catch (e) { console.warn('[webrtc] callee offer error', e); }
      } else {
        setIncomingCall(ic => ic ? { ...ic, sdp, fromSocketId: from } : ic);
      }
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

    socket.on('peer-left', () => { closeCallCleanup(); });

    // Mensajería en tiempo real: refresca solo cuando hay algo nuevo
    socket.on('new-message', () => { void fetchContacts(); if (selectedRef.current) void fetchMessages(selectedRef.current.id); });
    socket.on('messages-read', () => { if (selectedRef.current) void fetchMessages(selectedRef.current.id); });
    socket.on('reaction-change', () => { if (selectedRef.current) void fetchMessages(selectedRef.current.id); });
    socket.on('message-deleted', () => { if (selectedRef.current) void fetchMessages(selectedRef.current.id); });

    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, closeCallCleanup]);

  // ── Incoming call polling (DB-based) ────────────────────────────────────────

  useEffect(() => {
    if (!myId) return;
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
  }, [myId, activeCall, incomingCall]);

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

  const selectedRef = useRef<Contact | null>(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  // El efecto de sockets solo depende de [myId] (ver más abajo), así que su closure
  // vería siempre el `activeCall` del primer render (null) — usamos un ref para
  // poder leer el tipo de llamada actual (voz/video) dentro del handler 'peer-joined'.
  const activeCallRef = useRef<ActiveCall | null>(null);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

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
      if (res.data.ok) {
        const json = JSON.stringify(res.data.mensajes ?? []);
        if (json !== lastMsgsJson.current) {
          lastMsgsJson.current = json;
          setMessages(res.data.mensajes ?? []);
          scrollBottom();
        }
      }
    } catch {}
  }, []);

  useEffect(() => { void fetchContacts(tab, search); }, [tab, search, fetchContacts]);

  // Si venimos de "Preguntar a la tienda" en Reels, abrimos directo esa conversación.
  useEffect(() => {
    const otroId = (location.state as { otroId?: number } | null)?.otroId;
    if (!otroId || contacts.length === 0) return;
    const match = contacts.find(c => c.id === Number(otroId));
    if (match) setSelected(match);
  }, [location.state, contacts]);

  // Poll de respaldo, baja frecuencia (el socket hace el trabajo pesado)
  useEffect(() => {
    contactsPollRef.current = setInterval(() => void fetchContacts(tab, search), 25000);
    return () => { if (contactsPollRef.current) clearInterval(contactsPollRef.current); };
  }, [fetchContacts, tab, search]);

  useEffect(() => {
    if (!selected) return;
    lastMsgsJson.current = '';
    void fetchMessages(selected.id);
    pollRef.current = setInterval(() => void fetchMessages(selected.id), 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, fetchMessages]);

  useEffect(() => { scrollBottom(); }, [messages]);

  const abrirContactos = async () => {
    setNewChatOpen(true);
    setContactosLoading(true);
    try {
      const r = await api.get('/chat_multi.php?action=contactos');
      setMisContactos(r.data.ok ? (r.data.contactos ?? []) : []);
    } catch { setMisContactos([]); }
    setContactosLoading(false);
  };

  // ── Call actions ────────────────────────────────────────────────────────────

  const initCall = async (tipo: 'voz' | 'video') => {
    if (!selected) return;
    try {
      const res = await api.post('/chat_multi.php?action=iniciar_llamada', { receptor_id: selected.id, tipo });
      if (!res.data.ok) return;
      const room = res.data.room as string;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: tipo === 'video' }).catch(() => null);
      const pc = createPeerConnection(room);
      (pc as RTCPeerConnection & { _room?: string })._room = room;
      if (stream) {
        localStreamRef.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }

      callAcceptedRef.current = false;
      socketRef.current?.emit('join-call', { room, userId: myId });
      setActiveCall({ llamadaId: res.data.llamada_id, tipo, elapsed: 0, room, connected: false });
    } catch (e) { console.warn('[call] initCall error', e); }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    try {
      await api.post('/chat_multi.php?action=responder_llamada', { llamada_id: incomingCall.llamadaId, aceptar: true });
      const room = incomingCall.room;
      const savedSdp = incomingCall.sdp;
      const savedFromId = incomingCall.fromSocketId;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingCall.tipo === 'video' }).catch(() => null);
      const pc = createPeerConnection(room);
      (pc as RTCPeerConnection & { _room?: string })._room = room;
      if (stream) {
        localStreamRef.current = stream;
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }

      callAcceptedRef.current = true;
      socketRef.current?.emit('join-call', { room, userId: myId });
      setActiveCall({ llamadaId: incomingCall.llamadaId, tipo: incomingCall.tipo, elapsed: 0, room, connected: false });
      setIncomingCall(null);

      if (savedSdp && savedFromId) {
        await pc.setRemoteDescription(new RTCSessionDescription(savedSdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit('answer', { room, sdp: answer, to: savedFromId });
        await addPendingCandidates(pc);
      }
    } catch (e) { console.warn('[call] acceptCall error', e); }
  };

  const sendMissedCallMessage = async (otroId: number) => {
    const time = new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
    await api.post('/chat_multi.php?action=enviar', {
      receptor_id: otroId,
      mensaje: `📞 Llamada perdida a las ${time}`,
      tipo: 'texto',
    }).catch(() => {});
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    const emisorId = incomingCall.emisor_id;
    await api.post('/chat_multi.php?action=responder_llamada', { llamada_id: incomingCall.llamadaId, aceptar: false }).catch(() => {});
    setIncomingCall(null);
    await sendMissedCallMessage(emisorId);
    void fetchContacts(tab, search);
    if (selected?.id === emisorId) void fetchMessages(emisorId);
  };

  const hangup = async () => {
    if (!activeCall) return;
    const wasConnected = activeCall.connected;
    const otroId = selected?.id;
    socketRef.current?.emit('hang-up', { room: activeCall.room });
    await api.post('/chat_multi.php?action=finalizar_llamada', { llamada_id: activeCall.llamadaId, duracion: activeCall.elapsed }).catch(() => {});
    closeCallCleanup();
    if (!wasConnected && otroId) {
      await sendMissedCallMessage(otroId);
      void fetchContacts(tab, search);
      void fetchMessages(otroId);
    }
  };

  const toggleMute = () => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    const next = !callMuted;
    tracks.forEach(t => { t.enabled = !next; });
    setCallMuted(next);
  };

  const toggleSpeaker = async () => {
    const next = !callSpeaker;
    if (remoteAudioRef.current && 'setSinkId' in remoteAudioRef.current) {
      try {
        if (next) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const speaker = devices.find(d => d.kind === 'audiooutput' && d.deviceId !== 'default');
          if (speaker) await (remoteAudioRef.current as any).setSinkId(speaker.deviceId);
        } else {
          await (remoteAudioRef.current as any).setSinkId('default');
        }
      } catch { /* setSinkId not available */ }
    }
    setCallSpeaker(next);
  };

  const toggleCamera = async () => {
    if (!activeCall || activeCall.tipo !== 'video') return;
    const nextFacing = callFacing === 'user' ? 'environment' : 'user';
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
      setCallFacing(nextFacing);
    } catch { /* la webcam del dispositivo no soporta alternar frontal/trasera */ }
  };

  // ── Enviar mensajes (texto / imagen / ubicación / pdf / audio) ─────────────

  const notifyPush = (receptorId: number, tipo: MsgTipo) => {
    socketRef.current?.emit('send-message', { receptorId, message: { emisor_id: myId, tipo } });
  };

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
      notifyPush(selected.id, 'texto');
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
        await api.post('/chat_multi.php?action=enviar', { receptor_id: selected.id, tipo: 'imagen', mensaje: '[Imagen]', adjunto: reader.result });
        notifyPush(selected.id, 'imagen');
        void fetchMessages(selected.id);
        void fetchContacts(tab, search);
      } finally { setSending(false); }
    };
    reader.readAsDataURL(file);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    e.target.value = '';
    if (file.size > 15 * 1024 * 1024) { alert('El PDF supera el límite de 15 MB.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setSending(true);
      try {
        await api.post('/chat_multi.php?action=enviar', {
          receptor_id: selected.id, tipo: 'pdf', mensaje: '',
          adjunto: reader.result, nombre: file.name, tamano: file.size,
        });
        notifyPush(selected.id, 'pdf');
        void fetchMessages(selected.id);
        void fetchContacts(tab, search);
      } finally { setSending(false); }
    };
    reader.readAsDataURL(file);
  };

  const abrirSelectorUbicacion = () => {
    if (!selected) return;
    if (!navigator.geolocation) { alert('Geolocalización no disponible.'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setLocPicker({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert('No se pudo obtener tu ubicación.')
    );
  };

  const confirmarUbicacion = async (lat: number, lng: number) => {
    if (!selected) return;
    setLocPicker(null);
    setSending(true);
    try {
      await api.post('/chat_multi.php?action=enviar', { receptor_id: selected.id, tipo: 'ubicacion', mensaje: '[Ubicación compartida]', lat, lng });
      notifyPush(selected.id, 'ubicacion');
      void fetchMessages(selected.id);
      void fetchContacts(tab, search);
    } finally { setSending(false); }
  };

  // ── Nota de voz (MediaRecorder nativo del navegador) ───────────────────────

  const iniciarGrabacion = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      alert('No se pudo acceder al micrófono.');
    }
  };

  const cancelarGrabacion = () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecSeconds(0);
  };

  const enviarGrabacion = async () => {
    if (!selected || !mediaRecorderRef.current) return;
    const mr = mediaRecorderRef.current;
    const duracion = recSeconds;
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
    setRecSeconds(0);

    await new Promise<void>(resolve => {
      mr.onstop = () => resolve();
      mr.stop();
    });
    mr.stream.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;

    const blob = new Blob(recChunksRef.current, { type: mr.mimeType || 'audio/webm' });
    const reader = new FileReader();
    reader.onload = async () => {
      setSending(true);
      try {
        await api.post('/chat_multi.php?action=enviar', {
          receptor_id: selected.id, tipo: 'audio', mensaje: '',
          adjunto: reader.result, duracion,
        });
        notifyPush(selected.id, 'audio');
        void fetchMessages(selected.id);
        void fetchContacts(tab, search);
      } finally { setSending(false); }
    };
    reader.readAsDataURL(blob);
  };

  // ── Reacciones / copiar / responder / reenviar / eliminar ──────────────────

  const reaccionar = async (msg: Message, emoji: string) => {
    if (!selected) return;
    await api.post('/chat_multi.php?action=reaccionar', { chat_id: msg.id, emoji }).catch(() => {});
    socketRef.current?.emit('reaction-change', { otroId: selected.id, chatId: msg.id, emoji, usuarioId: myId });
    void fetchMessages(selected.id);
  };

  const handleCopy = (msg: Message) => { void navigator.clipboard?.writeText(msg.mensaje); };

  const handleDelete = async (msg: Message) => {
    if (!selected) return;
    if (!window.confirm('¿Eliminar este mensaje para todos?')) return;
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    await api.post('/chat_multi.php?action=eliminar_mensaje', { chat_id: msg.id }).catch(() => {});
    socketRef.current?.emit('message-deleted', { otroId: selected.id, chatId: msg.id });
  };

  const handleForward = async (msg: Message) => {
    setForwardTarget(msg);
    setForwardOpen(true);
    setContactosLoading(true);
    try {
      const r = await api.get('/chat_multi.php?action=conversaciones&tab=todos&q=');
      setMisContactos(r.data.ok ? (r.data.conversaciones ?? []) : []);
    } catch { setMisContactos([]); }
    setContactosLoading(false);
  };

  const enviarReenvio = async (c: Contact) => {
    const msg = forwardTarget;
    setForwardOpen(false);
    setForwardTarget(null);
    if (!msg) return;
    const body: Record<string, unknown> = { receptor_id: c.id, tipo: msg.tipo ?? 'texto', mensaje: msg.mensaje };
    if (msg.adjunto) body.adjunto = msg.adjunto;
    if (msg.adjunto_nombre) body.nombre = msg.adjunto_nombre;
    if (msg.adjunto_tamano) body.tamano = msg.adjunto_tamano;
    if (msg.adjunto_duracion) body.duracion = msg.adjunto_duracion;
    if (msg.lat) body.lat = msg.lat;
    if (msg.lng) body.lng = msg.lng;
    await api.post('/chat_multi.php?action=enviar', body).catch(() => {});
    notifyPush(c.id, (msg.tipo ?? 'texto') as MsgTipo);
    if (selected?.id === c.id) void fetchMessages(c.id);
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
      <Header />

      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      {activeCall && (
        <ActiveCallModal
          call={activeCall}
          contacto={selected}
          onHangup={() => void hangup()}
          muted={callMuted}
          speakerOn={callSpeaker}
          onMuteToggle={toggleMute}
          onSpeakerToggle={() => void toggleSpeaker()}
          onCameraToggle={() => void toggleCamera()}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
        />
      )}
      {incomingCall && !activeCall && (
        <IncomingCallModal call={incomingCall} onAccept={() => void acceptCall()} onReject={() => void rejectCall()} />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />

      {imgFullscreen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }} onClick={() => setImgFullscreen(null)}>
          <img src={imgFullscreen} alt="" style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 12, objectFit: 'contain' }} />
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', borderRadius: 20, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setImgFullscreen(null)}><X size={18} strokeWidth={2.2} /></button>
        </div>
      )}

      {mapTarget && <MapModal lat={mapTarget.lat} lng={mapTarget.lng} onClose={() => setMapTarget(null)} />}
      {locPicker && (
        <LocationPickerModal
          initialLat={locPicker.lat}
          initialLng={locPicker.lng}
          onConfirm={(lat, lng) => void confirmarUbicacion(lat, lng)}
          onClose={() => setLocPicker(null)}
        />
      )}
      {pdfTarget && <PdfModal url={pdfTarget.url} nombre={pdfTarget.nombre} onClose={() => setPdfTarget(null)} />}

      {ctxMenu && (
        <MessageActionMenu
          msg={ctxMenu.msg}
          mine={!!myId && ctxMenu.msg.emisor_id === myId}
          x={ctxMenu.x} y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onCopy={handleCopy}
          onReply={setReplyTarget}
          onForward={m => void handleForward(m)}
          onDelete={m => void handleDelete(m)}
          onReact={(m, e) => void reaccionar(m, e)}
        />
      )}

      {newChatOpen && (
        <PeoplePickerModal
          title="Tus contactos"
          people={misContactos}
          loading={contactosLoading}
          onClose={() => setNewChatOpen(false)}
          onSelect={c => { setNewChatOpen(false); setSelected(c); }}
        />
      )}
      {forwardOpen && (
        <PeoplePickerModal
          title="Reenviar a…"
          people={misContactos}
          loading={contactosLoading}
          onClose={() => { setForwardOpen(false); setForwardTarget(null); }}
          onSelect={c => void enviarReenvio(c)}
        />
      )}

      <div style={S.layout}>
        {/* ── Sidebar ── */}
        <aside style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <div>
              <div style={S.sidebarTitle}>Mensajes</div>
              {totalUnread > 0 && <div style={S.sidebarSub}>{totalUnread} sin leer</div>}
            </div>
            <button style={{ ...S.iconBtn, cursor: 'pointer' }} title="Nuevo chat" onClick={() => void abrirContactos()}>
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
                <div style={{ marginBottom: 12, color: '#475569', display: 'flex', justifyContent: 'center' }}><MessageCircle size={36} strokeWidth={1.6} /></div>
                <div style={{ color: '#F1F5F9', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {tab === 'noLeidos' ? <><Check size={16} strokeWidth={2.4} />Todo leído</> : tab === 'favoritos' ? 'Sin favoritos' : tab === 'archivados' ? 'Sin archivados' : 'Sin conversaciones'}
                </div>
                {tab === 'todos' && (
                  <button onClick={() => void abrirContactos()} style={{ marginTop: 14, background: 'linear-gradient(135deg,#1D5FD1,#123F94)', color: '#FFF', border: 'none', borderRadius: 99, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Ver mis contactos
                  </button>
                )}
              </div>
            )}
            {contacts.map(c => {
              const color    = ROLE_COLOR[c.rol] ?? '#1D5FD1';
              const uri      = imgUri(c.foto_perfil);
              const isActive = selected?.id === c.id;
              const unread   = c.no_leidos ?? 0;
              const lastMsg  = c.ultimo_mensaje?.tipo === 'imagen' ? '[Imagen]'
                             : c.ultimo_mensaje?.tipo === 'ubicacion' ? '[Ubicación]'
                             : c.ultimo_mensaje?.tipo === 'pdf' ? '[Documento]'
                             : c.ultimo_mensaje?.tipo === 'audio' ? '[Nota de voz]'
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
                      <span style={{ ...S.contactName, fontWeight: unread > 0 ? 800 : 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {c.nombre}{c.favorito ? <Star size={12} fill="#F59E0B" color="#F59E0B" /> : null}
                      </span>
                      <span style={{ ...S.contactTime, color: unread > 0 ? '#5D91EE' : '#475569' }}>
                        {c.ultimo_mensaje ? formatTime(c.ultimo_mensaje.created_at) : ''}
                      </span>
                    </div>
                    <div style={S.contactBot}>
                      <span style={{ ...S.contactPreview, fontWeight: unread > 0 ? 600 : 400 }} title={lastMsg}>{lastMsg}</span>
                      {unread > 0 && <span style={S.unreadBadge}>{unread > 99 ? '99+' : unread}</span>}
                    </div>
                  </div>
                  <div style={S.hoverActions} className="hover-actions">
                    <button style={S.hoverBtn} onClick={e => { e.stopPropagation(); toggleFavorito(c); }} title={c.favorito ? 'Quitar' : 'Favorito'}>
                      <svg viewBox="0 0 24 24" fill={c.favorito ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="14" height="14"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                    <button style={S.hoverBtn} onClick={e => { e.stopPropagation(); toggleArchivado(c); }} title={c.archivado ? 'Desarchivar' : 'Archivar'}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                    </button>
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
                <div style={{ ...S.headerAvatar, background: ROLE_COLOR[selected.rol] ?? '#1D5FD1' }}>
                  {imgUri(selected.foto_perfil) ? <img src={imgUri(selected.foto_perfil)} alt="" style={S.avatarImg} /> : getInitials(selected.nombre)}
                  {selected.en_linea === 1 && <span style={S.onlineDot} />}
                </div>
                <div style={S.headerMeta}>
                  <div style={S.headerName}>
                    {selected.nombre}
                    <span style={{ ...S.rolePill, background: `${ROLE_COLOR[selected.rol] ?? '#1D5FD1'}22`, color: ROLE_COLOR[selected.rol] ?? '#1D5FD1' }}>{selected.rol}</span>
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
                    <svg viewBox="0 0 24 24" fill={selected.favorito ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="17" height="17"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
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
                  const mine    = !!myId && m.emisor_id === myId;
                  const tipo    = m.tipo ?? 'texto';
                  const isMedia = tipo === 'imagen' || tipo === 'ubicacion' || tipo === 'pdf' || tipo === 'audio';
                  return (
                    <div
                      key={m.id}
                      style={{ ...S.msgRow, justifyContent: mine ? 'flex-end' : 'flex-start' }}
                      onContextMenu={e => { e.preventDefault(); setCtxMenu({ msg: m, x: e.clientX, y: e.clientY }); }}
                      title="Clic derecho para más opciones"
                    >
                      <div style={{ ...S.bubbleWrap, ...(mine ? { marginLeft: 'auto' } : { marginRight: 'auto' }) }}>
                        <div style={{
                          ...S.bubble,
                          background: mine ? 'linear-gradient(135deg,#4f6ef7,#7c3aed)' : (S.bubbleOther.background as string),
                          color: mine ? '#FFF' : (S.bubbleOther.color as string),
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
                            <LocationMsg lat={m.lat} lng={m.lng} mine={mine} onOpen={(lat, lng) => setMapTarget({ lat, lng })} />
                          ) : tipo === 'pdf' ? (
                            <PdfMsg msg={m} mine={mine} onOpen={(url, nom) => setPdfTarget({ url, nombre: nom })} />
                          ) : tipo === 'audio' ? (
                            <AudioMsg msg={m} mine={mine} />
                          ) : (
                            <span style={{ lineHeight: 1.5 }}>{m.mensaje}</span>
                          )}
                        </div>
                        <ReactionsRow reacciones={m.reacciones ?? []} mine={mine} onPress={emoji => void reaccionar(m, emoji)} />
                        <div style={{ ...S.msgMeta, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                          <span>{formatTime(m.created_at)}</span>
                          {mine && <span style={{ color: m.leido ? '#5D91EE' : '#475569', marginLeft: 4, display: 'inline-flex' }}>{m.leido ? <CheckCheck size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.4} />}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {replyTarget && <ReplyBar target={replyTarget} onCancel={() => setReplyTarget(null)} />}

              <div style={S.inputBar}>
                {recording ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button type="button" onClick={cancelarGrabacion} style={{ ...S.barBtn, background: 'rgba(239,68,68,0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cancelar"><Trash2 size={16} strokeWidth={2} /></button>
                    <span style={{ width: 9, height: 9, borderRadius: 5, background: '#EF4444' }} />
                    <span style={{ fontWeight: 800, color: (S.textArea.color as string) ?? '#F1F5F9' }}>{formatDuration(recSeconds)}</span>
                    <span style={{ flex: 1, color: '#64748B', fontSize: 13 }}>Grabando nota de voz…</span>
                    <button type="button" onClick={() => void enviarGrabacion()} style={{ ...S.sendBtn, background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#FFF' }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                  </div>
                ) : (
                  <form style={S.inputForm} onSubmit={handleSend}>
                    <button type="button" style={S.barBtn} title="Adjuntar imagen" onClick={() => fileInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </button>
                    <button type="button" style={S.barBtn} title="Adjuntar PDF" onClick={() => pdfInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </button>
                    <button type="button" style={S.barBtn} title="Compartir ubicación" onClick={abrirSelectorUbicacion}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </button>
                    <textarea
                      style={S.textArea}
                      placeholder="Escribe un mensaje... (clic derecho en mensaje para más opciones)"
                      rows={1} value={msgInput} disabled={sending}
                      onChange={e => { setMsgInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); (e.target as HTMLTextAreaElement).style.height = 'auto'; } }}
                    />
                    {msgInput.trim() ? (
                      <button
                        type="submit" disabled={sending}
                        style={{ ...S.sendBtn, background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#FFF', cursor: 'pointer', transform: 'scale(1)', boxShadow: '0 4px 14px rgba(79,110,247,0.4)' }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      </button>
                    ) : (
                      <button type="button" onClick={() => void iniciarGrabacion()} style={{ ...S.sendBtn, background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#FFF' }} title="Grabar nota de voz">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div style={S.emptyMain}>
              <div style={S.emptyIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#5D91EE" strokeWidth="1.5" width="52" height="52">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={S.emptyTitle}>Tus mensajes</div>
              <div style={S.emptySub}>Selecciona una conversación, o habla con la tienda o el repartidor de tus pedidos.</div>
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

// ─── Inline styles (theme-aware) ─────────────────────────────────────────────

function makeStyles(isDark: boolean): Record<string, React.CSSProperties> {
  const pageBg       = isDark ? '#020817' : '#F0F4F8';
  const sidebarBg    = isDark ? '#0A0F1E' : '#FFFFFF';
  const sideBorder   = isDark ? '#1E293B' : '#E2E8F0';
  const chatBg       = isDark ? '#020817' : '#F0F4F8';
  const headerBg     = isDark ? '#0A0F1E' : '#FFFFFF';
  const inputBg      = isDark ? '#1E293B' : '#F1F5F9';
  const inputBorder  = isDark ? '#334155' : '#CBD5E1';
  const textPrimary  = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted    = isDark ? '#64748B' : '#94A3B8';
  const activeBg     = isDark ? '#0F172A' : '#EFF6FF';
  const dividerColor = isDark ? '#0F172A' : '#F1F5F9';
  const otherBubble  = isDark ? '#1E293B' : '#FFFFFF';
  const otherText    = isDark ? '#F1F5F9' : '#111827';
  const emptyIconBg  = isDark ? '#1E293B' : '#E2E8F0';

  return {
    page:   { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: pageBg, fontFamily: "'Manrope', -apple-system, sans-serif"},
    layout: { display: 'flex', flex: 1, overflow: 'hidden' },

    sidebar:          { width: 320, minWidth: 260, display: 'flex', flexDirection: 'column', background: sidebarBg, borderRight: `1px solid ${sideBorder}` },
    sidebarHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 16px 12px', borderBottom: `1px solid ${sideBorder}` },
    sidebarTitle:     { fontSize: 20, fontWeight: 900, color: textPrimary, letterSpacing: -0.5 },
    sidebarSub:       { fontSize: 12, color: '#5D91EE', fontWeight: 600, marginTop: 2 },
    iconBtn:          { width: 36, height: 36, borderRadius: 18, background: inputBg, color: textMuted, display: 'grid', placeItems: 'center', cursor: 'pointer' },
    searchWrap:       { display: 'flex', alignItems: 'center', gap: 8, margin: '10px 12px', background: inputBg, borderRadius: 10, padding: '8px 12px' },
    searchInput:      { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: textPrimary, fontSize: 14, fontWeight: 500 },
    tabRow:           { display: 'flex', overflowX: 'auto', borderBottom: `1px solid ${sideBorder}`, padding: '0 4px' },
    tabBtn:           { flexShrink: 0, padding: '10px 12px', fontSize: 13, fontWeight: 700, color: textMuted, background: 'none', cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 },
    tabBtnActive:     { color: '#5D91EE', borderBottomColor: '#5D91EE' },
    tabBadge:         { background: '#5D91EE', color: '#FFF', fontSize: 10, fontWeight: 900, borderRadius: 9, padding: '1px 5px' },
    contactList:      { flex: 1, overflowY: 'auto' },
    emptyList:        { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, color: textMuted },
    contactItem:      { display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: `1px solid ${dividerColor}`, position: 'relative', gap: 10 },
    contactItemActive:{ background: activeBg },
    contactAvatar:    { width: 44, height: 44, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#FFF', flexShrink: 0, position: 'relative', overflow: 'hidden' },
    avatarImg:        { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
    onlineDot:        { width: 10, height: 10, borderRadius: 5, background: '#22C55E', position: 'absolute', bottom: 1, right: 1, border: `2px solid ${sidebarBg}` },
    contactInfo:      { flex: 1, minWidth: 0 },
    contactTop:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
    contactName:      { fontSize: 14, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 },
    contactTime:      { fontSize: 11, fontWeight: 600, flexShrink: 0 },
    contactBot:       { display: 'flex', alignItems: 'center', gap: 6 },
    contactPreview:   { fontSize: 12, color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 },
    unreadBadge:      { background: '#5D91EE', color: '#FFF', fontSize: 10, fontWeight: 900, borderRadius: 9, padding: '1px 6px', flexShrink: 0 },
    hoverActions:     { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4, background: sidebarBg, borderRadius: 8, padding: '2px 4px' },
    hoverBtn:         { background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s' },

    chatMain:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: chatBg },
    chatWindow:   { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
    chatHeader:   { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: headerBg, borderBottom: `1px solid ${sideBorder}`, flexShrink: 0 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#FFF', flexShrink: 0, position: 'relative', overflow: 'hidden' },
    headerMeta:   { flex: 1 },
    headerName:   { fontSize: 16, fontWeight: 800, color: textPrimary, display: 'flex', alignItems: 'center', gap: 8 },
    rolePill:     { fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' as const },
    headerActions:{ display: 'flex', gap: 8 },
    headerBtn:    { width: 36, height: 36, borderRadius: 10, background: inputBg, color: textMuted, display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 14, transition: 'background 0.15s' },

    messagesArea: { flex: 1, overflowY: 'auto', padding: '20px 24px', background: chatBg },
    dateSep:      { textAlign: 'center' as const, fontSize: 11, color: textMuted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 20 },
    msgRow:       { display: 'flex', marginBottom: 8, width: '100%', alignItems: 'flex-end' },
    bubbleWrap:   { maxWidth: '70%' },
    bubble:       { fontSize: 14, fontWeight: 500, lineHeight: 1.5, wordBreak: 'break-word' as const, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
    bubbleOther:  { background: otherBubble, color: otherText },
    msgMeta:      { display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: 10, color: textMuted },

    inputBar:  { background: headerBg, borderTop: `1px solid ${sideBorder}`, padding: '12px 20px', flexShrink: 0 },
    inputForm: { display: 'flex', alignItems: 'flex-end', gap: 10 },
    barBtn:    { width: 38, height: 38, borderRadius: 10, background: inputBg, color: textMuted, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' },
    textArea:  { flex: 1, background: inputBg, border: `1.5px solid ${inputBorder}`, borderRadius: 12, padding: '9px 14px', color: textPrimary, fontSize: 14, fontWeight: 500, lineHeight: '20px', minHeight: 38, maxHeight: 120, overflow: 'auto' },
    sendBtn:   { width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)' },

    emptyMain:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 },
    emptyIcon:  { width: 88, height: 88, borderRadius: 44, background: emptyIconBg, display: 'grid', placeItems: 'center' },
    emptyTitle: { fontSize: 20, fontWeight: 800, color: textPrimary, letterSpacing: -0.3 },
    emptySub:   { fontSize: 14, color: textMuted, fontWeight: 500, textAlign: 'center' as const, maxWidth: 280 },

  };
}
