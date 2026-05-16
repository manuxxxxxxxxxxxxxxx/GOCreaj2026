import React, { useState } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/historial.css';
import '../../css/dark.css';

export default function Historial() {
  const { toggleTheme, cartCount } = useGlobal();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const orders = [
    { id: '100452', date: 'Hoy, 14:30', status: 'entregado', total: 12.50, items: 'Pan Artesanal, Café Premium' },
    { id: '100451', date: 'Ayer, 09:15', status: 'entregado', total: 25.00, items: 'Artesanías Decorativas' },
    { id: '100450', date: '12 May, 18:40', status: 'en_camino', total: 8.75, items: 'Verduras Orgánicas Mix' }
  ];

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <>
      <nav>
        <a onClick={() => navigate('/')} style={{cursor:'pointer'}} className="nav-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
          </div>
          LocalMarket
        </a>
        <div className="nav-right">
          <button className="cart-btn" onClick={() => navigate('/carritoypago')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </nav>

      <div className="historial-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Historial de Pedidos</h1>
            <p className="page-subtitle">Todas tus compras en LocalMarket</p>
          </div>
          <button className="clear-btn">🗑 Limpiar historial</button>
        </div>

        <div className="hist-summary">
          <div className="summary-chip">
            <div className="summary-chip-num">{orders.length}</div>
            <div className="summary-chip-label">Pedidos totales</div>
          </div>
          <div className="summary-chip">
            <div className="summary-chip-num">${orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</div>
            <div className="summary-chip-label">Total gastado</div>
          </div>
          <div className="summary-chip">
            <div className="summary-chip-num">Panadería Don José</div>
            <div className="summary-chip-label">Vendedor favorito</div>
          </div>
        </div>

        <div className="hist-filters">
          <button className={`hist-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
          <button className={`hist-filter ${filter === 'entregado' ? 'active' : ''}`} onClick={() => setFilter('entregado')}>Entregados</button>
          <button className={`hist-filter ${filter === 'en_camino' ? 'active' : ''}`} onClick={() => setFilter('en_camino')}>En camino</button>
          <button className={`hist-filter ${filter === 'preparando' ? 'active' : ''}`} onClick={() => setFilter('preparando')}>Preparando</button>
        </div>

        <div id="orders-list">
          {filteredOrders.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-light)'}}>No hay pedidos en esta categoría.</div>
          ) : (
            filteredOrders.map(o => (
              <div key={o.id} style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, marginBottom: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong style={{fontSize: '1.1rem'}}>Pedido #{o.id}</strong>
                  <span style={{ fontWeight: 600, color: o.status === 'entregado' ? 'var(--green)' : 'var(--blue)' }}>
                    {o.status === 'entregado' ? 'Entregado' : 'En camino'}
                  </span>
                </div>
                <div style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: 12 }}>{o.date}</div>
                <div style={{ marginBottom: 12 }}>{o.items}</div>
                <div style={{ fontWeight: 600 }}>Total: ${o.total.toFixed(2)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
