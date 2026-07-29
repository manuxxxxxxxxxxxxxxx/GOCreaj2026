import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '../context/GlobalContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';

const MUNICIPIOS_SV = [
  'San Salvador','Mejicanos','Soyapango','Apopa','Ilopango','Delgado',
  'Tonacatepeque','San Marcos','Antiguo Cuscatlán','Santa Tecla',
  'Nueva San Salvador','Quezaltepeque','Aguilares','Santa Ana',
  'San Miguel','Usulután','Zacatecoluca','Ahuachapán','Cojutepeque',
  'San Vicente','La Unión','Chalatenango','Sensuntepeque','Metapán',
  'Acajutla','Chalchuapa','Ciudad Arce','Colón','Sonsonate',
];

interface SearchResult {
  id: number;
  nombre: string;
  precio: number;
  precio_oferta?: number | null;
  imagen_url?: string | null;
  tienda_nombre: string;
  categoria?: string;
}

export default function Header() {
  const { t } = useTranslation();
  const { theme, toggleTheme, cartCount, user, logout, municipio, setMunicipio } = useGlobal();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isDark    = theme === 'dark';

  const [showLocPicker, setShowLocPicker] = useState(false);
  const [locSearch, setLocSearch]       = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled]         = useState(false);

  // Live search
  const [searchQ, setSearchQ]           = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const searchRef   = useRef<HTMLDivElement>(null);

  const locRef  = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Notificaciones ──────────────────────────────────────────────────────────
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<Array<{ id: number; titulo: string; cuerpo: string | null; tipo: string; leida: number; created_at: string }>>([]);
  const [notifCount, setNotifCount] = useState(0);

  const cargarContador = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/notificaciones.php?action=contador');
      if (res.data.ok) setNotifCount(res.data.no_leidas ?? 0);
    } catch { /* silencioso */ }
  }, [user]);

  useEffect(() => {
    if (!user) { setNotifCount(0); return; }
    void cargarContador();
    const iv = setInterval(cargarContador, 30000);
    return () => clearInterval(iv);
  }, [user, cargarContador]);

  const abrirNotificaciones = async () => {
    setShowNotif(v => !v);
    if (showNotif) return;
    try {
      const res = await api.get('/notificaciones.php?action=listar');
      if (res.data.ok) setNotifs(res.data.notificaciones ?? []);
    } catch { setNotifs([]); }
  };

  const marcarLeida = async (id: number) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: 1 } : n));
    setNotifCount(c => Math.max(0, c - 1));
    api.post('/notificaciones.php?action=marcar_leida', { id }).catch(() => {});
  };

  const marcarTodasLeidas = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, leida: 1 })));
    setNotifCount(0);
    api.post('/notificaciones.php?action=marcar_todas_leidas', {}).catch(() => {});
  };

  const tiempoRelativo = (fecha: string) => {
    const diffMs = Date.now() - new Date(fecha.replace(' ', 'T')).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.floor(h / 24)} d`;
  };

  // ── Colors ───────────────────────────────────────────────────────────────────
  const bg      = isDark ? '#080D18' : '#FFFFFF';
  const border  = isDark ? '#1E293B' : '#E2E8F0';
  const accent  = isDark ? '#3B82F6' : '#2563EB';
  const textCol = isDark ? '#F1F5F9' : '#0F172A';
  const mutedCol= isDark ? '#64748B' : '#94A3B8';
  const cardBg  = isDark ? '#111827' : '#FFFFFF';
  const inputBg = isDark ? '#1E293B' : '#F1F5F9';
  const elevated= isDark ? '#1A2236' : '#F8FAFC';

  // ── Scroll shadow ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Close dropdowns on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) setShowLocPicker(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDrop(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Close on route change ─────────────────────────────────────────────────────
  useEffect(() => {
    setShowLocPicker(false);
    setShowUserMenu(false);
    setShowSearchDrop(false);
    setSearchQ('');
    setSearchResults([]);
  }, [location.pathname]);

  // ── Live search ───────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setShowSearchDrop(false); return; }
    setSearchLoading(true);
    setShowSearchDrop(true);
    try {
      const res = await api.get('/productos.php', { params: { action: 'buscar', q: q.trim(), limit: 6 } });
      setSearchResults(res.data.productos ?? []);
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }, []);

  const handleSearchInput = (val: string) => {
    setSearchQ(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSearchResults([]); setShowSearchDrop(false); return; }
    setShowSearchDrop(true);
    searchTimer.current = setTimeout(() => runSearch(val), 350);
  };

  const handleSearchSubmit = () => {
    if (!searchQ.trim()) return;
    navigate(`/explorar?q=${encodeURIComponent(searchQ.trim())}`);
    setShowSearchDrop(false);
    setSearchQ('');
  };

  const selectMunicipio = (m: string) => {
    setMunicipio(m);
    setShowLocPicker(false);
    setLocSearch('');
    if (user?.id) {
      fetch('http://localhost/GOCreaj2026/apps/mobile/backend/auth.php?action=actualizar_municipio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('lm_token_v1') ?? ''}` },
        body: JSON.stringify({ municipio: m }),
      }).catch(() => {});
    }
  };

  const filteredMunicipios = MUNICIPIOS_SV.filter(m => m.toLowerCase().includes(locSearch.toLowerCase()));

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  type RolKey = 'admin' | 'vendedor' | 'repartidor' | 'comprador' | undefined;
  // Soporta tanto user.role (guardado desde login) como user.rol (campo raw de PHP)
  const rol = (user?.role || (user as any)?.rol) as RolKey;

  const navLinks = [
    { path: '/',          label: t('header.nav.inicio'),   icon: iHome() },
    { path: '/explorar',  label: t('header.nav.explorar'), icon: iCompass() },
    { path: '/reels',     label: t('header.nav.reels'),    icon: iReels() },
    { path: '/historial', label: t('header.nav.pedidos'),  icon: iOrders() },
    { path: '/chat',      label: t('header.nav.chats'),    icon: iChat() },
  ];

  // ── Shared dropdown style ─────────────────────────────────────────────────────
  const dropdownStyle: React.CSSProperties = {
    position: 'absolute', background: cardBg,
    border: `1.5px solid ${border}`, borderRadius: 16,
    boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.55)' : '0 20px 48px rgba(15,23,42,0.12)',
    zIndex: 2100, overflow: 'hidden',
  };

  // ── imgUri helper ─────────────────────────────────────────────────────────────
  const imgUri = (img?: string | null) => {
    if (!img) return null;
    if (img.startsWith('data:') || img.startsWith('http')) return img;
    return `http://localhost/GOCreaj2026/apps/mobile/backend/uploads/${img}`;
  };

  return (
    // Use a generic <div> so global CSS `nav`, `header` rules don't interfere
    <div style={{
      position: 'sticky', top: 0, zIndex: 1000,
      background: bg,
      borderBottom: `1px solid ${scrolled ? border : 'transparent'}`,
      boxShadow: scrolled ? (isDark ? '0 4px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(15,23,42,0.08)') : 'none',
      transition: 'border-color 0.25s, box-shadow 0.25s',
    }}>

      {/* ── Top row ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        maxWidth: 1280, margin: '0 auto',
        padding: '0 24px', height: 60,
      }}>

        {/* Logo */}
        <button onClick={() => navigate('/')} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: `linear-gradient(135deg, ${accent}, #7C3AED)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 12, color: '#FFF', letterSpacing: '-0.5px',
            boxShadow: `0 4px 12px ${accent}40`, flexShrink: 0,
          }}>SV</div>
          <span style={{ fontWeight: 900, fontSize: 20, color: accent, letterSpacing: '-0.5px' }}>Go</span>
        </button>

        {/* Municipio picker */}
        <div ref={locRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setShowLocPicker(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: inputBg, border: `1.5px solid ${showLocPicker ? accent : border}`,
            borderRadius: 10, padding: '6px 11px',
            cursor: 'pointer', fontSize: 13, color: textCol,
            transition: 'border-color 0.15s', fontFamily: 'inherit',
          }}>
            {iPin(accent)}
            <span style={{ color: mutedCol }}>{t('header.enviarA')}</span>
            <strong style={{ color: textCol, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{municipio}</strong>
            {iChevron(mutedCol, showLocPicker)}
          </button>
          {showLocPicker && (
            <div style={{ ...dropdownStyle, top: 'calc(100% + 8px)', left: 0, width: 240 }}>
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${border}` }}>
                <input
                  autoFocus type="text" placeholder={t('header.buscarMunicipio')}
                  value={locSearch} onChange={e => setLocSearch(e.target.value)}
                  style={{
                    width: '100%', border: `1.5px solid ${border}`, borderRadius: 8,
                    padding: '7px 10px', fontSize: 13, outline: 'none',
                    boxSizing: 'border-box', background: inputBg, color: textCol,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filteredMunicipios.map(m => (
                  <button key={m} onClick={() => selectMunicipio(m)} style={{
                    width: '100%', textAlign: 'left', padding: '9px 14px',
                    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: m === municipio ? (isDark ? '#1E293B' : '#EEF2FF') : 'transparent',
                    color: m === municipio ? accent : textCol,
                    display: 'flex', alignItems: 'center', gap: 7,
                    transition: 'background 0.1s', fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => { if (m !== municipio) (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#1A2236' : '#F8FAFC'; }}
                    onMouseLeave={e => { if (m !== municipio) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    {m === municipio && iCheck(accent)}
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Live Search bar */}
        <div ref={searchRef} style={{ flex: 1, position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: inputBg, border: `1.5px solid ${showSearchDrop && searchQ ? accent : border}`,
            borderRadius: 12, padding: '0 14px', height: 40,
            transition: 'border-color 0.15s',
          }}>
            {iSearch(mutedCol)}
            <input
              type="text"
              placeholder={t('header.buscarPlaceholder')}
              value={searchQ}
              onChange={e => handleSearchInput(e.target.value)}
              onFocus={() => { if (searchQ.trim()) setShowSearchDrop(true); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(); if (e.key === 'Escape') { setShowSearchDrop(false); setSearchQ(''); } }}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                color: textCol, fontSize: 14, fontWeight: 500, outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {searchQ && (
              <button onClick={() => { setSearchQ(''); setSearchResults([]); setShowSearchDrop(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedCol, display: 'flex', padding: 2 }}>
                {iX()}
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {showSearchDrop && searchQ.trim() && (
            <div style={{
              ...dropdownStyle,
              top: 'calc(100% + 8px)', left: 0, right: 0,
              width: '100%', minWidth: 340,
            }}>
              {searchLoading ? (
                <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10, color: mutedCol, fontSize: 13 }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${border}`, borderTopColor: accent, borderRadius: '50%', animation: 'hSpin 0.8s linear infinite' }} />
                  <style>{`@keyframes hSpin{to{transform:rotate(360deg)}}`}</style>
                  {t('header.buscando')}
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: '16px', color: mutedCol, fontSize: 13, textAlign: 'center' }}>
                  {t('header.sinResultados', { q: searchQ })}
                </div>
              ) : (
                <>
                  {searchResults.map(prod => {
                    const price = prod.precio_oferta ?? prod.precio;
                    const src   = imgUri(prod.imagen_url);
                    return (
                      <button
                        key={prod.id}
                        onClick={() => {
                          navigate(`/explorar?q=${encodeURIComponent(prod.nombre)}`);
                          setShowSearchDrop(false); setSearchQ('');
                        }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', border: 'none', background: 'transparent',
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                          borderBottom: `1px solid ${border}`, fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#1A2236' : '#F8FAFC')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Thumbnail */}
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: isDark ? '#1E293B' : '#EFF6FF',
                          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {src
                            ? <img src={src} alt={prod.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <svg viewBox="0 0 24 24" fill="none" stroke={mutedCol} strokeWidth="1.5" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: textCol, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.nombre}</div>
                          <div style={{ fontSize: 11, color: mutedCol }}>{prod.tienda_nombre}{prod.categoria ? ` · ${prod.categoria}` : ''}</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: accent, flexShrink: 0 }}>${price.toFixed(2)}</div>
                      </button>
                    );
                  })}
                  {/* Ver todos */}
                  <button
                    onClick={handleSearchSubmit}
                    style={{
                      width: '100%', padding: '11px 14px', border: 'none', background: isDark ? '#0D1321' : '#F8FAFC',
                      color: accent, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      fontFamily: 'inherit', borderTop: `1px solid ${border}`,
                    }}
                  >
                    {iSearch(accent)}
                    {t('header.verTodos', { q: searchQ })}
                    <svg viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} title={isDark ? t('header.modoClaro') : t('header.modoOscuro')} style={iconBtnStyle(inputBg, border, textCol)}>
            {isDark ? iSun() : iMoon()}
          </button>

          {/* Notificaciones */}
          {user && (
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={abrirNotificaciones} style={{ ...iconBtnStyle(inputBg, border, textCol), position: 'relative' }}>
                {iBell()}
                {notifCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -5,
                    background: '#EF4444', color: '#FFF',
                    fontSize: 10, fontWeight: 900,
                    width: 18, height: 18, borderRadius: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${bg}`,
                  }}>{notifCount > 9 ? '9+' : notifCount}</span>
                )}
              </button>
              {showNotif && (
                <div style={{ ...dropdownStyle, top: 'calc(100% + 8px)', right: 0, width: 340, maxHeight: 420, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${border}` }}>
                    <strong style={{ fontSize: 13, color: textCol }}>Notificaciones</strong>
                    {notifs.some(n => !n.leida) && (
                      <button onClick={marcarTodasLeidas} style={{ background: 'none', border: 'none', color: accent, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                        Marcar todas leídas
                      </button>
                    )}
                  </div>
                  {notifs.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: mutedCol, fontSize: 13 }}>Sin notificaciones todavía.</div>
                  ) : notifs.map(n => (
                    <button
                      key={n.id}
                      onClick={() => marcarLeida(n.id)}
                      style={{
                        width: '100%', textAlign: 'left', display: 'flex', gap: 8, alignItems: 'flex-start',
                        padding: '12px 14px', border: 'none', borderBottom: `1px solid ${border}`,
                        background: n.leida ? 'transparent' : (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.05)'),
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {!n.leida && <span style={{ width: 7, height: 7, borderRadius: 4, background: accent, marginTop: 5, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: n.leida ? 600 : 800, color: textCol }}>{n.titulo}</div>
                        {n.cuerpo && <div style={{ fontSize: 11.5, color: mutedCol, marginTop: 2 }}>{n.cuerpo}</div>}
                        <div style={{ fontSize: 10.5, color: mutedCol, marginTop: 3 }}>{tiempoRelativo(n.created_at)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <button onClick={() => navigate('/carritoypago')} style={{ ...iconBtnStyle(inputBg, border, textCol), position: 'relative' }}>
            {iCart()}
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                background: accent, color: '#FFF',
                fontSize: 10, fontWeight: 900,
                width: 18, height: 18, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${bg}`,
              }}>{cartCount > 9 ? '9+' : cartCount}</span>
            )}
          </button>

          {/* User menu */}
          <div ref={userRef} style={{ position: 'relative' }}>
            <button onClick={() => user ? setShowUserMenu(v => !v) : navigate('/login')} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: inputBg, border: `1.5px solid ${showUserMenu ? accent : border}`,
              borderRadius: 10, padding: '5px 11px',
              cursor: 'pointer', fontSize: 13, fontWeight: 700,
              color: textCol, transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
              {/* Profile photo or initial */}
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: user ? accent : border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 900, color: '#FFF', flexShrink: 0,
                overflow: 'hidden',
              }}>
                {(user as any)?.foto_perfil
                  ? <img src={imgUri((user as any).foto_perfil) ?? undefined} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : user ? (user.name ?? '?').charAt(0).toUpperCase() : '?'
                }
              </div>
              <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user ? ((user.name ?? '').split(' ')[0] || t('header.usuario')) : t('header.ingresar')}
              </span>
              {user && iChevron(mutedCol, showUserMenu)}
            </button>

            {user && showUserMenu && (
              <div style={{ ...dropdownStyle, top: 'calc(100% + 8px)', right: 0, width: 220 }}>
                {/* User info */}
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 20, background: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900, color: '#FFF', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {(user as any)?.foto_perfil
                      ? <img src={imgUri((user as any).foto_perfil) ?? undefined} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (user.name ?? '?').charAt(0).toUpperCase()
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: textCol, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: mutedCol, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    {rol && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        marginTop: 4, padding: '2px 8px', borderRadius: 99,
                        background: `${accent}18`, fontSize: 10, fontWeight: 800, color: accent,
                      }}>{rol.charAt(0).toUpperCase() + rol.slice(1)}</div>
                    )}
                  </div>
                </div>
                {[
                  { label: t('header.miPerfil'),       path: '/perfil',             show: true },
                  { label: t('header.configuracion'),  path: '/perfil',             show: true },
                  { label: t('header.idioma'),         path: '/perfil',             show: true },
                  { label: t('header.miTienda'),       path: '/dashboard-vendedor', show: rol === 'vendedor' },
                  { label: t('header.misEntregas'),    path: '/entregas',           show: rol === 'repartidor' },
                  { label: t('header.panelAdmin'),     path: '/admin',              show: rol === 'admin' },
                ].filter(i => i.show).map((item, idx) => (
                  <button key={`${item.path}-${idx}`}
                    onClick={() => { navigate(item.path); setShowUserMenu(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 16px',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, color: textCol,
                      transition: 'background 0.1s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#1E293B' : '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >{item.label}</button>
                ))}
                <div style={{ borderTop: `1px solid ${border}`, margin: '4px 0' }} />
                <button
                  onClick={() => { logout(); window.location.href = '/login'; }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 16px',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, color: '#EF4444', fontFamily: 'inherit',
                  }}
                >{t('header.cerrarSesion')}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Nav 4 secciones — usa div para evitar CSS global de <nav> ─────── */}
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 42, borderTop: `1px solid ${border}`, position: 'relative',
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {navLinks.map(link => {
            const active = isActive(link.path);
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 18px', borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  background: active ? `${accent}18` : 'transparent',
                  color: active ? accent : mutedCol,
                  fontSize: 13, fontWeight: active ? 700 : 600,
                  transition: 'all 0.15s',
                  borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                  fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = isDark ? '#1E293B' : '#F1F5F9'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {link.icon}
                {link.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Icon button shared style ──────────────────────────────────────────────────
function iconBtnStyle(bg: string, border: string, color?: string): React.CSSProperties {
  return {
    width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${border}`,
    background: bg, cursor: 'pointer', color: color ?? 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', flexShrink: 0,
  };
}

// ── SVG Icons (all 15×15 for nav, 16×16 for actions) ─────────────────────────
function iHome() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function iCompass() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>;
}
function iChat() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function iReels() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>;
}
function iOrders() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
}
function iProfile(rol?: string) {
  if (rol === 'admin') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (rol === 'vendedor') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M3 9l1-6h16l1 6"/><path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/></svg>;
  if (rol === 'repartidor') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function iPin(color: string) {
  return <svg viewBox="0 0 24 24" fill={color} width="13" height="13"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
}
function iChevron(color: string, open: boolean) {
  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" width="11" height="11" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>;
}
function iCheck(color: string) {
  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>;
}
function iSearch(color: string) {
  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" width="15" height="15" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
}
function iX() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><path d="M18 6 6 18M6 6l12 12"/></svg>;
}
function iCart() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
}
function iSun() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><circle cx="12" cy="12" r="5" fill="currentColor"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
}
function iMoon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
}
function iBell() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
