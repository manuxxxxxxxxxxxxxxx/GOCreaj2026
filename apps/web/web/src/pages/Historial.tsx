import { useState, useEffect } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
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
  estado: 'preparacion' | 'en_camino' | 'entregado' | 'rechazado_repartidor' | 'cancelado';
  direccion_entrega: string;
  vendedor_nombre: string;
  repartidor_nombre: string | null;
  items: OrderItem[];
  created_at: string;
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
      case 'entregado': return '✓ Entregado';
      case 'en_camino': return '🛵 En camino';
      case 'preparacion': return '👨‍🍳 Preparando';
      case 'cancelado': return '✕ Cancelado';
      default: return status;
    }
  };

  const getCategoryEmoji = (cat?: string) => {
    switch (cat?.toLowerCase()) {
      case 'panaderia': return '🥐';
      case 'bebidas': return '☕';
      case 'alimentos': return '🥦';
      case 'artesanias': return '🏺';
      default: return '🛍️';
    }
  };

  const totalSpent = orders
    .filter(o => o.estado === 'entregado')
    .reduce((acc, o) => acc + parseFloat(o.total), 0);

  return (
    <div className={`historial-main-wrapper ${theme === 'dark' ? 'dark' : ''}`}>
      <Header activeTab="history" />

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
          <button className={`hist-filter ${filter === 'entregado' ? 'active' : ''}`} onClick={() => setFilter('entregado')}>Entregados</button>
          <button className={`hist-filter ${filter === 'en_camino' ? 'active' : ''}`} onClick={() => setFilter('en_camino')}>En camino</button>
          <button className={`hist-filter ${filter === 'preparacion' ? 'active' : ''}`} onClick={() => setFilter('preparacion')}>Preparación</button>
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
                      <span className="order-item-emoji">{getCategoryEmoji(item.categoria)}</span>
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

                <div className="order-card-footer">
                  <div className="order-total">
                    Total pagado: <span>${parseFloat(o.total).toFixed(2)}</span>
                  </div>
                  <div className="order-actions">
                    <button className="order-action-btn secondary" onClick={() => navigate('/chat')}>💬 Mensaje</button>
                    {o.estado === 'en_camino' ? (
                      <button className="order-action-btn primary" onClick={() => navigate('/entregas')}>📍 Rastrear</button>
                    ) : (
                      <button className="order-action-btn primary" onClick={() => navigate('/market')}>🛍️ Pedir de nuevo</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
