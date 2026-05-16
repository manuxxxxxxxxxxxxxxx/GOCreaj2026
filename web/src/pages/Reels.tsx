import React, { useState } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate, Link } from 'react-router-dom';
import '../../css/Reels.css';
import '../../css/dark.css';

const MOCK_REELS = [
  { id: 1, video: 'https://assets.mixkit.co/videos/preview/mixkit-fresh-bread-in-a-basket-4886-large.mp4', seller: 'Panadería Don José', desc: 'Pan recién horneado cada mañana 🥖 #artesanal', likes: '1.2k', comments: 45, loc: 'San Salvador' },
  { id: 2, video: 'https://assets.mixkit.co/videos/preview/mixkit-vegetables-in-a-market-4884-large.mp4', seller: 'Huerto Verde', desc: 'Nuestra cosecha de hoy es increíble 🥦 #organico', likes: '850', comments: 12, loc: 'Santa Tecla' },
];

export default function Reels() {
  const { toggleTheme, cartCount } = useGlobal();
  const navigate = useNavigate();

  return (
    <div className="reels-main-wrapper" style={{ background: '#000', minHeight: '100vh' }}>
      <nav>
        <Link to="/" className="nav-logo">
          <div className="logo-icon" style={{color: '#fff'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="M9 22V12h6v10M2 9l10-7 10 7"/>
            </svg>
          </div>
          LocalMarket
        </Link>
        <ul className="nav-links">
          <li><Link to="/market">Marketplace</Link></li>
          <li><Link to="/reels" className="active">Reels</Link></li>
          <li><Link to="/chat">Mensajes</Link></li>
        </ul>
        <div className="nav-right">
          <button className="lm-theme-toggle" onClick={toggleTheme} title="Cambiar tema"></button>
          <button className="cart-btn" onClick={() => navigate('/carritoypago')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </nav>

      <div className="reels-page">
        {/* Left Sidebar placeholder */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button onClick={() => navigate(-1)} className="back-link" style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Volver
          </button>
        </aside>

        <main className="reels-viewport">
          {MOCK_REELS.map((reel) => (
            <div key={reel.id} className="reel">
              <video src={reel.video} autoPlay loop muted playsInline className="reel-bg" />
              
              <div className="reel-top">
                <div className="seller-info">
                  <div className="seller-avatar" style={{ background: '#4f6ef7', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>🏪</div>
                  <div className="seller-meta">
                    <div className="seller-name">@{reel.seller} <span className="verified"><svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/></svg></span></div>
                    <div className="seller-loc">{reel.loc}</div>
                  </div>
                </div>
                <button className="follow-btn">Seguir</button>
              </div>

              <div className="reel-actions">
                <div className="action-btn">
                  <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span className="action-count">{reel.likes}</span>
                </div>
                <div className="action-btn">
                  <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span className="action-count">{reel.comments}</span>
                </div>
                <div className="action-btn">
                  <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  <span className="action-count">Share</span>
                </div>
              </div>

              <div className="reel-bottom">
                <div className="reel-caption">{reel.desc}</div>
                <button className="visit-local-btn" onClick={() => navigate('/market')}>
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                   Ver tienda
                </button>
              </div>
            </div>
          ))}
        </main>

        <aside className="reels-sidebar">
           <div className="activity-tray">
             <div className="tray-header">Mi Actividad</div>
             <div className="tray-tabs">
                <button className="tray-tab active">Guardados</button>
                <button className="tray-tab">Siguiendo</button>
                <button className="tray-tab">Likes</button>
                <button className="tray-tab">Comentado</button>
             </div>
             <div className="tray-content">
               <div className="tray-empty">
                 <p>Aún no tienes actividad guardada.</p>
               </div>
             </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
