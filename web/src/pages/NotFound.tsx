import React from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/index.css';
import '../../css/dark.css';

export default function NotFound() {
  const { toggleTheme } = useGlobal();
  const navigate = useNavigate();

  return (
    <div className="not-found-page" style={{ textAlign: 'center', padding: '100px 20px', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="nav-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: 'var(--blue)', cursor: 'pointer', marginBottom: '50px' }} onClick={() => navigate('/')}>
        <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #4f6ef7, #8b3cf7)', borderRadius: '10px', width: '38px', height: '38px', display: 'grid', placeItems: 'center', color: '#fff' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '20px', height: '20px' }}>
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
            <path d="M9 22V12h6v10M2 9l10-7 10 7" />
          </svg>
        </div>
        <span style={{ fontSize: '1.5rem' }}>LocalMarket</span>
      </div>

      <div style={{ fontSize: '6rem', fontWeight: '800', color: 'var(--blue)', lineHeight: '1', opacity: '0.2', marginBottom: '10px' }}>404</div>
      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🗺️</div>
      <h1 style={{ fontSize: '2rem', marginBottom: '10px', color: 'var(--text)' }}>Página no encontrada</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 30px' }}>
        La página que buscas no existe o fue movida. No te preocupes, el mercado sigue abierto.
      </p>

      <div className="actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '50px' }}>
        <button className="btn-solid-white" onClick={() => navigate('/')} style={{ background: 'var(--blue)', border: 'none', color: '#fff', padding: '12px 30px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
          Ir al inicio
        </button>
        <button className="btn-outline-white" onClick={() => navigate(-1)} style={{ borderColor: 'var(--blue)', color: 'var(--blue)', padding: '12px 30px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', background: 'transparent', border: '2px solid' }}>
          Volver atrás
        </button>
      </div>

      <div className="suggestions">
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>¿O tal vez buscabas?</p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Marketplace', icon: '🏪', path: '/market' },
            { label: 'Entregas', icon: '🚚', path: '/entregas' },
            { label: 'Reels', icon: '🎬', path: '/reels' },
            { label: 'Chat', icon: '💬', path: '/chat' },
            { label: 'Historial', icon: '📋', path: '/historial' }
          ].map((item, idx) => (
            <a 
              key={idx} 
              onClick={() => navigate(item.path)} 
              style={{ cursor: 'pointer', textDecoration: 'none', color: 'var(--text)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: 'var(--white)', borderRadius: '10px', boxShadow: 'var(--card-shadow)' }}
            >
              {item.icon} {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
