import { useState } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../../css/historial.css';
import '../../css/dark.css';

export default function Historial() {
  const { toggleTheme, cartCount } = useGlobal();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const orders = [
    { 
      id: '100452', 
      date: 'Hoy, 14:30', 
      status: 'entregado', 
      total: 12.50, 
      items: [
        { emoji: '🥖', name: 'Pan Artesanal Integral', qty: 1, price: 4.05 },
        { emoji: '☕', name: 'Café Premium 250g', qty: 1, price: 8.45 }
      ],
      driver: { name: 'Carlos Reparto', avatar: '🛵' }
    },
    { 
      id: '100451', 
      date: 'Ayer, 09:15', 
      status: 'entregado', 
      total: 25.00, 
      items: [
        { emoji: '🏺', name: 'Artesanías Decorativas', qty: 1, price: 25.00 }
      ],
      driver: { name: 'Carlos Reparto', avatar: '🛵' }
    },
    { 
      id: '100450', 
      date: '12 May, 18:40', 
      status: 'en_camino', 
      total: 8.75, 
      items: [
        { emoji: '🥦', name: 'Verduras Orgánicas Mix', qty: 1, price: 8.75 }
      ],
      driver: { name: 'Carlos Reparto', avatar: '🛵' }
    }
  ];

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="historial-main-wrapper">
      <Header activeTab="history" />

      <div className="historial-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Historial de Pedidos</h1>
            <p className="page-subtitle">Todas tus compras y envíos en un solo lugar</p>
          </div>
          <button className="clear-btn">🗑️ Limpiar historial</button>
        </div>

        <div className="hist-summary">
          <div className="summary-chip">
            <div className="summary-chip-num">{orders.length}</div>
            <div className="summary-chip-label">Pedidos totales</div>
          </div>
          <div className="summary-chip">
            <div className="summary-chip-num">${orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</div>
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
                    <div className="order-date">{o.date}</div>
                  </div>
                  <span className={`order-status ${o.status}`}>
                    {o.status === 'entregado' ? '✓ Entregado' : '🛵 En camino'}
                  </span>
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
                  <div className="order-total">
                    Total pagado: <span>${o.total.toFixed(2)}</span>
                  </div>
                  <div className="order-actions">
                    <button className="order-action-btn secondary" onClick={() => navigate('/chat')}>💬 Mensaje</button>
                    {o.status === 'en_camino' ? (
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
