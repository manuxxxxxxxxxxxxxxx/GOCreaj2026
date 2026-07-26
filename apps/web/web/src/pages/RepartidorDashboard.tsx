import { useState, useEffect, useRef } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { api, API_URL, SOCKET_URL } from '../api';
import '../../css/index.css';
import '../../css/dashboards.css';
import '../../css/dark.css';

interface Order {
  id: string;
  client: string;
  store: string;
  address: string;
  items: string;
  total: number;
  status: 'pending' | 'active' | 'completed';
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
  const { theme, toggleTheme } = useGlobal();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

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

  const fetchData = async () => {
    try {
      const resDisp = await api.get('/repartidor_dashboard.php?action=disponibles');
      if (resDisp.data.ok) {
        setAvailableOrders(resDisp.data.pedidos.map((p: any) => ({
          id: p.id.toString(),
          client: p.comprador_nombre || 'Cliente',
          store: p.vendedor_nombre || 'Tienda',
          address: p.direccion_entrega || 'Dirección no especificada',
          items: 'Artículos varios',
          total: parseFloat(p.total),
          status: 'pending'
        })));
      }

      const resMis = await api.get('/repartidor_dashboard.php?action=mis_entregas');
      if (resMis.data.ok) {
        const myOrders = resMis.data.pedidos;
        const active = myOrders.filter((p: any) => p.estado === 'en_camino').map((p: any) => ({
          id: p.id.toString(),
          client: p.comprador_nombre || 'Cliente',
          store: p.vendedor_nombre || 'Tienda',
          address: p.direccion_entrega || 'Dirección no especificada',
          items: 'Artículos varios',
          total: parseFloat(p.total),
          status: 'active'
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

  const handleAcceptOrder = async (order: Order) => {
    if (!isAvailable) {
      triggerToast('Activa tu disponibilidad para aceptar pedidos.');
      return;
    }
    try {
      const res = await api.post('/repartidor_dashboard.php?action=aceptar', { pedido_id: order.id });
      if (res.data.ok) {
        socketRef.current?.emit('pedido-estado-cambio', { pedidoId: Number(order.id), estado: 'en_camino' });
        fetchData();
        triggerToast('Pedido aceptado. Recoge en la tienda.');
      }
    } catch (e) {
      console.error(e);
    }
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
      {/* ══ NAV ══ */}
      <nav>
        <a onClick={() => navigate('/')} style={{ cursor: 'pointer' }} className="nav-logo">
          <div className="logo-icon" style={{ background: '#4A6D8C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1rem', letterSpacing: '-0.5px' }}>
            SV
          </div>
          <span className="logo-text">GO</span>
        </a>
        <ul className="nav-links">
          <li><a onClick={() => navigate('/market')} style={{ cursor: 'pointer' }}>Marketplace</a></li>
          <li><a onClick={() => navigate('/reels')} style={{ cursor: 'pointer' }}>Reels</a></li>
          <li><a onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>Mensajes</a></li>
        </ul>
        <div className="nav-right">
          <button 
            className="lm-theme-toggle" 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'light' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <circle cx="12" cy="12" r="5" fill="currentColor"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            )}
          </button>
          <button className="lm-theme-toggle" onClick={() => navigate('/login')} title="Cerrar sesión" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </nav>

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
            <div className="stat-sub">★ {perfil?.repartidor_total_resenas ?? 0} reseñas</div>
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

        {/* Two-column panels */}
        <div className="dash-columns">
          {/* LEFT: Entregas Activas */}
          <div className="panel-card">
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
                  No tienes entregas en curso. Acepta pedidos a la derecha.
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
                      <span className="dash-item-status active">En camino</span>
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
                        <button className="btn-primary" onClick={() => handleCompleteDelivery(o)} style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                          Entregar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
                  <div key={o.id} className="dash-item-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
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
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>Monto: ${o.total.toFixed(2)}</span>
                      <button className="btn-primary" onClick={() => handleAcceptOrder(o)} style={{ padding: '8px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                        Aceptar Entrega
                      </button>
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
                  <span>★ {perfil?.repartidor_calificacion_promedio ? Number(perfil.repartidor_calificacion_promedio).toFixed(1) : '—'} ({perfil?.repartidor_total_resenas ?? 0})</span>
                  <span>🚴 {perfil?.entregas_completadas ?? 0} entregas completadas</span>
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
                        <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.85rem' }}>{'★'.repeat(r.estrellas)}</span>
                      </div>
                      {r.comentario && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.comentario}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <div className={`lm-toast ${showToast ? 'show' : ''}`} style={{ background: '#111111', color: '#fff', borderRadius: '16px', display: 'flex', gap: '12px', padding: '14px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{toastMsg}</span>
      </div>
    </div>
  );
}
