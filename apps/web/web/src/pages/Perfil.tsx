import { useState, useEffect, useRef } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { api } from '../api';
import '../../css/perfil.css';
import '../../css/dark.css';

const LANG_KEY = 'svgo_lang';
const LANGS = [{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }, { code: 'fr', label: 'Français' }];

type Tab = 'likes' | 'guardados' | 'compartidos';

const ACCENT = '#4A6D8C';
const ACCENT_LIGHT = 'rgba(74,109,140,0.1)';

export default function Perfil() {
  const { user, login, logout, theme, toggleTheme, refreshUser } = useGlobal();
  const navigate = useNavigate();

  // Refresca el rol desde la BD cada vez que se abre el perfil
  useEffect(() => { void refreshUser(); }, []);

  // Edit modal
  const [modalEditar, setModalEditar] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editFoto, setEditFoto] = useState('');
  const [editPassActual, setEditPassActual] = useState('');
  const [editPassNueva, setEditPassNueva] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Activity tab
  const [tab, setTab] = useState<Tab>('likes');
  const [items, setItems] = useState<any[]>([]);

  // Lang
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'es');
  const [toast, setToast] = useState('');

  const u = user as any;
  const displayName = user?.name || 'Usuario';
  // Soporta tanto user.role (normalizado) como user.rol (raw PHP) y los valores en español
  const userRole = user?.role || u?.rol || '';
  const isAdmin      = userRole === 'admin';
  const isVendedor   = userRole === 'vendedor' || userRole === 'seller';
  const isRepartidor = userRole === 'repartidor' || userRole === 'driver';
  const isComprador  = !userRole || userRole === 'comprador' || userRole === 'buyer';
  const roleName = isAdmin ? 'ADMIN'
    : isVendedor    ? 'VENDEDOR'
    : isRepartidor  ? 'REPARTIDOR'
    : 'COMPRADOR';

  // Cooldown 10 días para username
  const diasRestantes = (() => {
    if (!u?.username_changed_at) return 0;
    const daysPassed = Math.floor((Date.now() - new Date(u.username_changed_at).getTime()) / 86400000);
    return Math.max(0, 10 - daysPassed);
  })();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  // Load activity items
  useEffect(() => {
    if (!user) return;
    const ep = tab === 'likes' ? '/interacciones.php?action=mis_likes'
      : tab === 'guardados' ? '/interacciones.php?action=mis_guardados'
      : '/interacciones.php?action=mis_compartidos';
    api.get(ep).then(r => { if (r.data.ok && r.data.productos?.length) setItems(r.data.productos); else setItems([]); }).catch(() => setItems([]));
  }, [tab, user]);

  function abrirEditar() {
    setEditNombre(user?.name || '');
    setEditUsername(u?.username || '');
    setEditEmail(user?.email || '');
    setEditTelefono(u?.telefono || '');
    setEditFoto('');
    setEditPassActual('');
    setEditPassNueva('');
    setUsernameStatus('idle');
    setModalEditar(true);
  }

  function onUsernameChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
    setEditUsername(clean);
    setUsernameStatus('idle');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (clean.length < 3) return;
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const r = await api.post('/auth.php?action=check_username', { username: clean, exclude_id: u?.id });
        setUsernameStatus(r.data.disponible ? 'ok' : 'taken');
      } catch { setUsernameStatus('idle'); }
    }, 600);
  }

  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setEditFoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (usernameStatus === 'taken') { showToast('Ese username ya está en uso'); return; }
    setGuardando(true);
    try {
      const body: Record<string, string> = {};
      if (editNombre !== (user?.name || '')) body.nombre = editNombre;
      if (editUsername !== (u?.username || '') && usernameStatus === 'ok') body.username = editUsername;
      if (editEmail !== (user?.email || '')) body.email = editEmail;
      if (editTelefono !== (u?.telefono || '')) body.telefono = editTelefono;
      if (editFoto) body.foto_perfil = editFoto;
      if (editPassNueva && editPassActual) { body.password_actual = editPassActual; body.password_nueva = editPassNueva; }

      const r = await api.post('/auth.php?action=actualizar_perfil', body);
      if (r.data.ok) {
        login({ name: r.data.usuario.nombre, email: r.data.usuario.email, role: r.data.usuario.rol, ...r.data.usuario } as any);
        setModalEditar(false);
        showToast('Perfil actualizado');
      } else {
        showToast(r.data.error === 'username_taken' ? 'Ese username ya está en uso' : r.data.error || 'Error al guardar');
      }
    } catch { showToast('Error de conexión'); }
    setGuardando(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid var(--border, #E2DCEF)',
    borderRadius: '10px', fontSize: '0.9rem', background: 'var(--bg-secondary, #F9FAFB)',
    color: 'inherit', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted, #6B7280)',
    marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  return (
    <>
      <Header />
      <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={onFotoChange} />

      {/* ── EDIT MODAL ── */}
      {modalEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{
            background: 'var(--bg, #fff)', width: '100%', maxWidth: '560px',
            borderTopLeftRadius: '28px', borderTopRightRadius: '28px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border, #E2DCEF)' }} />
            </div>
            <form onSubmit={guardarPerfil} style={{ padding: '0 24px 40px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '20px' }}>Editar Perfil</h3>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ width: '88px', height: '88px', borderRadius: '44px', background: ACCENT, border: 'none', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  {editFoto
                    ? <img src={editFoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="32" height="32"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  }
                </button>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: ACCENT }}>Cambiar foto</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Nombre completo</label>
                  <input style={inputStyle} value={editNombre} onChange={e => setEditNombre(e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                  <label style={labelStyle}>
                    Username
                    {usernameStatus === 'ok' && <span style={{ color: '#22c55e', marginLeft: '8px', textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg> Disponible</span>}
                    {usernameStatus === 'taken' && <span style={{ color: '#ef4444', marginLeft: '8px', textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> No disponible</span>}
                    {usernameStatus === 'checking' && <span style={{ color: '#f59e0b', marginLeft: '8px', textTransform: 'none' }}>Verificando...</span>}
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: usernameStatus === 'ok' ? '#22c55e' : usernameStatus === 'taken' ? '#ef4444' : undefined }}
                    value={editUsername}
                    onChange={e => onUsernameChange(e.target.value)}
                    disabled={diasRestantes > 0}
                    placeholder="tu_username"
                  />
                  {diasRestantes > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '7px 10px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Puedes cambiar tu username en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input style={inputStyle} type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input style={inputStyle} type="tel" value={editTelefono} onChange={e => setEditTelefono(e.target.value)} placeholder="+503 0000-0000" />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña actual</label>
                  <input style={inputStyle} type="password" value={editPassActual} onChange={e => setEditPassActual(e.target.value)} placeholder="••••••" />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña nueva</label>
                  <input style={inputStyle} type="password" value={editPassNueva} onChange={e => setEditPassNueva(e.target.value)} placeholder="••••••" />
                </div>
              </div>

              <button type="submit" disabled={guardando}
                style={{ width: '100%', marginTop: '20px', padding: '14px', background: ACCENT, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setModalEditar(false)}
                style={{ width: '100%', marginTop: '10px', padding: '14px', background: 'transparent', border: '1.5px solid var(--border, #E2DCEF)', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', color: 'var(--text-muted, #6B7280)' }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="perfil-page" style={{ maxWidth: '680px', margin: '0 auto', paddingBottom: '40px' }}>

        {/* ── HEADER GRADIENT ── */}
        <div style={{ background: ACCENT, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 28px', marginBottom: '16px' }}>
          <div style={{ width: '106px', height: '106px', borderRadius: '53px', border: '3px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '44px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {u?.foto_perfil
                ? <img src={u.foto_perfil} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)" width="44" height="44"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              }
            </div>
          </div>

          <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px' }}>{displayName}</span>
          {u?.username && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', fontWeight: '500', marginTop: '2px' }}>@{u.username}</span>}
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', fontWeight: '500', marginTop: '2px' }}>{user?.email || u?.telefono || '—'}</span>

          {/* Rol badge — admin tiene estilo especial dorado */}
          <div style={{
            background: isAdmin ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.2)',
            border: isAdmin ? '1px solid rgba(251,191,36,0.5)' : 'none',
            borderRadius: '20px', padding: '4px 14px', marginTop: '8px',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            {isAdmin && (
              <svg viewBox="0 0 24 24" fill="none" stroke="#FBB f24" strokeWidth="2" width="12" height="12" style={{ color: '#FBB f24' }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FBB f24" stroke="none"/>
              </svg>
            )}
            <span style={{ color: isAdmin ? '#FDE68A' : '#fff', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '1px' }}>
              {isAdmin && '★ '}{roleName}
            </span>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'flex', width: '100%', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 0', marginTop: '16px' }}>
            {[['24', 'Pedidos'], ['8', 'Guardados'], ['47', 'Me gusta']].map(([n, l], i, arr) => (
              <div key={l} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.25)' : 'none' }}>
                <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900' }}>{n}</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', fontWeight: '600', marginTop: '2px' }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Editar Perfil */}
            <button onClick={abrirEditar}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '20px', padding: '7px 16px', cursor: 'pointer', fontWeight: '800', fontSize: '0.82rem', color: ACCENT }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar Perfil
            </button>

            {/* Botón Panel Admin — solo si es admin */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  border: 'none', borderRadius: '20px', padding: '7px 16px',
                  cursor: 'pointer', fontWeight: '800', fontSize: '0.82rem', color: '#fff',
                  boxShadow: '0 2px 8px rgba(217,119,6,0.4)',
                }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="13" height="13">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                Panel Admin
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>

          {/* ── Acceso de administrador (tarjeta especial, solo admin) ── */}
          {isAdmin && (
            <>
              <SectionLabel>Administración</SectionLabel>
              <div
                onClick={() => navigate('/admin')}
                style={{
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #355068 60%, #4A6D8C 100%)',
                  borderRadius: '16px', padding: '20px', marginBottom: '16px',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(30,58,95,0.25)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                {/* Decoración de fondo */}
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', bottom: '-30px', right: '60px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#FBB f24" strokeWidth="2" width="24" height="24" style={{ color: '#FBB f24' }}>
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ color: '#fff', fontWeight: '800', fontSize: '1rem' }}>Panel de Administración</span>
                      <span style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', color: '#FDE68A', fontSize: '0.6rem', fontWeight: '800', padding: '2px 7px', borderRadius: '10px', letterSpacing: '0.5px' }}>ADMIN</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: '500' }}>Gestiona usuarios, pedidos y productos</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            </>
          )}

          {/* ── Mi cuenta ── */}
          <SectionLabel>Mi cuenta</SectionLabel>
          <MenuCard>
            {/* Botón principal según el rol */}
            {isAdmin && (
              <MenuItem icon="shield" bg="rgba(251,191,36,0.15)" color="#D97706" title="Panel del Admin" sub="Gestión de usuarios y pedidos" onClick={() => navigate('/admin')} />
            )}
            {isVendedor && (
              <MenuItem icon="store" bg={ACCENT_LIGHT} color={ACCENT} title="Mi Tienda" sub="Gestiona tus productos y ventas" onClick={() => navigate('/dashboard-vendedor')} />
            )}
            {isRepartidor && (
              <MenuItem icon="truck" bg={ACCENT_LIGHT} color={ACCENT} title="Mis Entregas" sub="Ver pedidos asignados" onClick={() => navigate('/entregas')} />
            )}
            {isComprador && (
              <MenuItem icon="briefcase" bg={ACCENT_LIGHT} color={ACCENT} title="Convertirse en Socio" sub="Vendedor o Repartidor" onClick={() => navigate('/become-seller')} />
            )}
            <MenuItem icon="receipt" bg={ACCENT_LIGHT} color={ACCENT} title="Mis Pedidos" sub="Historial de compras" onClick={() => navigate('/historial')} />
            <MenuItem icon="help-circle" bg={ACCENT_LIGHT} color={ACCENT} title="Soporte y Ayuda" sub="Tickets y reportes" onClick={() => navigate('/chat')} last />
          </MenuCard>

          {/* ── Configuración ── */}
          <SectionLabel>Configuración</SectionLabel>
          <MenuCard>
            {/* Dark mode */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border, #E2DCEF)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '19px', background: theme === 'dark' ? ACCENT_LIGHT : 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', flexShrink: 0, color: theme === 'dark' ? ACCENT : '#f59e0b' }}>
                {theme === 'dark'
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6B7280)', marginTop: '1px' }}>{theme === 'dark' ? 'Activado' : 'Desactivado'}</div>
              </div>
              <button onClick={toggleTheme}
                style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', background: theme === 'dark' ? ACCENT : '#E2DCEF', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: '3px', left: theme === 'dark' ? '24px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              </button>
            </div>

            {/* Idioma */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border, #E2DCEF)' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '19px', background: ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', flexShrink: 0, color: ACCENT }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>Idioma</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6B7280)', marginTop: '1px' }}>{LANGS.find(l => l.code === lang)?.label || 'Español'}</div>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); localStorage.setItem(LANG_KEY, l.code); }}
                    style={{ padding: '4px 10px', borderRadius: '20px', border: '1.5px solid', borderColor: lang === l.code ? ACCENT : 'var(--border, #E2DCEF)', background: lang === l.code ? ACCENT : 'transparent', color: lang === l.code ? '#fff' : 'inherit', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
                    {l.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <MenuItem icon="bell" bg={ACCENT_LIGHT} color={ACCENT} title="Notificaciones" sub="Pedidos, promos y mensajes" onClick={() => {}} />
            <MenuItem icon="shield" bg={ACCENT_LIGHT} color={ACCENT} title="Privacidad y Seguridad" sub="Datos y permisos" onClick={() => {}} last />
          </MenuCard>

          {/* Version */}
          <p style={{ textAlign: 'center', color: 'var(--text-muted, #6B7280)', fontSize: '0.78rem', fontWeight: '500', marginBottom: '16px' }}>
            Versión 1.0.0 · [SV]Go © 2026
          </p>

          {/* Cerrar sesión */}
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '14px', background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#ef4444', fontWeight: '700', fontSize: '0.92rem', cursor: 'pointer', marginBottom: '24px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Cerrar Sesión
          </button>

          {/* ── Mi actividad (tabs) ── */}
          <SectionLabel>Mi actividad</SectionLabel>
          <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border, #E2DCEF)', marginBottom: '16px' }}>
            {([
              ['likes', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, 'Me gusta'],
              ['guardados', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>, 'Guardados'],
              ['compartidos', <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, 'Compartidos'],
            ] as [Tab, React.ReactNode, string][]).map(([tb, icon, label]) => (
              <button key={tb} onClick={() => setTab(tb)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '12px 0', border: 'none', background: 'transparent', borderBottom: `3px solid ${tab === tb ? ACCENT : 'transparent'}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', color: tab === tb ? ACCENT : 'var(--text-muted, #6B7280)', marginBottom: '-1.5px' }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Product grid */}
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted, #6B7280)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>Nada aquí todavía</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingBottom: '32px' }}>
              {items.map((item: any) => (
                <div key={item.id} style={{ borderRadius: '12px', border: '1.5px solid var(--border, #E2DCEF)', overflow: 'hidden', background: 'var(--card, #fff)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ height: '110px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.imagen_url
                      ? <img src={item.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" width="36" height="36"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    }
                  </div>
                  <div style={{ padding: '10px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6B7280)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.tienda_nombre}</div>
                    <div style={{ fontWeight: '800', marginTop: '4px', fontSize: '0.9rem', color: ACCENT }}>${Number(item.precio).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {toast && (
        <div className="lm-toast show">
          <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted, #6B7280)', marginBottom: '8px', marginTop: '4px' }}>
      {children}
    </p>
  );
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card, #fff)', borderRadius: '14px', border: '1.5px solid var(--border, #E2DCEF)', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {children}
    </div>
  );
}

const ICONS: Record<string, JSX.Element> = {
  briefcase:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  receipt:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16l3-1.5L9 20l2-1.5L13 20l2-1.5L17 20l2-1.5V8z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>,
  'help-circle':<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  bell:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  shield:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  store:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M3 9l1-6h16l1 6"/><path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>,
  truck:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
};

function MenuItem({ icon, bg, color, title, sub, onClick, last }: { icon: string; bg: string; color: string; title: string; sub?: string; onClick: () => void; last?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', border: 'none', background: 'transparent', borderBottom: last ? 'none' : '1px solid var(--border, #E2DCEF)', cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '19px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', color, flexShrink: 0 }}>
        {ICONS[icon]}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '700', fontSize: '0.92rem' }}>{title}</div>
        {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6B7280)', marginTop: '1px' }}>{sub}</div>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, #6B7280)" strokeWidth="2" width="16" height="16"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  );
}