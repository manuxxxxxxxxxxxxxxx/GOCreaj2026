import { useState, useEffect } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api } from '../api';
import '../../css/historial.css';
import '../../css/dark.css';

interface OrderItem {
  id: number;
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: string;
  nombre: string;
  imagen: string;
  categoria?: string;
}

interface Order {
  id: number;
  comprador_id: number;
  vendedor_id: number;
  repartidor_id: number | null;
  total: string;
  metodo_pago: 'efectivo' | 'tarjeta' | 'paypal';
  estado: 'pendiente_confirmacion' | 'preparacion' | 'en_camino' | 'entregado' | 'rechazado_repartidor' | 'cancelado';
  direccion_entrega: string;
  vendedor_nombre: string;
  repartidor_nombre: string | null;
  items: OrderItem[];
  created_at: string;
}

const APROBACION_LIMITE_MIN = 10;

function minutosDesde(fecha: string): number {
  const t = new Date(fecha.replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return 0;
  return (Date.now() - t) / 60000;
}

export default function Historial() {
  const { theme } = useGlobal();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/carrito_pagos.php?action=mis_pedidos');
      if (res.data.ok) {
        setOrders(res.data.pedidos);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.estado === filter);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'entregado': return 'Entregado';
      case 'en_camino': return 'En camino';
      case 'preparacion': return 'Preparando';
      case 'pendiente_confirmacion': return 'Pendiente de aprobación';
      case 'cancelado': return 'Cancelado';
      case 'rechazado_repartidor': return 'Rechazado';
      default: return status;
    }
  };

  const cancelarPedido = async (id: number) => {
    if (!window.confirm('¿Cancelar este pedido? Se reembolsará el total a tu billetera.')) return;
    try {
      const res = await api.post('/carrito_pagos.php?action=cancelar', { pedido_id: id });
      if (res.data.ok) fetchOrders();
      else alert(res.data.error ?? 'No se pudo cancelar el pedido.');
    } catch { alert('Error de conexión.'); }
  };

  const getCategoryIcon = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'panaderia': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
      case 'bebidas': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>;
      case 'alimentos': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/></svg>;
      case 'artesanias': return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
      default: return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
    }
  };

  const totalSpent = orders
    .filter(o => o.estado === 'entregado')
    .reduce((acc, o) => acc + parseFloat(o.total), 0);

  return (
    <div className={`historial-main-wrapper ${theme === 'dark' ? 'dark' : ''}`}>
      <Header />

      <div className="historial-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Historial de Pedidos</h1>
            <p className="page-subtitle">Todas tus compras y envíos en un solo lugar</p>
          </div>
        </div>

        <div className="hist-summary">
          <div className="summary-chip">
            <div className="summary-chip-num">{orders.length}</div>
            <div className="summary-chip-label">Pedidos totales</div>
          </div>
          <div className="summary-chip">
            <div className="summary-chip-num">${totalSpent.toFixed(2)}</div>
            <div className="summary-chip-label">Total invertido</div>
          </div>
          <div className="summary-chip">
            <div className="summary-chip-num">
              {orders.length > 0 ? orders[0].vendedor_nombre : 'Ninguno'}
            </div>
            <div className="summary-chip-label">Último comercio</div>
          </div>
        </div>

        <div className="hist-filters">
          <button className={`hist-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
          <button className={`hist-filter ${filter === 'pendiente_confirmacion' ? 'active' : ''}`} onClick={() => setFilter('pendiente_confirmacion')}>Pendientes</button>
          <button className={`hist-filter ${filter === 'preparacion' ? 'active' : ''}`} onClick={() => setFilter('preparacion')}>Preparación</button>
          <button className={`hist-filter ${filter === 'en_camino' ? 'active' : ''}`} onClick={() => setFilter('en_camino')}>En camino</button>
          <button className={`hist-filter ${filter === 'entregado' ? 'active' : ''}`} onClick={() => setFilter('entregado')}>Entregados</button>
        </div>

        <div id="orders-list">
          {filteredOrders.length === 0 ? (
            <div className="hist-empty">
              <div className="hist-empty-icon">📦</div>
              <h3>Sin pedidos</h3>
              <p>No tienes ningún pedido en esta categoría actualmente.</p>
            </div>
          ) : (
            filteredOrders.map(o => (
              <div key={o.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <span className="order-id">PEDIDO #{o.id}</span>
                    <div className="order-date">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`order-status ${o.estado}`}>
                    {getStatusText(o.estado)}
                  </span>
                </div>
                
                <div className="order-items">
                  {o.items && o.items.map((item, idx) => (
                    <div key={idx} className="order-item-row">
                      <span className="order-item-emoji">{getCategoryIcon(item.categoria)}</span>
                      <div className="order-item-info">
                        <div className="order-item-name">{item.nombre}</div>
                        <div className="order-item-qty">Cantidad: {item.cantidad}</div>
                      </div>
                      <div className="order-item-price">${(parseFloat(item.precio_unitario) * item.cantidad).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                {o.repartidor_nombre && (
                  <div className="order-driver">
                    <span className="driver-avatar-mini">🛵</span>
                    <span>Repartidor asignado: <strong>{o.repartidor_nombre}</strong></span>
                  </div>
                )}

                {o.estado === 'pendiente_confirmacion' && (
                  <p style={{ fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.75, margin: '4px 0 0' }}>
                    Esperando que la tienda apruebe tu pedido
                    {minutosDesde(o.created_at) < APROBACION_LIMITE_MIN
                      ? ` (puedes cancelar en ${Math.max(0, Math.ceil(APROBACION_LIMITE_MIN - minutosDesde(o.created_at)))} min si no responde).`
                      : '.'}
                  </p>
                )}

                <div className="order-card-footer">
                  <div className="order-total">
                    Total pagado: <span>${parseFloat(o.total).toFixed(2)}</span>
                  </div>
                  <div className="order-actions">
                    <button className="order-action-btn secondary" onClick={() => navigate('/chat')}>💬 Mensaje</button>
                    {o.estado === 'pendiente_confirmacion' && minutosDesde(o.created_at) >= APROBACION_LIMITE_MIN && (
                      <button className="order-action-btn secondary" onClick={() => cancelarPedido(o.id)}>✕ Cancelar</button>
                    )}
                    {(o.estado === 'en_camino' || (o.estado === 'preparacion' && o.repartidor_id)) ? (
                      <button className="order-action-btn primary" onClick={() => navigate(`/entregas/${o.id}`)}>📍 Rastrear</button>
                    ) : o.estado === 'entregado' || o.estado === 'cancelado' || o.estado === 'rechazado_repartidor' ? (
                      <button className="order-action-btn primary" onClick={() => navigate('/')}>🛍️ Pedir de nuevo</button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
