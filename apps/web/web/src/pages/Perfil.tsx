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
  const { user, login, logout, theme, toggleTheme } = useGlobal();
  const navigate = useNavigate();

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
  const roleName = user?.role === 'admin' ? 'ADMIN'
    : user?.role === 'seller' || user?.role === 'vendedor' ? 'VENDEDOR'
    : user?.role === 'driver' || user?.role === 'repartidor' ? 'REPARTIDOR'
    : 'COMPRADOR';
  const isComprador = !user?.role || user?.role === 'buyer' || user?.role === 'comprador';

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
        login({ name: r.data.usuario.nombre, email: r.data.usuario.email, role: r.data.usuario.rol, ...r.data.usuario });
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
      <Header activeTab="none" />
      <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={onFotoChange} />

      {/* ── EDIT MODAL ── */}
      {modalEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{
            background: 'var(--bg, #fff)', width: '100%', maxWidth: '560px',
            borderTopLeftRadius: '28px', borderTopRightRadius: '28px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border, #E2DCEF)' }} />
            </div>
            <form onSubmit={guardarPerfil} style={{ padding: '0 24px 40px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '20px' }}>Editar Perfil</h3>

              {/* Photo picker */}
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
                    {usernameStatus === 'ok' && <span style={{ color: '#22c55e', marginLeft: '8px', textTransform: 'none' }}>✓ Disponible</span>}
                    {usernameStatus === 'taken' && <span style={{ color: '#ef4444', marginLeft: '8px', textTransform: 'none' }}>✗ No disponible</span>}
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
                      <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600' }}>
                        ⏱ Puedes cambiar tu username en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
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

        {/* ── HEADER GRADIENT (igual que app) ── */}
        <div style={{ background: ACCENT, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 28px', marginBottom: '16px' }}>
          {/* Avatar ring */}
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

          {/* Rol badge */}
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '4px 14px', marginTop: '8px' }}>
            <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: '800', letterSpacing: '1px' }}>{roleName}</span>
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

          {/* Editar Perfil pill */}
          <button onClick={abrirEditar}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '20px', padding: '7px 16px', marginTop: '14px', cursor: 'pointer', fontWeight: '800', fontSize: '0.82rem', color: ACCENT }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar Perfil
          </button>
        </div>

        <div style={{ padding: '0 16px' }}>

          {/* ── Mi cuenta ── */}
          <SectionLabel>Mi cuenta</SectionLabel>
          <MenuCard>
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
              <div style={{ width: '38px', height: '38px', borderRadius: '19px', background: theme === 'dark' ? ACCENT_LIGHT : 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', flexShrink: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
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
              <div style={{ width: '38px', height: '38px', borderRadius: '19px', background: ACCENT_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', flexShrink: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>🌐</span>
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
            {([['likes', '❤️', 'Me gusta'], ['guardados', '🔖', 'Guardados'], ['compartidos', '↗️', 'Compartidos']] as [Tab, string, string][]).map(([tb, icon, label]) => (
              <button key={tb} onClick={() => setTab(tb)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '12px 0', border: 'none', background: 'transparent', borderBottom: `3px solid ${tab === tb ? ACCENT : 'transparent'}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem', color: tab === tb ? ACCENT : 'var(--text-muted, #6B7280)', marginBottom: '-1.5px' }}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Product grid */}
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted, #6B7280)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📭</div>
              <p style={{ fontWeight: '600', fontSize: '0.9rem' }}>Nada aquí todavía</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingBottom: '32px' }}>
              {items.map((item: any) => (
                <div key={item.id} style={{ borderRadius: '12px', border: '1.5px solid var(--border, #E2DCEF)', overflow: 'hidden', background: 'var(--card, #fff)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ height: '110px', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.imagen_url
                      ? <img src={item.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <span style={{ fontSize: '2rem' }}>🛒</span>
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
  briefcase: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  receipt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16l3-1.5L9 20l2-1.5L13 20l2-1.5L17 20l2-1.5V8z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>,
  'help-circle': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
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
