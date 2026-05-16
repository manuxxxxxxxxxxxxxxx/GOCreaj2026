import React from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/perfil.css';
import '../../css/dark.css';

export default function Perfil() {
  const { toggleTheme, cartCount } = useGlobal();
  const navigate = useNavigate();

  return (
    <>
      <nav>
  <a onClick={() => navigate('/')} style={{cursor:'pointer'}} className="nav-logo">
    <div className="logo-icon">
      <svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
    </div>
    LocalMarket
  </a>
  <ul className="nav-links" id="main-nav-links"></ul>
  <div className="nav-right">
    <button className="lm-theme-toggle" onClick={toggleTheme} title="Cambiar tema"></button>
    <button className="cart-btn" onClick={() => navigate('/carritoypago')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span className="cart-badge">{cartCount}</span>
    </button>
  </div>
</nav>

<input type="file" id="avatar-input" accept="image/*" style={{ display: 'none' }} />

<div className="perfil-page">

  {/* Hero */}
  <div className="perfil-hero">
    <div className="perfil-avatar-wrap">
      <div className="perfil-avatar" id="perfil-avatar">👤</div>
      <button className="avatar-change-btn" id="avatar-change-btn" title="Cambiar foto">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>
    </div>
    <div className="perfil-hero-info">
      <div className="perfil-hero-name" id="hero-name">Mi perfil</div>
      <div className="perfil-hero-role" id="hero-role">🛒 Comprador</div>
      <div className="perfil-hero-joined" id="hero-joined"></div>
      <div className="perfil-hero-stats">
        <div className="perfil-stat">
          <div className="perfil-stat-num" id="stat-orders">0</div>
          <div className="perfil-stat-label">Pedidos</div>
        </div>
        <div className="perfil-stat">
          <div className="perfil-stat-num" id="stat-spent">$0</div>
          <div className="perfil-stat-label">Gastado</div>
        </div>
        <div className="perfil-stat">
          <div className="perfil-stat-num" id="stat-deliveries">0</div>
          <div className="perfil-stat-label">Entregas</div>
        </div>
      </div>
    </div>
  </div>

  {/* Datos personales */}
  <div className="perfil-section">
    <div className="perfil-section-header">
      <div className="perfil-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Datos personales
      </div>
      <button className="edit-toggle" id="edit-personal-btn">✏️ Editar</button>
    </div>
    <form id="personal-form">
      <div className="perfil-grid">
        <div className="perfil-field">
          <label className="perfil-label">Nombre</label>
          <input className="perfil-input" id="inp-name" placeholder="Tu nombre" disabled />
        </div>
        <div className="perfil-field">
          <label className="perfil-label">Correo electrónico</label>
          <input className="perfil-input" id="inp-email" type="email" placeholder="correo@ejemplo.com" disabled />
        </div>
        <div className="perfil-field">
          <label className="perfil-label">Teléfono</label>
          <input className="perfil-input" id="inp-phone" type="tel" placeholder="+52 55 1234 5678" disabled />
        </div>
        <div className="perfil-field">
          <label className="perfil-label">Dirección principal</label>
          <input className="perfil-input" id="inp-address" placeholder="Calle, número, colonia" disabled />
        </div>
        <div className="perfil-field full">
          <label className="perfil-label">Bio</label>
          <textarea className="perfil-input perfil-textarea" id="inp-bio" placeholder="Cuéntanos un poco de ti..." disabled></textarea>
        </div>
      </div>
      <button type="submit" className="save-btn" id="save-personal-btn" disabled>Guardar cambios</button>
    </form>
  </div>

  {/* Rol */}
  <div className="perfil-section">
    <div className="perfil-section-header">
      <div className="perfil-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Mi rol en LocalMarket
      </div>
    </div>
    <div className="role-cards">
      <div className="role-card active" data-role="buyer" onClick={() => navigate('/market')}>
        <div className="role-card-icon">🛒</div>
        <div className="role-card-name">Comprador</div>
        <div className="role-card-desc">Explora y compra productos locales</div>
      </div>
      <div className="role-card" data-role="seller" onClick={() => navigate('/dashboard-vendedor')}>
        <div className="role-card-icon">🏪</div>
        <div className="role-card-name">Vendedor</div>
        <div className="role-card-desc">Vende tus productos al barrio</div>
      </div>
      <div className="role-card" data-role="driver" onClick={() => navigate('/dashboard-repartidor')}>
        <div className="role-card-icon">🛵</div>
        <div className="role-card-name">Repartidor</div>
        <div className="role-card-desc">Entrega pedidos y genera ingresos</div>
      </div>
    </div>
  </div>

  {/* Sesión */}
  <div className="perfil-section">
    <div className="perfil-section-header">
      <div className="perfil-section-title">Sesión</div>
    </div>
    <button className="danger-btn" id="logout-btn" style={{ background: '#4f6ef7', borderColor: '#4f6ef7', color: '#fff', maxWidth: '220px' }} onClick={() => navigate('/login')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '16px', height: '16px' }}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Cerrar sesión
    </button>
  </div>

  {/* Zona de peligro */}
  <div className="perfil-section danger-zone">
    <div className="perfil-section-header">
      <div className="perfil-section-title" style={{ color: 'var(--red)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Zona de peligro
      </div>
    </div>
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <button className="danger-btn" id="clear-data-btn">Borrar todos mis datos</button>
      <button className="danger-btn" id="clear-orders-btn">Borrar historial de pedidos</button>
    </div>
  </div>

</div>

<div className="lm-toast" id="lm-toast">
  <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
  <span id="lm-toast-msg"></span>
</div>
    </>
  );
}
