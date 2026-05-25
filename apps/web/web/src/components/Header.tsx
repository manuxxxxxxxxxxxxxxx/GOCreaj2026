import { useState } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/market.css';

const MUNICIPIOS_SV = [
  'San Salvador', 'Santa Ana', 'Mejicanos', 'Delgado', 'Soyapango',
  'San Miguel', 'Apopa', 'Nueva San Salvador', 'Zacatecoluca', 'Usulután',
  'Ahuachapán', 'Cojutepeque', 'San Vicente', 'La Unión', 'Chalatenango',
  'Sensuntepeque', 'San Francisco Gotera', 'Santiago de María', 'Metapán',
  'Antiguo Cuscatlán', 'Ilopango', 'Ciudad Delgado', 'Tonacatepeque',
  'Quezaltepeque', 'San Marcos', 'Panchimalco', 'Rosario de Mora',
  'Aguilares', 'El Paisnal', 'Guazapa', 'Suchitoto',
];

const LOC_KEY = 'svgo_municipio';

interface HeaderProps {
  activeTab?: 'categories' | 'history' | 'reels' | 'chat' | 'none';
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export default function Header({ activeTab = 'none', searchQuery = '', setSearchQuery }: HeaderProps) {
  const { theme, toggleTheme, cartCount, user } = useGlobal();
  const navigate = useNavigate();
  const [municipio, setMunicipio] = useState(() => localStorage.getItem(LOC_KEY) || 'San Salvador');
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [locSearch, setLocSearch] = useState('');

  const handleSearchFocus = () => {
    if (!setSearchQuery) navigate('/market');
  };

  const selectMunicipio = (m: string) => {
    setMunicipio(m);
    localStorage.setItem(LOC_KEY, m);
    setShowLocPicker(false);
    setLocSearch('');
  };

  const filteredMunicipios = MUNICIPIOS_SV.filter(m =>
    m.toLowerCase().includes(locSearch.toLowerCase())
  );

  const displayName = user?.name ? `Hola, ${user.name.split(' ')[0]}` : 'Ingresar';

  return (
    <>
      <header className="svgo-header">
        <div className="header-top-row">
          <a onClick={() => navigate('/')} style={{ cursor: 'pointer' }} className="nav-logo">
            <div className="logo-icon" style={{ background: '#FFFFFF', color: '#355068', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1rem', letterSpacing: '-0.5px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              SV
            </div>
            <span className="logo-text" style={{ color: '#FFFFFF', fontWeight: '800', fontSize: '1.4rem' }}>GO</span>
          </a>

          {/* Search Box */}
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
            {/* Theme toggle */}
            <button
              className="lm-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
              style={{ color: '#FFFFFF', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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

            <a
              onClick={() => navigate(user ? '/perfil' : '/login')}
              className="user-profile-trigger"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', textDecoration: 'none' }}
            >
              <div className="user-avatar-mini" style={{ background: 'rgba(255,255,255,0.2)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
              </div>
              <span className="user-name-mini" style={{ fontSize: '0.85rem', fontWeight: '600' }}>{displayName}</span>
            </a>

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
            <li><a onClick={() => navigate('/')} className={activeTab === 'categories' ? 'active' : ''} style={{ cursor: 'pointer' }}>Categorías</a></li>
            <li><a onClick={() => navigate('/historial')} className={activeTab === 'history' ? 'active' : ''} style={{ cursor: 'pointer' }}>Historial</a></li>
            <li><a onClick={() => navigate('/reels')} className={activeTab === 'reels' ? 'active' : ''} style={{ cursor: 'pointer' }}>Reels</a></li>
            <li><a onClick={() => navigate('/chat')} className={activeTab === 'chat' ? 'active' : ''} style={{ cursor: 'pointer' }}>Mensajes</a></li>
          </ul>

          {/* Editable location */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowLocPicker(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', padding: 0 }}
            >
              📍 Enviar a <strong style={{ color: '#FFFFFF' }}>{municipio}</strong>
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" width="12" height="12" style={{ marginLeft: 2 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {showLocPicker && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', width: '240px',
                background: 'var(--bg, #fff)', border: '1.5px solid #E2DCEF',
                borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                zIndex: 2000, overflow: 'hidden',
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #E2DCEF' }}>
                  <input
                    type="text"
                    placeholder="Buscar municipio..."
                    value={locSearch}
                    onChange={e => setLocSearch(e.target.value)}
                    autoFocus
                    style={{ width: '100%', border: '1.5px solid #E2DCEF', borderRadius: '8px', padding: '7px 10px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {filteredMunicipios.map(m => (
                    <button
                      key={m}
                      onClick={() => selectMunicipio(m)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '9px 14px',
                        border: 'none', background: m === municipio ? '#EEF4F9' : 'transparent',
                        color: m === municipio ? '#4A6D8C' : 'inherit',
                        fontWeight: m === municipio ? '700' : '500',
                        fontSize: '0.88rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}
                    >
                      {m === municipio && '✓ '}{m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Backdrop to close picker */}
      {showLocPicker && (
        <div
          onClick={() => setShowLocPicker(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1999 }}
        />
      )}
    </>
  );
}
