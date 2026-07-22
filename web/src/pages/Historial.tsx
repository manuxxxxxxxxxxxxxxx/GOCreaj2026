import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import Header from '../components/Header';
import '../../css/historial.css';
import '../../css/dark.css';

// ── Buyer history data ─────────────────────────────────────────────────────
const BUYER_ORDERS = [
  {
    id: '100452', date: 'Hoy, 14:30', status: 'entregado', total: 12.50,
    items: [
      { emoji: '🥖', name: 'Pan Artesanal Integral', qty: 1, price: 4.05 },
      { emoji: '☕', name: 'Café Premium 250g', qty: 1, price: 8.45 }
    ],
    driver: { name: 'Carlos Reparto', avatar: '🛵' }
  },
  {
    id: '100451', date: 'Ayer, 09:15', status: 'entregado', total: 25.00,
    items: [{ emoji: '🏺', name: 'Artesanías Decorativas', qty: 1, price: 25.00 }],
    driver: { name: 'Carlos Reparto', avatar: '🛵' }
  },
  {
    id: '100450', date: '12 May, 18:40', status: 'en_camino', total: 8.75,
    items: [{ emoji: '🥦', name: 'Verduras Orgánicas Mix', qty: 1, price: 8.75 }],
    driver: { name: 'Carlos Reparto', avatar: '🛵' }
  }
];

// ── Seller history data ────────────────────────────────────────────────────
const SELLER_ORDERS = [
  {
    id: '200301', date: 'Hoy, 15:00', status: 'entregado', total: 17.50,
    cliente: 'María Fernanda', items: '2x Café Premium 250g', emoji: '☕', comision: 1.75
  },
  {
    id: '200300', date: 'Hoy, 12:30', status: 'entregado', total: 4.05,
    cliente: 'Alejandro Cabrera', items: '1x Pan Artesanal Integral', emoji: '🥖', comision: 0.41
  },
  {
    id: '200299', date: 'Ayer, 10:00', status: 'entregado', total: 24.00,
    cliente: 'Sofía Alvarado', items: '2x Mix Verduras Orgánicas', emoji: '🥦', comision: 2.40
  },
  {
    id: '200298', date: 'Ayer, 08:15', status: 'cancelado', total: 8.75,
    cliente: 'Diego Ramos', items: '1x Café Premium 250g', emoji: '☕', comision: 0
  }
];

// ── Driver history data ────────────────────────────────────────────────────
const DRIVER_DELIVERIES = [
  {
    id: '300401', date: 'Hoy, 15:30', status: 'entregado', ganancia: 3.50,
    tienda: 'Panadería Don José', destino: 'Av. Masferrer #102, Escalón',
    cliente: 'Alejandro Cabrera', tiempo: '18 min', calificacion: 5, emoji: '🥖'
  },
  {
    id: '300400', date: 'Hoy, 13:45', status: 'entregado', ganancia: 3.50,
    tienda: 'Huerto Verde', destino: 'Calle Circunvalación #45, Escalón',
    cliente: 'María Fernanda', tiempo: '22 min', calificacion: 5, emoji: '🥦'
  },
  {
    id: '300399', date: 'Ayer, 18:00', status: 'entregado', ganancia: 4.00,
    tienda: 'Artesanías El Pulgarcito', destino: 'Paseo General Escalón #8',
    cliente: 'Sofía Alvarado', tiempo: '31 min', calificacion: 4, emoji: '🏺'
  },
  {
    id: '300398', date: 'Ayer, 11:10', status: 'cancelado', ganancia: 0,
    tienda: 'Café del Barrio', destino: 'Col. Médica #12',
    cliente: 'Carlos R.', tiempo: '—', calificacion: 0, emoji: '☕'
  }
];

export default function Historial() {
  const navigate = useNavigate();
  const { user } = useGlobal();
  const role = user?.role ?? 'buyer';

  const [filter, setFilter] = useState('all');

  // ── Buyer view ────────────────────────────────────────────────────────────
  if (role === 'buyer' || role === null) {
    const filtered = filter === 'all' ? BUYER_ORDERS : BUYER_ORDERS.filter(o => o.status === filter);
    const total = BUYER_ORDERS.reduce((s, o) => s + o.total, 0);

    return (
      <div className="historial-main-wrapper">
        <Header activeTab="history" />
        <div className="historial-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Mis Compras</h1>
              <p className="page-subtitle">Historial completo de todos tus pedidos</p>
            </div>
            <button className="clear-btn">🗑️ Limpiar historial</button>
          </div>

          <div className="hist-summary">
            <div className="summary-chip">
              <div className="summary-chip-num">{BUYER_ORDERS.length}</div>
              <div className="summary-chip-label">Pedidos totales</div>
            </div>
            <div className="summary-chip">
              <div className="summary-chip-num">${total.toFixed(2)}</div>
              <div className="summary-chip-label">Total invertido</div>
            </div>
            <div className="summary-chip">
              <div className="summary-chip-num">Panadería Don José</div>
              <div className="summary-chip-label">Comercio favorito</div>
            </div>
          </div>

          <div className="hist-filters">
            <button className={`hist-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
            <button className={`hist-filter ${filter === 'entregado' ? 'active' : ''}`} onClick={() => setFilter('entregado')}>Entregados</button>
            <button className={`hist-filter ${filter === 'en_camino' ? 'active' : ''}`} onClick={() => setFilter('en_camino')}>En camino</button>
          </div>

          <div id="orders-list">
            {filtered.length === 0 ? (
              <div className="hist-empty"><div className="hist-empty-icon">📦</div><h3>Sin pedidos</h3><p>No tienes pedidos en esta categoría.</p></div>
            ) : filtered.map(o => (
              <div key={o.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <span className="order-id">PEDIDO #{o.id}</span>
                    <div className="order-date">{o.date}</div>
                  </div>
                  <span className={`order-status ${o.status}`}>{o.status === 'entregado' ? '✓ Entregado' : '🛵 En camino'}</span>
                </div>
                <div className="order-items">
                  {o.items.map((item, idx) => (
                    <div key={idx} className="order-item-row">
                      <span className="order-item-emoji">{item.emoji}</span>
                      <div className="order-item-info">
                        <div className="order-item-name">{item.name}</div>
                        <div className="order-item-qty">Cantidad: {item.qty}</div>
                      </div>
                      <div className="order-item-price">${(item.price * item.qty).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="order-driver">
                  <span className="driver-avatar-mini">{o.driver.avatar}</span>
                  <span>Repartidor asignado: <strong>{o.driver.name}</strong></span>
                </div>
                <div className="order-card-footer">
                  <div className="order-total">Total pagado: <span>${o.total.toFixed(2)}</span></div>
                  <div className="order-actions">
                    <button className="order-action-btn secondary" onClick={() => navigate('/chat')}>💬 Mensaje</button>
                    {o.status === 'en_camino'
                      ? <button className="order-action-btn primary" onClick={() => navigate('/entregas')}>📍 Rastrear</button>
                      : <button className="order-action-btn primary" onClick={() => navigate('/market')}>🛍️ Pedir de nuevo</button>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Seller view ────────────────────────────────────────────────────────────
  if (role === 'seller') {
    const filtered = filter === 'all' ? SELLER_ORDERS : SELLER_ORDERS.filter(o => o.status === filter);
    const totalVentas = SELLER_ORDERS.filter(o => o.status === 'entregado').reduce((s, o) => s + o.total, 0);
    const totalComisiones = SELLER_ORDERS.reduce((s, o) => s + o.comision, 0);

    return (
      <div className="historial-main-wrapper">
        <Header activeTab="history" />
        <div className="historial-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Historial de Ventas</h1>
              <p className="page-subtitle">Todos los pedidos recibidos en tu tienda</p>
            </div>
            <button className="order-action-btn primary" style={{ marginTop: 0 }} onClick={() => navigate('/dashboard-vendedor')}>
              🏪 Ir al Panel
            </button>
          </div>

          <div className="hist-summary">
            <div className="summary-chip">
              <div className="summary-chip-num">{SELLER_ORDERS.filter(o => o.status === 'entregado').length}</div>
              <div className="summary-chip-label">Ventas completadas</div>
            </div>
            <div className="summary-chip">
              <div className="summary-chip-num" style={{ color: 'var(--green)' }}>${totalVentas.toFixed(2)}</div>
              <div className="summary-chip-label">Ingresos totales</div>
            </div>
            <div className="summary-chip">
              <div className="summary-chip-num">${totalComisiones.toFixed(2)}</div>
              <div className="summary-chip-label">Comisiones plataforma</div>
            </div>
          </div>

          <div className="hist-filters">
            <button className={`hist-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
            <button className={`hist-filter ${filter === 'entregado' ? 'active' : ''}`} onClick={() => setFilter('entregado')}>Completados</button>
            <button className={`hist-filter ${filter === 'cancelado' ? 'active' : ''}`} onClick={() => setFilter('cancelado')}>Cancelados</button>
          </div>

          <div id="orders-list">
            {filtered.map(o => (
              <div key={o.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <span className="order-id">VENTA #{o.id}</span>
                    <div className="order-date">{o.date}</div>
                  </div>
                  <span className={`order-status ${o.status === 'cancelado' ? 'en_camino' : 'entregado'}`}
                    style={o.status === 'cancelado' ? { background: '#fee2e2', color: '#b91c1c', borderColor: 'rgba(239,68,68,0.2)', animation: 'none' } : {}}>
                    {o.status === 'entregado' ? '✓ Completado' : '✕ Cancelado'}
                  </span>
                </div>
                <div className="order-items">
                  <div className="order-item-row">
                    <span className="order-item-emoji">{o.emoji}</span>
                    <div className="order-item-info">
                      <div className="order-item-name">{o.items}</div>
                      <div className="order-item-qty">Cliente: {o.cliente}</div>
                    </div>
                    <div className="order-item-price">${o.total.toFixed(2)}</div>
                  </div>
                </div>
                <div className="order-card-footer">
                  <div className="order-total">
                    Ingreso neto: <span style={{ color: o.status === 'cancelado' ? 'var(--red)' : undefined }}>
                      ${(o.total - o.comision).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 8 }}>
                      (comisión: ${o.comision.toFixed(2)})
                    </span>
                  </div>
                  <div className="order-actions">
                    <button className="order-action-btn secondary" onClick={() => navigate('/chat')}>💬 Contactar cliente</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Driver view ────────────────────────────────────────────────────────────
  if (role === 'driver') {
    const filtered = filter === 'all' ? DRIVER_DELIVERIES : DRIVER_DELIVERIES.filter(d => d.status === filter);
    const totalGanancias = DRIVER_DELIVERIES.filter(d => d.status === 'entregado').reduce((s, d) => s + d.ganancia, 0);
    const entregas = DRIVER_DELIVERIES.filter(d => d.status === 'entregado').length;
    const avgCalif = entregas > 0
      ? (DRIVER_DELIVERIES.filter(d => d.calificacion > 0).reduce((s, d) => s + d.calificacion, 0) / entregas).toFixed(1)
      : '—';

    return (
      <div className="historial-main-wrapper">
        <Header activeTab="history" />
        <div className="historial-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Mis Entregas</h1>
              <p className="page-subtitle">Historial de todos tus repartos y ganancias</p>
            </div>
            <button className="order-action-btn primary" style={{ marginTop: 0 }} onClick={() => navigate('/dashboard-repartidor')}>
              🛵 Ir al Panel
            </button>
          </div>

          <div className="hist-summary">
            <div className="summary-chip">
              <div className="summary-chip-num">{entregas}</div>
              <div className="summary-chip-label">Entregas completadas</div>
            </div>
            <div className="summary-chip">
              <div className="summary-chip-num" style={{ color: 'var(--green)' }}>${totalGanancias.toFixed(2)}</div>
              <div className="summary-chip-label">Ganancias totales</div>
            </div>
            <div className="summary-chip">
              <div className="summary-chip-num">⭐ {avgCalif}</div>
              <div className="summary-chip-label">Calificación promedio</div>
            </div>
          </div>

          <div className="hist-filters">
            <button className={`hist-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
            <button className={`hist-filter ${filter === 'entregado' ? 'active' : ''}`} onClick={() => setFilter('entregado')}>Completados</button>
            <button className={`hist-filter ${filter === 'cancelado' ? 'active' : ''}`} onClick={() => setFilter('cancelado')}>Cancelados</button>
          </div>

          <div id="orders-list">
            {filtered.map(d => (
              <div key={d.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <span className="order-id">ENTREGA #{d.id}</span>
                    <div className="order-date">{d.date}</div>
                  </div>
                  <span className={`order-status ${d.status === 'cancelado' ? 'en_camino' : 'entregado'}`}
                    style={d.status === 'cancelado' ? { background: '#fee2e2', color: '#b91c1c', borderColor: 'rgba(239,68,68,0.2)', animation: 'none' } : {}}>
                    {d.status === 'entregado' ? '✓ Entregado' : '✕ Cancelado'}
                  </span>
                </div>
                <div className="order-items">
                  <div className="order-item-row">
                    <span className="order-item-emoji">{d.emoji}</span>
                    <div className="order-item-info">
                      <div className="order-item-name">🏪 {d.tienda}</div>
                      <div className="order-item-qty">📍 {d.destino}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="order-item-price" style={{ color: d.status === 'entregado' ? 'var(--green)' : 'var(--red)' }}>
                        {d.status === 'entregado' ? `+$${d.ganancia.toFixed(2)}` : '$0.00'}
                      </div>
                      {d.calificacion > 0 && (
                        <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: 2 }}>
                          {'⭐'.repeat(d.calificacion)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="order-driver">
                  <span style={{ fontSize: '0.85rem' }}>👤 Cliente: <strong>{d.cliente}</strong></span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>⏱ {d.tiempo}</span>
                </div>
                <div className="order-card-footer">
                  <div className="order-total">
                    Ganancia: <span style={{ color: d.ganancia > 0 ? 'var(--green)' : 'var(--red)' }}>
                      {d.ganancia > 0 ? `+$${d.ganancia.toFixed(2)}` : '$0.00'}
                    </span>
                  </div>
                  <div className="order-actions">
                    <button className="order-action-btn secondary" onClick={() => navigate('/chat')}>💬 Soporte</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Admin view ─────────────────────────────────────────────────────────────
  return (
    <div className="historial-main-wrapper">
      <Header activeTab="history" />
      <div className="historial-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Actividad General</h1>
            <p className="page-subtitle">Resumen de toda la actividad de la plataforma</p>
          </div>
        </div>
        <div className="hist-summary">
          <div className="summary-chip">
            <div className="summary-chip-num">148</div>
            <div className="summary-chip-label">Pedidos hoy</div>
          </div>
          <div className="summary-chip">
            <div className="summary-chip-num">$1,248.50</div>
            <div className="summary-chip-label">Volumen del día</div>
          </div>
          <div className="summary-chip">
            <div className="summary-chip-num">12</div>
            <div className="summary-chip-label">Repartidores activos</div>
          </div>
        </div>
        <div className="hist-empty" style={{ marginTop: 32 }}>
          <div className="hist-empty-icon">👑</div>
          <h3>Panel de Administrador</h3>
          <p>El historial detallado está disponible en el panel de administración.</p>
          <a style={{ display: 'inline-block', marginTop: 16 }} onClick={() => navigate('/admin')}>Ir al Panel Admin</a>
        </div>
      </div>
    </div>
  );
}
