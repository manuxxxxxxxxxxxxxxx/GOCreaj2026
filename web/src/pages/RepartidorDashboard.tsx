import React from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/index.css';
import '../../css/dark.css';

export default function RepartidorDashboard() {
  const { toggleTheme, cartCount } = useGlobal();
  const navigate = useNavigate();

  return (
    <>
      {/* ══ NAV ══ */}
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
    <button className="lm-theme-toggle" onClick={() => navigate('/login')} title="Cerrar sesión">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      <h1>Dashboard del Repartidor</h1>
      <p className="driver-subtitle">
        Hola, <strong id="driver-name-display">Repartidor</strong> — bienvenido de vuelta
      </p>
    </div>
    <div className="availability-wrap">
      <span className="avail-label" id="avail-label">Disponible</span>
      <button className="toggle-pill" id="avail-toggle" aria-label="Alternar disponibilidad">
        <span className="pill-track"></span>
        <span className="pill-thumb"></span>
      </button>
    </div>
  </div>

  {/* Stat Cards */}
  <div className="stat-grid">
    <div className="stat-card">
      <div className="stat-card-icon green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      </div>
      <div className="stat-label">Ganancias Hoy</div>
      <div className="stat-value green-val" id="stat-earnings">$0.00</div>
      <div className="stat-sub">Ingresos del día</div>
    </div>
    <div className="stat-card">
      <div className="stat-card-icon blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13" rx="2"/>
          <path d="M16 8h4l3 3v5h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
      <div className="stat-label">Entregas</div>
      <div className="stat-value" id="stat-deliveries">0</div>
      <div className="stat-sub">Total acumuladas</div>
    </div>
    <div className="stat-card">
      <div className="stat-card-icon purple">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <div className="stat-label">Calificación</div>
      <div className="stat-value" id="stat-rating">4.8</div>
      <div className="stat-sub">★ Promedio general</div>
    </div>
    <div className="stat-card">
      <div className="stat-card-icon orange">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <div className="stat-label">Tiempo Promedio</div>
      <div className="stat-value" id="stat-time">28</div>
      <div className="stat-sub">minutos por entrega</div>
    </div>
  </div>

  {/* Two-column panels */}
  <div className="dash-columns">

    {/* LEFT: Entregas Activas */}
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ color: 'var(--purple)' }}>
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <path d="M16 8h4l3 3v5h-7V8z"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          Entregas Activas
        </span>
        <span className="panel-badge" id="active-badge">0</span>
      </div>
      <div className="panel-body" id="active-deliveries-list">
        {/* rendered by JS */}
      </div>
    </div>

    {/* RIGHT: Pedidos Disponibles */}
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ color: 'var(--blue)' }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Pedidos Disponibles
        </span>
        <span className="panel-badge green" id="avail-badge">0</span>
      </div>
      <div className="panel-body" id="available-orders-list">
        {/* rendered by JS */}
      </div>
    </div>

  </div>
</div>

{/* Toast */}
<div className="lm-toast" id="lm-toast">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
  <span id="lm-toast-msg">¡Listo!</span>
</div>
    </>
  );
}
