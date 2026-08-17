import { useEffect, useRef, useState, useCallback } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Star, Phone, MessageCircle } from 'lucide-react';
import Header from '../components/Header';
import { api, API_URL, SOCKET_URL } from '../api';
import '../../css/entregas.css';
import '../../css/dark.css';

declare global { interface Window { L: any } }
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function useLeaflet() {
  const [ready, setReady] = useState(!!window.L);
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = LEAFLET_CSS;
      document.head.appendChild(l);
    }
    if (document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const t = setInterval(() => { if (window.L) { setReady(true); clearInterval(t); } }, 50);
      return () => clearInterval(t);
    }
    const s = document.createElement('script');
    s.src = LEAFLET_JS; s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);
  return ready;
}

function fotoUri(foto?: string | null): string | undefined {
  if (!foto) return undefined;
  if (foto.startsWith('data:') || foto.startsWith('http')) return foto;
  const m = foto.match(/\/uploads\/(.+)$/);
  return `${API_URL}/uploads/${m ? m[1] : foto}`;
}

interface Pedido {
  id: number;
  estado: 'preparacion' | 'en_camino' | 'entregado' | 'rechazado_repartidor' | 'cancelado';
  total: number;
  direccion_entrega: string;
  lat_entrega?: number | null;
  lng_entrega?: number | null;
  repartidor_lat?: number | null;
  repartidor_lng?: number | null;
  tienda_lat?: number | null;
  tienda_lng?: number | null;
  tienda_nombre?: string;
  vendedor_nombre?: string;
  repartidor_id?: number | null;
  repartidor_nombre?: string | null;
  repartidor_foto?: string | null;
  repartidor_telefono?: string | null;
  repartidor_calificacion_promedio?: number;
  repartidor_total_resenas?: number;
  repartidor_entregas_completadas?: number;
  tiempo_estimado?: number | null;
  trafico?: string | null;
}

const ETAPAS = [
  { key: 'preparacion', label: 'Pedido confirmado' },
  { key: 'preparando', label: 'En preparación' },
  { key: 'en_camino', label: 'En camino' },
  { key: 'entregado', label: 'Entregado' },
] as const;

function etapaIdx(estado: string): number {
  if (estado === 'preparacion') return 1;
  if (estado === 'en_camino') return 2;
  if (estado === 'entregado') return 3;
  return 0;
}

export default function Entregas() {
  const { theme } = useGlobal();
  const navigate = useNavigate();
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const leafletReady = useLeaflet();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const cargar = useCallback(async () => {
    if (!pedidoId) { setCargando(false); return; }
    try {
      const res = await api.get(`/pedidos_tracking.php?action=estado&pedido_id=${pedidoId}`);
      if (res.data.ok) setPedido(res.data.pedido);
    } catch (e) { console.error(e); }
    setCargando(false);
  }, [pedidoId]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Poll de respaldo, baja frecuencia — el socket lleva el peso del refresco
  useEffect(() => {
    const iv = setInterval(() => void cargar(), 15000);
    return () => clearInterval(iv);
  }, [cargar]);

  // Sync tri-party en tiempo real
  useEffect(() => {
    if (!pedidoId) return;
    const socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1500 });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-pedido', { pedidoId: Number(pedidoId) }));
    socket.on('pedido-estado-cambio', () => { void cargar(); });
    socket.on('pedido-ubicacion', (payload: { lat: number; lng: number; tiempo_estimado?: number; trafico?: string }) => {
      setPedido(prev => prev ? {
        ...prev,
        repartidor_lat: payload.lat,
        repartidor_lng: payload.lng,
        tiempo_estimado: payload.tiempo_estimado ?? prev.tiempo_estimado,
        trafico: payload.trafico ?? prev.trafico,
      } : prev);
    });
    return () => { socket.emit('leave-pedido', { pedidoId: Number(pedidoId) }); socket.disconnect(); };
  }, [pedidoId, cargar]);

  // Init mapa
  useEffect(() => {
    if (!leafletReady || !mapEl.current || mapObj.current) return;
    const L = window.L;
    const map = L.map(mapEl.current, { center: [13.7, -89.2], zoom: 13, zoomControl: true });
    L.tileLayer(theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB', subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    mapObj.current = map;
  }, [leafletReady, theme]);

  // Actualiza marcadores cuando cambia el pedido
  useEffect(() => {
    if (!mapObj.current || !window.L || !pedido) return;
    const L = window.L;
    markersRef.current.forEach(m => mapObj.current.removeLayer(m));
    markersRef.current = [];

    const tiendaLat = pedido.tienda_lat ?? 13.6929;
    const tiendaLng = pedido.tienda_lng ?? -89.2182;
    const clienteLat = pedido.lat_entrega ?? tiendaLat;
    const clienteLng = pedido.lng_entrega ?? tiendaLng;

    const mTienda = L.marker([tiendaLat, tiendaLng]).addTo(mapObj.current).bindTooltip(pedido.tienda_nombre ?? 'Tienda');
    const mCliente = L.marker([clienteLat, clienteLng]).addTo(mapObj.current).bindTooltip('Tu ubicación');
    markersRef.current.push(mTienda, mCliente);

    let bounds = [[tiendaLat, tiendaLng], [clienteLat, clienteLng]];
    if (pedido.repartidor_lat && pedido.repartidor_lng) {
      const mRep = L.marker([pedido.repartidor_lat, pedido.repartidor_lng], {
        icon: L.divIcon({ className: '', html: '<div style="background:#2563EB;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>', iconSize: [16, 16] }),
      }).addTo(mapObj.current).bindTooltip(pedido.repartidor_nombre ?? 'Repartidor');
      markersRef.current.push(mRep);
      bounds = [...bounds, [pedido.repartidor_lat, pedido.repartidor_lng]] as any;
    }
    mapObj.current.fitBounds(bounds, { padding: [40, 40] });
  }, [pedido]);

  const c = theme === 'dark' ? '#3B82F6' : '#2563EB';

  return (
    <>
      <Header />

      <div className="del-wrap">
        <div className="del-header">
          <div>
            <h1>Seguimiento de Entrega</h1>
            <p className="subt">
              {pedido ? <>Pedido <strong id="del-order-id">#SV-{pedido.id}</strong> · </> : null}
              <span>En tiempo real</span>
              {pedido && pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && (
                <span className="live-pill"><span className="live-dot"></span> Activo</span>
              )}
            </p>
          </div>
          <div className="header-actions">
            <button className="btn-ghost" onClick={() => navigate('/historial')}>Volver</button>
          </div>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-light)' }}>Cargando pedido...</div>
        ) : !pedido ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-light)' }}>No se encontró el pedido.</div>
        ) : (
          <div id="del-content" style={{ marginTop: 20 }}>
            <div className="layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              <div className="main-col">
                <div className="card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: 16 }}>Mapa de seguimiento</h3>
                  <div ref={mapEl} style={{ height: 400, borderRadius: 8, background: '#eee' }} />
                  {pedido.tiempo_estimado != null && pedido.estado === 'en_camino' && (
                    <p style={{ marginTop: 12, fontSize: '0.9rem', color: 'var(--text-light)' }}>
                      ⏱️ Llega en aproximadamente <strong>{pedido.tiempo_estimado} min</strong>
                      {pedido.trafico ? ` · Tráfico: ${pedido.trafico}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="side-col" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card status-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: 16 }}>Estado del pedido</h3>
                  <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                    {ETAPAS.map((etapa, i) => {
                      const idx = etapaIdx(pedido.estado);
                      const done = i < idx;
                      const active = i === idx;
                      return (
                        <div key={etapa.key} style={{ position: 'relative', marginBottom: i < ETAPAS.length - 1 ? 24 : 0 }}>
                          <div style={{
                            position: 'absolute', left: -19, top: 4, width: active ? 16 : 12, height: active ? 16 : 12,
                            borderRadius: '50%',
                            background: done ? 'var(--green)' : active ? 'var(--bg-card)' : 'var(--border)',
                            border: active ? `4px solid ${c}` : 'none',
                          }} />
                          <div style={{ fontWeight: 600, color: active ? c : done ? 'inherit' : 'var(--text-light)' }}>{etapa.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {pedido.repartidor_nombre ? (
                  <div className="card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <h3 style={{ marginBottom: 16 }}>Tu repartidor</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: c, flexShrink: 0 }}>
                        {pedido.repartidor_foto
                          ? <img src={fotoUri(pedido.repartidor_foto)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : pedido.repartidor_nombre.charAt(0).toUpperCase()
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{pedido.repartidor_nombre}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={13} strokeWidth={2} fill="#F59E0B" color="#F59E0B" />{pedido.repartidor_calificacion_promedio ? Number(pedido.repartidor_calificacion_promedio).toFixed(1) : '—'} ({pedido.repartidor_total_resenas ?? 0}) · {pedido.repartidor_entregas_completadas ?? 0} entregas
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      {pedido.repartidor_telefono && (
                        <a href={`tel:${pedido.repartidor_telefono}`} className="btn-ghost" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Phone size={14} strokeWidth={2.2} />Llamar</a>
                      )}
                      <button className="btn-primary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => navigate('/chat')}><MessageCircle size={14} strokeWidth={2.2} />Chat</button>
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    Aún no se ha asignado un repartidor a tu pedido.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
