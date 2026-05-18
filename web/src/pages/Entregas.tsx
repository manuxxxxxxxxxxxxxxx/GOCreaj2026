
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/entregas.css';
import '../../css/dark.css';

export default function Entregas() {
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
          <button className="cart-btn" onClick={() => navigate('/carritoypago')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </nav>

      <div className="del-wrap">
        <div className="del-header">
          <div>
            <h1>Seguimiento de Entrega</h1>
            <p className="subt">
              Pedido <strong id="del-order-id">#100450</strong> ·
              <span>En tiempo real</span>
              <span className="live-pill"><span className="live-dot"></span> Activo</span>
            </p>
          </div>
          <div className="header-actions">
            <button className="btn-ghost" onClick={() => navigate(-1)}>Volver</button>
          </div>
        </div>

        <div id="del-content" style={{ marginTop: 20 }}>
          <div className="layout" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div className="main-col">
              <div className="card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: 16 }}>Mapa de seguimiento</h3>
                <div style={{ height: 400, background: '#eee', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#888', fontSize: '1.2rem' }}>🗺 Mapa interactivo (En camino)</span>
                </div>
              </div>
            </div>
            <div className="side-col" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card status-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: 16 }}>Estado del pedido</h3>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                  <div style={{ position: 'relative', marginBottom: 24 }}>
                    <div style={{ position: 'absolute', left: -19, top: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--green)' }}></div>
                    <div style={{ fontWeight: 600 }}>Pedido confirmado</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>18:40</div>
                  </div>
                  <div style={{ position: 'relative', marginBottom: 24 }}>
                    <div style={{ position: 'absolute', left: -19, top: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--green)' }}></div>
                    <div style={{ fontWeight: 600 }}>En preparación</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>18:45</div>
                  </div>
                  <div style={{ position: 'relative', marginBottom: 24 }}>
                    <div style={{ position: 'absolute', left: -21, top: 0, width: 16, height: 16, borderRadius: '50%', border: '4px solid var(--blue)', background: 'var(--bg-card)' }}></div>
                    <div style={{ fontWeight: 600, color: 'var(--blue)' }}>En camino</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>El repartidor va hacia tu ubicación</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -19, top: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--border)' }}></div>
                    <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>Entregado</div>
                  </div>
                </div>
              </div>
              <div className="card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h3 style={{ marginBottom: 16 }}>Repartidor</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🛵</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Carlos M.</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>⭐ 4.9 (120 entregas)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
