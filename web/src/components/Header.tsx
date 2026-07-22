import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/market.css';

interface HeaderProps {
  activeTab?: 'categories' | 'history' | 'reels' | 'chat' | 'none';
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export default function Header({ activeTab = 'none', searchQuery = '', setSearchQuery }: HeaderProps) {
  const { theme, toggleTheme, cartCount, user, logout } = useGlobal();
  const navigate = useNavigate();

  const handleSearchFocus = () => {
    if (!setSearchQuery) {
      navigate('/?search=true');
    }
  };

  return (
    <header className="svgo-header">
      <div className="header-top-row">
        <a onClick={() => navigate('/')} style={{ cursor: 'pointer' }} className="nav-logo">
          <div className="logo-icon" style={{ background: '#FFFFFF', color: '#355068', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1rem', letterSpacing: '-0.5px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            SV
          </div>
          <span className="logo-text" style={{ color: '#FFFFFF', fontWeight: '800', fontSize: '1.4rem' }}>GO</span>
        </a>

        {/* Centralized Search Box */}
        <div className="header-search-box">
          <input 
            type="text" 
            placeholder="Buscar productos, marcas y más..." 
            value={searchQuery} 
            onChange={e => setSearchQuery ? setSearchQuery(e.target.value) : null}
            onFocus={handleSearchFocus}
          />
          <button className="search-btn" onClick={handleSearchFocus}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>

        <div className="header-user-actions">
          {/* Theme toggle with Moon (light mode) and Sun (dark mode) icons */}
          <button 
            className="lm-theme-toggle" 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            style={{ 
              color: '#FFFFFF', 
              background: 'rgba(255,255,255,0.15)', 
              border: 'none', 
              borderRadius: '10px', 
              width: '36px', 
              height: '36px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer' 
            }}
          >
            {theme === 'light' ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <circle cx="12" cy="12" r="5" fill="currentColor"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            )}
          </button>
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a 
                onClick={() => {
                  if (user.role === 'seller') navigate('/dashboard-vendedor');
                  else if (user.role === 'driver') navigate('/dashboard-repartidor');
                  else if (user.role === 'admin') navigate('/admin');
                  else navigate('/perfil');
                }} 
                className="user-profile-trigger" 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', textDecoration: 'none' }}
              >
                <div className="user-avatar-mini" style={{ background: 'rgba(255,255,255,0.2)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-name-mini" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Hola, {user.name}</span>
              </a>
              <button 
                onClick={() => { logout(); navigate('/'); }} 
                title="Cerrar sesión" 
                style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  color: '#FFFFFF', 
                  border: 'none', 
                  borderRadius: '10px', 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  transition: 'background 0.2s' 
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          ) : (
            <a onClick={() => navigate('/login')} className="user-profile-trigger" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', textDecoration: 'none' }}>
              <div className="user-avatar-mini" style={{ background: 'rgba(255,255,255,0.2)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>I</div>
              <span className="user-name-mini" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Hola, Iniciar Sesión</span>
            </a>
          )}

          <button className="cart-btn" onClick={() => navigate('/carritoypago')} style={{ background: 'rgba(255,255,255,0.15)', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '8px', position: 'relative', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span className="cart-badge" style={{ background: '#FFFFFF', color: '#355068', border: 'none', fontWeight: '800' }}>{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Subnav row */}
      <div className="header-bottom-row">
        <ul className="subnav-links">
          <li><a onClick={() => navigate('/')} className={activeTab === 'categories' ? 'active' : ''}>Categorías</a></li>
          <li><a onClick={() => navigate('/historial')} className={activeTab === 'history' ? 'active' : ''}>Historial</a></li>
          <li><a onClick={() => navigate('/reels')} className={activeTab === 'reels' ? 'active' : ''}>Reels</a></li>
          <li><a onClick={() => navigate('/chat')} className={activeTab === 'chat' ? 'active' : ''}>Mensajes</a></li>
          {(!user || user.role === 'buyer') && (
            <li><a onClick={() => navigate('/login?role=seller')} className="sell-action-link">Vender con nosotros</a></li>
          )}
          {user && user.role === 'seller' && (
            <li><a onClick={() => navigate('/dashboard-vendedor')} className="sell-action-link" style={{ fontWeight: '800', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '4px 12px', borderRadius: '20px' }}>Panel Vendedor</a></li>
          )}
          {user && user.role === 'driver' && (
            <li><a onClick={() => navigate('/dashboard-repartidor')} className="sell-action-link" style={{ fontWeight: '800', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '4px 12px', borderRadius: '20px' }}>Panel Repartidor</a></li>
          )}
          {user && user.role === 'admin' && (
            <li><a onClick={() => navigate('/admin')} className="sell-action-link" style={{ fontWeight: '800', background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '4px 12px', borderRadius: '20px' }}>Panel Admin</a></li>
          )}
        </ul>

        <div className="header-address-tag">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
            📍 Enviar a <strong style={{ color: '#FFFFFF' }}>San Salvador, SV</strong>
          </span>
        </div>
      </div>
    </header>
  );
}
