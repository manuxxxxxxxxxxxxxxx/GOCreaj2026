import React from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/index.css';
import '../../css/dark.css';

export default function VendedorDashboard() {
  const { toggleTheme, cartCount } = useGlobal();
  const navigate = useNavigate();

  return (
    <>
      <nav>
  <a onClick={() => navigate('/')} style={{cursor:'pointer'}} className="nav-logo">
    <div className="logo-icon" style={{color: '#fff'}}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
        <path d="M9 22V12h6v10M2 9l10-7 10 7"/>
      </svg>
    </div>
    LocalMarket
  </a>
  <ul className="nav-links">
    <li><a onClick={() => navigate('/market')} style={{cursor:'pointer'}}>Marketplace</a></li>
    <li><a onClick={() => navigate('/reels')} style={{cursor:'pointer'}}>Reels</a></li>
    <li><a onClick={() => navigate('/chat')} style={{cursor:'pointer'}}>Mensajes</a></li>
  </ul>
  <div className="nav-right">
    <button className="lm-theme-toggle" onClick={toggleTheme} title="Cambiar tema"></button>
    <button onClick={() => navigate('/login')}>Salir</button>
  </div>
</nav>

<div className="dash-page">

  {/* HEADER */}
  <div className="dash-header">
    <div className="dash-header-left">
      <h1>Dashboard del Vendedor</h1>
      <p className="dash-seller-name" id="seller-name-sub">Cargando...</p>
    </div>
    <div className="dash-header-actions">
      <button className="btn-primary" id="btn-nuevo-producto">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nuevo Producto
      </button>
      <button className="btn-purple" id="btn-crear-reel">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></svg>
        Crear Reel
      </button>
    </div>
  </div>

  {/* STAT CARDS */}
  <div className="stats-row">
    <div className="stat-card">
      <div className="stat-icon-wrap blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <div className="stat-body">
        <div className="stat-num" id="stat-ventas-hoy">$0.00</div>
        <div className="stat-badge" id="badge-ventas-hoy">+0%</div>
        <div className="stat-label">Ventas Hoy</div>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-icon-wrap green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      </div>
      <div className="stat-body">
        <div className="stat-num" id="stat-pedidos">0</div>
        <div className="stat-badge" id="badge-pedidos">+0</div>
        <div className="stat-label">Pedidos</div>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-icon-wrap purple">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <div className="stat-body">
        <div className="stat-num" id="stat-productos">0</div>
        <div className="stat-badge" id="badge-productos">activos</div>
        <div className="stat-label">Productos</div>
      </div>
    </div>
    <div className="stat-card">
      <div className="stat-icon-wrap orange">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      </div>
      <div className="stat-body">
        <div className="stat-num" id="stat-calificacion">4.9</div>
        <div className="stat-badge" id="badge-calificacion">⭐ Top</div>
        <div className="stat-label">Calificación</div>
      </div>
    </div>
  </div>

  {/* CHART + ORDERS */}
  <div className="dash-cols">
    <div className="dash-card">
      <div className="dash-card-title">Ventas de la Semana</div>
      <div className="chart-wrap">
        <canvas id="chart-ventas"></canvas>
      </div>
    </div>
    <div className="dash-card">
      <div className="dash-card-title">Pedidos Recientes</div>
      <div className="orders-list" id="orders-recientes"></div>
    </div>
  </div>

  {/* GESTIÓN DE PRODUCTOS */}
  <div className="section-header">
    <div className="section-title">Gestión de Productos</div>
    <button className="btn-primary" id="btn-nuevo-producto-2">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Agregar
    </button>
  </div>
  <div className="products-table-wrap">
    <table className="products-table" id="productos-table">
      <thead>
        <tr>
          <th>Emoji</th>
          <th>Nombre</th>
          <th>Precio</th>
          <th>Categoría</th>
          <th>Stock</th>
          <th>Activo</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody id="productos-tbody">
        {[
          { emoji: '🥖', name: 'Pan Artesanal Integral', price: 4.05, cat: 'panaderia', stock: 15, active: true },
          { emoji: '☕', name: 'Café Premium 250g', price: 8.75, cat: 'bebidas', stock: 42, active: true },
          { emoji: '🥦', name: 'Mix Verduras Orgánicas', price: 12.00, cat: 'alimentos', stock: 23, active: true }
        ].map((p, i) => (
          <tr key={i}>
            <td style={{fontSize: '1.5rem'}}>{p.emoji}</td>
            <td style={{fontWeight: '600'}}>{p.name}</td>
            <td>${p.price.toFixed(2)}</td>
            <td style={{textTransform: 'capitalize'}}>{p.cat}</td>
            <td>{p.stock}</td>
            <td>
              <span className={`badge ${p.active ? 'badge-success' : 'badge-danger'}`} style={{padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: p.active ? '#22c55e' : '#ef4444', color: '#fff'}}>
                {p.active ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            <td>
              <button className="btn-icon" title="Editar" style={{background:'none', border:'none', cursor:'pointer', marginRight:'8px'}}>✏️</button>
              <button className="btn-icon" title="Eliminar" style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

</div>

{/* MODAL NUEVO PRODUCTO */}
<div className="modal-overlay" id="modal-producto">
  <div className="modal-box">
    <div className="modal-head">
      <h2 id="modal-titulo">Nuevo Producto</h2>
      <button className="modal-close-btn" id="modal-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div className="modal-body">
      <input type="hidden" id="modal-edit-id" />
      <div className="modal-field">
        <label htmlFor="modal-nombre">Nombre del producto</label>
        <input className="modal-input" type="text" id="modal-nombre" placeholder="Ej: Pan Artesanal Integral" />
      </div>
      <div className="modal-field">
        <label htmlFor="modal-precio">Precio ($)</label>
        <input className="modal-input" type="number" id="modal-precio" placeholder="0.00" step="0.01" min="0" />
      </div>
      <div className="modal-field">
        <label htmlFor="modal-categoria">Categoría</label>
        <select className="modal-input" id="modal-categoria">
          <option value="panaderia">Panadería</option>
          <option value="alimentos">Alimentos</option>
          <option value="bebidas">Bebidas</option>
          <option value="artesanias">Artesanías</option>
        </select>
      </div>
      <div className="modal-field">
        <label htmlFor="modal-emoji">Emoji del producto</label>
        <input className="modal-input" type="text" id="modal-emoji" placeholder="🥖" maxlength="4" />
      </div>
    </div>
    <div className="modal-foot">
      <button className="btn-cancel" id="modal-cancel">Cancelar</button>
      <button className="btn-save" id="modal-save">Guardar Producto</button>
    </div>
  </div>
</div>

{/* TOAST */}
<div className="lm-toast" id="lm-toast">
  <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
  <span id="lm-toast-msg"></span>
</div>
    </>
  );
}
