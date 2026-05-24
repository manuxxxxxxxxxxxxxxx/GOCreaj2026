import { useState, useEffect } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
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
  emoji: string;
}

export default function RepartidorDashboard() {
  const { theme, toggleTheme } = useGlobal();
  const navigate = useNavigate();

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
          status: 'pending',
          emoji: '📦'
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
          status: 'active',
          emoji: '🛵'
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

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleAcceptOrder = async (order: Order) => {
    if (!isAvailable) {
      triggerToast('⚠️ Activa tu disponibilidad para aceptar pedidos.');
      return;
    }
    try {
      const res = await api.post('/repartidor_dashboard.php?action=aceptar', { pedido_id: order.id });
      if (res.data.ok) {
        fetchData();
        triggerToast('🛵 ¡Pedido aceptado! Recoge en la tienda.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteDelivery = async (order: Order) => {
    try {
      const res = await api.post('/repartidor_dashboard.php?action=completar', { pedido_id: order.id });
      if (res.data.ok) {
        fetchData();
        triggerToast('✅ ¡Pedido entregado con éxito! +$3.50');
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
              Hola, <strong>Carlos Reparto</strong> — bienvenido de vuelta
            </p>
          </div>
          <div className="availability-wrap">
            <span className={`avail-label ${isAvailable ? 'active' : ''}`}>
              {isAvailable ? '● Conectado / Disponible' : '○ Desconectado'}
            </span>
            <button 
              className={`toggle-pill ${isAvailable ? 'active' : ''}`} 
              onClick={() => setIsAvailable(!isAvailable)} 
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
            <div className="stat-value">4.9</div>
            <div className="stat-sub">★ Promedio general</div>
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
                        <span className="dash-item-emoji">{o.emoji}</span>
                        <div className="dash-item-info">
                          <h4>Pedido #{o.id} - {o.store}</h4>
                          <p>{o.items}</p>
                        </div>
                      </div>
                      <span className="dash-item-status active">En camino</span>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      📍 <strong>Entregar a:</strong> {o.client} <br />
                      🏡 <strong>Dirección:</strong> {o.address}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>Monto: ${o.total.toFixed(2)}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-primary" onClick={() => navigate('/chat')} style={{ padding: '6px 12px', fontSize: '0.78rem' }}>💬 Chat</button>
                        <button className="btn-primary" onClick={() => handleCompleteDelivery(o)} style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'var(--green)' }}>✓ Entregar</button>
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
                        <span className="dash-item-emoji">{o.emoji}</span>
                        <div className="dash-item-info">
                          <h4>Pedido #{o.id} - {o.store}</h4>
                          <p>{o.items}</p>
                        </div>
                      </div>
                      <span className="dash-item-status avail">Disponible</span>
                    </div>
                    <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      🏢 <strong>Tienda:</strong> {o.store} <br />
                      📍 <strong>Destino:</strong> {o.address}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>Monto: ${o.total.toFixed(2)}</span>
                      <button className="btn-primary" onClick={() => handleAcceptOrder(o)} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>🛵 Aceptar Entrega</button>
                    </div>
                  </div>
                ))
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
