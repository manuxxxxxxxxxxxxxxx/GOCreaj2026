import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Star, MapPin, Bike } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useGlobal } from '../context/GlobalContext';
import { api, API_URL, SOCKET_URL } from '../api';
import '../../css/dashboards.css';
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

interface Order {
  id: string;
  client: string;
  store: string;
  address: string;
  items: string;
  total: number;
  status: 'pending' | 'picking_up' | 'active' | 'completed';
  distancia_km?: number | null;
  confirmadoRepartidor?: boolean;
  tiendaLat?: number | null;
  tiendaLng?: number | null;
  ganancia?: number;
}

interface Perfil {
  nombre: string;
  foto_perfil: string | null;
  descripcion: string | null;
  repartidor_calificacion_promedio: number;
  repartidor_total_resenas: number;
  entregas_completadas: number;
}

interface Resena {
  id: number;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  comprador_nombre: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fotoUri(foto?: string | null): string | undefined {
  if (!foto) return undefined;
  if (foto.startsWith('data:') || foto.startsWith('http')) return foto;
  const m = foto.match(/\/uploads\/(.+)$/);
  return `${API_URL}/uploads/${m ? m[1] : foto}`;
}

export default function RepartidorDashboard() {
  const navigate = useNavigate();
  const { theme } = useGlobal();
  const fileRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const leafletReady = useLeaflet();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { reconnection: true, reconnectionDelay: 1500 });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, []);

  // Perfil y reseñas (Fase 2 — Módulo 1)
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [editandoBio, setEditandoBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // Ganancias y tiempo invertido por día
  const [gananciasPorDia, setGananciasPorDia] = useState<{ fecha: string; monto: number }[]>([]);
  const [minutosPorDia, setMinutosPorDia] = useState<{ fecha: string; minutos: number }[]>([]);

  const fmtDia = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  useEffect(() => {
    api.get('/repartidor_dashboard.php?action=ganancias').then(res => {
      if (res.data.ok) {
        setGananciasPorDia((res.data.ganancias_por_dia || []).map((g: any) => ({ fecha: fmtDia(g.fecha), monto: Number(g.monto) })));
        setMinutosPorDia((res.data.minutos_por_dia || []).map((m: any) => ({ fecha: fmtDia(m.fecha), minutos: Number(m.minutos) })));
      }
    }).catch(() => {});
  }, []);

  const fetchPerfil = async () => {
    try {
      const [resP, resR] = await Promise.all([
        api.get('/repartidor_dashboard.php?action=mi_perfil'),
        api.get('/repartidor_dashboard.php?action=mis_resenas'),
      ]);
      if (resP.data.ok) { setPerfil(resP.data.perfil); setBioDraft(resP.data.perfil.descripcion || ''); }
      if (resR.data.ok) setResenas(resR.data.resenas || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { void fetchPerfil(); }, []);

  const subirFoto = async (file: File) => {
    const b64 = await fileToBase64(file);
    try {
      const res = await api.post('/repartidor_dashboard.php?action=actualizar_perfil', { foto_perfil: b64 });
      if (res.data.ok) setPerfil(prev => prev ? { ...prev, foto_perfil: res.data.foto_perfil } : prev);
    } catch (e) { console.error(e); }
  };

  const guardarBio = async () => {
    setGuardandoPerfil(true);
    try {
      const res = await api.post('/repartidor_dashboard.php?action=actualizar_perfil', { descripcion: bioDraft });
      if (res.data.ok) {
        setPerfil(prev => prev ? { ...prev, descripcion: bioDraft } : prev);
        setEditandoBio(false);
      }
    } catch (e) { console.error(e); }
    setGuardandoPerfil(false);
  };

  // Availability Toggle
  const [isAvailable, setIsAvailable] = useState(true);

  // Stats State
  const [earnings, setEarnings] = useState(0);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const [timeAvg] = useState(24);

  // Available and Active Orders lists
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([]);

  // Toast System
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    fetchData();
    // In a real app we would poll or use WebSockets
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Mapa de pedidos disponibles (tiendas solicitando delivery) ──────────────
  useEffect(() => {
    if (!leafletReady || !mapEl.current || mapObj.current) return;
    const L = window.L;
    const map = L.map(mapEl.current, { center: [13.7, -89.2], zoom: 12, zoomControl: true });
    L.tileLayer(theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CartoDB', subdomains: 'abcd', maxZoom: 19,
    }).addTo(map);
    mapObj.current = map;
  }, [leafletReady, theme]);

  useEffect(() => {
    if (!mapObj.current || !window.L) return;
    const L = window.L;
    markersRef.current.forEach(m => mapObj.current.removeLayer(m));
    markersRef.current = [];

    const conCoords = availableOrders.filter(o => o.tiendaLat != null && o.tiendaLng != null);
    conCoords.forEach(o => {
      const activo = selectedOrderId === o.id;
      const marker = L.marker([o.tiendaLat, o.tiendaLng], {
        icon: L.divIcon({
          className: '', iconSize: [30, 30], iconAnchor: [15, 15],
          html: `<div style="background:${activo ? '#16A34A' : '#1D5FD1'};color:#fff;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid #fff;">
                  <svg style="transform:rotate(45deg)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/></svg></div>`,
        }),
      })
        .addTo(mapObj.current)
        .bindTooltip(`${o.store} · $${(o.ganancia ?? 0).toFixed(2)}`)
        .on('click', () => setSelectedOrderId(o.id));
      markersRef.current.push(marker);
    });

    if (conCoords.length > 0) {
      const bounds = conCoords.map(o => [o.tiendaLat, o.tiendaLng]);
      mapObj.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [availableOrders, selectedOrderId]);

  // Mientras está disponible, reporta su posición (usada por "repartidores cercanos" y el orden por distancia).
  useEffect(() => {
    if (!isAvailable || !navigator.geolocation) return;
    const enviar = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        const municipio = localStorage.getItem('svgo_municipio') || 'San Salvador';
        api.post('/auth.php?action=actualizar_ubicacion', {
          municipio, lat: pos.coords.latitude, lng: pos.coords.longitude,
        }).catch(() => {});
      }, () => {});
    };
    enviar();
    const iv = setInterval(enviar, 45000);
    return () => clearInterval(iv);
  }, [isAvailable]);

  // Mientras hay una entrega "en_camino", reporta la ubicación EXACTA del repartidor para
  // ESE pedido — es lo que la tienda y el comprador ven en vivo en su mapa de rastreo
  // (antes esto nunca se enviaba desde el dashboard web del repartidor).
  const idsEnCamino = activeDeliveries.filter(o => o.status === 'active').map(o => o.id).join(',');
  useEffect(() => {
    if (!idsEnCamino || !navigator.geolocation) return;
    const ids = idsEnCamino.split(',');
    const enviarUbicacionPedidos = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        ids.forEach(async pid => {
          try {
            const res = await api.post('/pedidos_tracking.php?action=actualizar_ubicacion', { pedido_id: Number(pid), lat: latitude, lng: longitude });
            socketRef.current?.emit('pedido-ubicacion', {
              pedidoId: Number(pid), lat: latitude, lng: longitude,
              tiempo_estimado: res.data?.tracking?.tiempo_estimado, trafico: res.data?.tracking?.trafico,
            });
          } catch {}
        });
      }, () => {});
    };
    enviarUbicacionPedidos();
    const iv = setInterval(enviarUbicacionPedidos, 10000);
    return () => clearInterval(iv);
  }, [idsEnCamino]);

  const fetchData = async () => {
    try {
      const resDisp = await api.get('/repartidor_dashboard.php?action=disponibles');
      if (resDisp.data.ok) {
        setAvailableOrders(resDisp.data.pedidos.map((p: any) => ({
          id: p.id.toString(),
          client: p.comprador_nombre || 'Cliente',
          store: p.tienda_nombre || p.vendedor_nombre || 'Tienda',
          address: p.direccion_entrega || 'Dirección no especificada',
          items: (p.items || []).map((it: any) => `${it.cantidad}× ${it.nombre}`).join(', ') || 'Sin detalle de artículos',
          total: parseFloat(p.total),
          status: 'pending',
          distancia_km: p.distancia_km ?? null,
          tiendaLat: p.tienda_lat != null ? Number(p.tienda_lat) : null,
          tiendaLng: p.tienda_lng != null ? Number(p.tienda_lng) : null,
          ganancia: p.ganancia_repartidor != null ? Number(p.ganancia_repartidor) : undefined,
        })));
      }

      const resMis = await api.get('/repartidor_dashboard.php?action=mis_entregas');
      if (resMis.data.ok) {
        const myOrders = resMis.data.pedidos;
        const active = myOrders
          .filter((p: any) => p.estado === 'en_camino' || p.estado === 'preparacion')
          .map((p: any) => ({
            id: p.id.toString(),
            client: p.comprador_nombre || 'Cliente',
            store: p.vendedor_nombre || 'Tienda',
            address: p.direccion_entrega || 'Dirección no especificada',
            items: 'Artículos varios',
            total: parseFloat(p.total),
            status: p.estado === 'en_camino' ? 'active' : 'picking_up',
            confirmadoRepartidor: !!p.confirmado_repartidor_recogida,
          }));
        setActiveDeliveries(active);

        const completed = myOrders.filter((p: any) => p.estado === 'entregado');
        setDeliveriesCount(completed.length);
        setEarnings(completed.length * 3.50); // Simulated $3.50 per delivery
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDisponibilidad = async () => {
    const nuevo = !isAvailable;
    setIsAvailable(nuevo);
    try {
      await api.post('/repartidor_dashboard.php?action=toggle_en_linea', { en_linea: nuevo });
    } catch (e) { console.error(e); setIsAvailable(!nuevo); }
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleRejectOrder = async (order: Order) => {
    try {
      await api.post('/repartidor_dashboard.php?action=rechazar', { pedido_id: order.id });
      setAvailableOrders(prev => prev.filter(o => o.id !== order.id));
      if (selectedOrderId === order.id) setSelectedOrderId(null);
      triggerToast('Pedido descartado. No volverá a aparecer en tu lista.');
    } catch (e) { console.error(e); }
  };

  const handleAcceptOrder = async (order: Order) => {
    if (!isAvailable) {
      triggerToast('Activa tu disponibilidad para aceptar pedidos.');
      return;
    }
    try {
      const res = await api.post('/repartidor_dashboard.php?action=aceptar', { pedido_id: order.id });
      if (res.data.ok) {
        socketRef.current?.emit('pedido-estado-cambio', { pedidoId: Number(order.id), estado: 'preparacion' });
        fetchData();
        triggerToast('Pedido aceptado. Ve a recogerlo a la tienda y confirma ahí.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmarRecogida = async (order: Order) => {
    try {
      const res = await api.post('/repartidor_dashboard.php?action=confirmar_recogida', { pedido_id: order.id });
      if (res.data.ok) {
        socketRef.current?.emit('pedido-estado-cambio', { pedidoId: Number(order.id), estado: res.data.en_camino ? 'en_camino' : 'preparacion' });
        fetchData();
        triggerToast(res.data.en_camino ? '¡Recogida confirmada — pedido en camino!' : 'Recogida confirmada. Esperando que la tienda confirme también.');
      }
    } catch (e) { console.error(e); }
  };

  const handleCompleteDelivery = async (order: Order) => {
    try {
      const res = await api.post('/repartidor_dashboard.php?action=completar', { pedido_id: order.id });
      if (res.data.ok) {
        socketRef.current?.emit('pedido-estado-cambio', { pedidoId: Number(order.id), estado: 'entregado' });
        fetchData();
        triggerToast('Pedido entregado exitosamente. +$3.50');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="historial-main-wrapper">
      <Header />

      {/* ══ MAIN ══ */}
      <div className="dash-wrap">
        {/* Header */}
        <div className="dash-header">
          <div className="dash-header-left">
            <h1 className="page-title">Dashboard del Repartidor</h1>
            <p className="driver-subtitle">
              Hola, <strong>{perfil?.nombre ?? '...'}</strong> — bienvenido de vuelta
            </p>
          </div>
          <div className="availability-wrap">
            <span className={`avail-label ${isAvailable ? 'active' : ''}`}>
              {isAvailable ? '● Conectado / Disponible' : '○ Desconectado'}
            </span>
            <button 
              className={`toggle-pill ${isAvailable ? 'active' : ''}`} 
              onClick={toggleDisponibilidad} 
              aria-label="Alternar disponibilidad"
            >
              <span className="pill-track"></span>
              <span className="pill-thumb"></span>
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="stat-label">Ganancias Hoy</div>
            <div className="stat-value green-val">${earnings.toFixed(2)}</div>
            <div className="stat-sub">Ingresos del día</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div className="stat-label">Entregas Hoy</div>
            <div className="stat-value">{deliveriesCount}</div>
            <div className="stat-sub">Pedidos completados</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div className="stat-label">Calificación</div>
            <div className="stat-value">{perfil?.repartidor_calificacion_promedio ? Number(perfil.repartidor_calificacion_promedio).toFixed(1) : '—'}</div>
            <div className="stat-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Star size={11} strokeWidth={2} fill="currentColor" />{perfil?.repartidor_total_resenas ?? 0} reseñas</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="stat-label">Tiempo Promedio</div>
            <div className="stat-value">{timeAvg} min</div>
            <div className="stat-sub">por cada entrega</div>
          </div>
        </div>

        {/* Entregas Activas — ancho completo */}
        <div className="panel-card" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <span className="panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--blue)' }}>
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              Entregas Activas
            </span>
            <span className="panel-badge">{activeDeliveries.length}</span>
          </div>
          <div className="panel-body">
            {activeDeliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No tienes entregas en curso. Acepta un pedido disponible más abajo.
              </div>
            ) : (
              activeDeliveries.map(o => (
                <div key={o.id} className="dash-item-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="dash-item-left">
                      <span className="dash-item-emoji">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      </span>
                      <div className="dash-item-info">
                        <h4>Pedido #{o.id} - {o.store}</h4>
                        <p>{o.items}</p>
                      </div>
                    </div>
                    <span className="dash-item-status active">{o.status === 'picking_up' ? 'Recogiendo en tienda' : 'En camino'}</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>Entregar a:</strong> {o.client} <br />
                    <strong>Dirección:</strong> {o.address}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>Monto: ${o.total.toFixed(2)}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-primary" onClick={() => navigate('/chat')} style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Chat
                      </button>
                      {o.status === 'active' && (
                        <button onClick={() => navigate(`/entregas/${o.id}`)} style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1.5px solid var(--border, #E2E8F0)', borderRadius: 10, color: 'var(--text)', cursor: 'pointer', fontWeight: 700 }}>
                          <MapPin size={13} strokeWidth={2.2} />Ver ubicación
                        </button>
                      )}
                      {o.status === 'picking_up' ? (
                        o.confirmadoRepartidor ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', alignSelf: 'center' }}>Esperando a la tienda…</span>
                        ) : (
                          <button className="btn-primary" onClick={() => handleConfirmarRecogida(o)} style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                            Confirmar recogida
                          </button>
                        )
                      ) : (
                        <button className="btn-primary" onClick={() => handleCompleteDelivery(o)} style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                          Entregar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pedidos disponibles: mapa a la izquierda, lista a la derecha */}
        <div className="dash-columns">
          {/* LEFT: Mapa de tiendas solicitando delivery */}
          <div className="panel-card" style={{ minHeight: 480 }}>
            <div className="panel-header">
              <span className="panel-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--green)' }}>
                  <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
                </svg>
                Mapa de solicitudes
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 420, position: 'relative' }}>
              {!leafletReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Cargando mapa...
                </div>
              )}
              <div ref={mapEl} style={{ width: '100%', height: '100%', minHeight: 420 }} />
            </div>
          </div>

          {/* RIGHT: Pedidos Disponibles */}
          <div className="panel-card">
            <div className="panel-header">
              <span className="panel-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--green)' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Pedidos Disponibles en Zona
              </span>
              <span className="panel-badge green">{availableOrders.length}</span>
            </div>
            <div className="panel-body">
              {availableOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Buscando nuevos pedidos cercanos...
                </div>
              ) : (
                availableOrders.map(o => (
                  <div
                    key={o.id}
                    className="dash-item-row"
                    onClick={() => setSelectedOrderId(o.id)}
                    style={{
                      flexDirection: 'column', alignItems: 'stretch', gap: '12px', cursor: 'pointer',
                      border: selectedOrderId === o.id ? '2px solid var(--green)' : undefined,
                      borderRadius: selectedOrderId === o.id ? 12 : undefined,
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="dash-item-left">
                        <span className="dash-item-emoji">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        </span>
                        <div className="dash-item-info">
                          <h4>Pedido #{o.id} - {o.store}</h4>
                          <p>{o.items}</p>
                        </div>
                      </div>
                      <span className="dash-item-status avail">Disponible</span>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <strong>Tienda:</strong> {o.store} <br />
                      <strong>Destino:</strong> {o.address}
                      {o.distancia_km != null && <><br /><strong>Distancia:</strong> {o.distancia_km} km</>}
                    </div>
                    {o.ganancia != null && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--green)', fontWeight: 700 }}>
                        Ganas ${o.ganancia.toFixed(2)} por esta entrega
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>Monto: ${o.total.toFixed(2)}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRejectOrder(o); }}
                          style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1.5px solid var(--border, #E2E8F0)', borderRadius: 10, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700 }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          Rechazar
                        </button>
                        <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleAcceptOrder(o); }} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                          Aceptar Entrega
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Mi Perfil — foto, bio, reseñas (Fase 2 · Módulo 1) */}
        <div className="panel-card" style={{ marginTop: '24px' }}>
          <div className="panel-header">
            <span className="panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--blue)' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Mi Perfil
            </span>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: 84, height: 84, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer',
                    background: 'var(--bg)', border: '2px solid var(--border, #E2E8F0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Cambiar foto de perfil"
                >
                  {perfil?.foto_perfil
                    ? <img src={fotoUri(perfil.foto_perfil)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--blue)' }}>{(perfil?.nombre ?? 'R').charAt(0).toUpperCase()}</span>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) void subirFoto(f); }} />
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>{perfil?.nombre}</div>
                <div style={{ display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={13} strokeWidth={2} fill="#F59E0B" color="#F59E0B" />{perfil?.repartidor_calificacion_promedio ? Number(perfil.repartidor_calificacion_promedio).toFixed(1) : '—'} ({perfil?.repartidor_total_resenas ?? 0})</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Bike size={13} strokeWidth={2.2} />{perfil?.entregas_completadas ?? 0} entregas completadas</span>
                </div>

                {!editandoBio ? (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)' }}>
                      {perfil?.descripcion || 'Sin descripción todavía.'}
                    </p>
                    <button className="btn-primary" onClick={() => setEditandoBio(true)} style={{ marginTop: '8px', padding: '6px 12px', fontSize: '0.78rem' }}>
                      Editar descripción
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '10px' }}>
                    <textarea
                      value={bioDraft}
                      onChange={e => setBioDraft(e.target.value)}
                      placeholder="Cuéntale a tus clientes sobre ti..."
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border, #E2E8F0)', fontFamily: 'inherit', fontSize: '0.88rem', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button className="btn-primary" onClick={guardarBio} disabled={guardandoPerfil} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        {guardandoPerfil ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => { setEditandoBio(false); setBioDraft(perfil?.descripcion || ''); }} style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'transparent', border: '1.5px solid var(--border, #E2E8F0)', borderRadius: '10px', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Reseñas de clientes
              </div>
              {resenas.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aún no tienes reseñas.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {resenas.map(r => (
                    <div key={r.id} style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{r.comprador_nombre}</strong>
                        <span style={{ display: 'flex', gap: 2, color: '#F59E0B' }}>
                          {Array.from({ length: r.estrellas }).map((_, i) => <Star key={i} size={13} strokeWidth={0} fill="#F59E0B" />)}
                        </span>
                      </div>
                      {r.comentario && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.comentario}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ganancias y tiempo invertido por día */}
        <div className="panel-card" style={{ marginTop: '24px' }}>
          <div className="panel-header">
            <span className="panel-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--blue)' }}>
                <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
              Ganancias y tiempo
            </span>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Dinero ganado por día</div>
              {gananciasPorDia.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aún no tienes entregas completadas para graficar.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={gananciasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E2E8F0)" />
                    <XAxis dataKey="fecha" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Ganado']} />
                    <Line type="monotone" dataKey="monto" stroke="var(--blue, #1D5FD1)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Tiempo invertido por día (minutos)</div>
              {minutosPorDia.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aún no hay suficientes datos de tiempo de entrega.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={minutosPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #E2E8F0)" />
                    <XAxis dataKey="fecha" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v: number) => `${v}m`} />
                    <Tooltip formatter={(v: number) => [`${v} min`, 'Tiempo']} />
                    <Line type="monotone" dataKey="minutos" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div className={`lm-toast ${showToast ? 'show' : ''}`} style={{ background: '#111111', color: '#fff', borderRadius: '16px', display: 'flex', gap: '12px', padding: '14px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{toastMsg}</span>
      </div>

      <Footer />
    </div>
  );
}
