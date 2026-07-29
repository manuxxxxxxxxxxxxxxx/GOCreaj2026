import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '../context/GlobalContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api } from '../api';
import '../../css/perfil.css';
import '../../css/dark.css';

const LANGS = [{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }, { code: 'fr', label: 'Français' }];

type Tab = 'likes' | 'guardados' | 'compartidos';

const ACCENT = '#4A6D8C';
const ACCENT_LIGHT = 'rgba(74,109,140,0.1)';

export default function Perfil() {
  const { i18n } = useTranslation();
  const { user, login, logout, theme, toggleTheme, refreshUser } = useGlobal();
  const navigate = useNavigate();

  // Refresca el rol desde la BD cada vez que se abre el perfil
  useEffect(() => { void refreshUser(); }, []);

  // Adopta el idioma guardado en la cuenta (p. ej. el elegido desde la app) si difiere del local.
  useEffect(() => {
    const cuentaIdioma = (user as any)?.idioma;
    if (cuentaIdioma && cuentaIdioma !== i18n.language) void i18n.changeLanguage(cuentaIdioma);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(user as any)?.idioma]);

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

  // Contadores reales de la barra de stats (antes eran números quemados: 24/8/47)
  const [stats, setStats] = useState({ pedidos: 0, guardados: 0, likes: 0 });
  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get('/carrito_pagos.php?action=mis_pedidos').catch(() => null),
      api.get('/interacciones.php?action=mis_guardados').catch(() => null),
      api.get('/interacciones.php?action=mis_likes').catch(() => null),
    ]).then(([rp, rg, rl]) => {
      setStats({
        pedidos: rp?.data?.ok ? (rp.data.pedidos?.length ?? 0) : 0,
        guardados: rg?.data?.ok ? (rg.data.productos?.length ?? 0) : 0,
        likes: rl?.data?.ok ? (rl.data.productos?.length ?? 0) : 0,
      });
    });
  }, [user]);

  // Lang: react-i18next ya persiste en localStorage (ver src/i18n.ts) y aquí además
  // lo sincronizamos con la cuenta para que se mantenga entre la web y la app.
  const cambiarIdioma = (code: string) => {
    void i18n.changeLanguage(code);
    if (user) api.post('/auth.php?action=actualizar_idioma', { idioma: code }).catch(() => {});
  };
  const [toast, setToast] = useState('');

  // Roles habilitados / cambio de rol activo
  const [rolesDisponibles, setRolesDisponibles] = useState<string[]>([]);
  const [rolActivo, setRolActivo] = useState('comprador');
  const [cambiandoRol, setCambiandoRol] = useState(false);

  // Privacidad y seguridad
  const [modalPrivacidad, setModalPrivacidad] = useState(false);
  const [privTab, setPrivTab] = useState<'sesiones' | 'bloqueados' | 'cuenta'>('sesiones');
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [bloqueados, setBloqueados] = useState<any[]>([]);
  const [cargandoPriv, setCargandoPriv] = useState(false);
  const [perfilPublico, setPerfilPublico] = useState(true);
  const [showEliminarCuenta, setShowEliminarCuenta] = useState(false);
  const [passEliminar, setPassEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => { setPerfilPublico(((user as any)?.perfil_publico ?? 1) != 0); }, [(user as any)?.perfil_publico]);

  const abrirPrivacidad = async () => {
    setModalPrivacidad(true);
    setCargandoPriv(true);
    try {
      const [rs, rb] = await Promise.all([
        api.get('/auth.php?action=sesiones_listar'),
        api.get('/auth.php?action=usuarios_bloqueados'),
      ]);
      if (rs.data.ok) setSesiones(rs.data.sesiones ?? []);
      if (rb.data.ok) setBloqueados(rb.data.bloqueados ?? []);
    } catch {}
    setCargandoPriv(false);
  };

  const cerrarSesionRemota = async (id: number) => {
    await api.post('/auth.php?action=sesiones_cerrar', { id });
    setSesiones(prev => prev.filter(s => s.id !== id));
  };

  const cerrarOtrasSesiones = async () => {
    if (!window.confirm('¿Cerrar la sesión en todos tus otros dispositivos?')) return;
    await api.post('/auth.php?action=sesiones_cerrar_otras', {});
    setSesiones(prev => prev.filter(s => s.es_actual));
  };

  const desbloquearUsuario = async (usuario_id: number) => {
    await api.post('/auth.php?action=desbloquear_usuario', { usuario_id });
    setBloqueados(prev => prev.filter(b => b.bloqueado_id !== usuario_id));
  };

  const cambiarVisibilidad = async (val: boolean) => {
    setPerfilPublico(val);
    await api.post('/auth.php?action=actualizar_visibilidad', { perfil_publico: val });
    await refreshUser();
  };

  // Métodos de pago guardados
  const [showMetodosPago, setShowMetodosPago] = useState(false);
  const [metodosPago, setMetodosPago] = useState<any[]>([]);
  const [cargandoMetodos, setCargandoMetodos] = useState(false);
  const [mostrarFormTarjeta, setMostrarFormTarjeta] = useState(false);
  const [mpNumero, setMpNumero] = useState('');
  const [mpExp, setMpExp] = useState('');
  const [mpCvv, setMpCvv] = useState('');
  const [guardandoTarjeta, setGuardandoTarjeta] = useState(false);

  const abrirMetodosPago = async () => {
    setShowMetodosPago(true);
    setCargandoMetodos(true);
    try {
      const r = await api.get('/carrito_pagos.php?action=metodos_listar');
      if (r.data.ok) setMetodosPago(r.data.metodos ?? []);
    } catch {}
    setCargandoMetodos(false);
  };

  const guardarTarjetaNueva = async () => {
    setGuardandoTarjeta(true);
    try {
      const r = await api.post('/carrito_pagos.php?action=metodos_guardar', {
        tarjeta_numero: mpNumero.replace(/\s/g, ''), tarjeta_cvv: mpCvv, tarjeta_exp: mpExp,
      });
      if (r.data.ok) {
        setMpNumero(''); setMpExp(''); setMpCvv('');
        setMostrarFormTarjeta(false);
        await abrirMetodosPago();
      } else {
        alert(r.data.error ?? 'No se pudo guardar la tarjeta.');
      }
    } catch { alert('Sin conexión.'); }
    setGuardandoTarjeta(false);
  };

  const eliminarTarjeta = async (id: number) => {
    await api.post('/carrito_pagos.php?action=metodos_eliminar', { id });
    setMetodosPago(prev => prev.filter((m: any) => m.id !== id));
  };

  const marcarPredeterminada = async (id: number) => {
    await api.post('/carrito_pagos.php?action=metodos_predeterminado', { id });
    setMetodosPago(prev => prev.map((m: any) => ({ ...m, predeterminado: m.id === id ? 1 : 0 })));
  };

  const confirmarEliminarCuenta = async () => {
    if ((user as any)?.auth_provider === 'local' && !passEliminar) { alert('Ingresa tu contraseña actual para confirmar.'); return; }
    setEliminando(true);
    try {
      const res = await api.post('/auth.php?action=eliminar_cuenta', { password: passEliminar });
      if (res.data.ok) {
        logout();
        navigate('/login');
      } else {
        alert(res.data.error === 'Contraseña incorrecta' ? 'Contraseña incorrecta.' : (res.data.error ?? 'No se pudo eliminar la cuenta.'));
      }
    } catch { alert('Sin conexión.'); }
    setEliminando(false);
  };

  useEffect(() => {
    if (!user) return;
    api.get('/auth.php?action=mis_roles').then(res => {
      if (res.data.ok) { setRolesDisponibles(res.data.roles ?? []); setRolActivo(res.data.rol_activo ?? 'comprador'); }
    }).catch(() => {});
  }, [user]);

  const ROL_LABEL: Record<string, string> = { comprador: 'Usuario', vendedor: 'Vendedor', repartidor: 'Repartidor' };

  const cambiarRolActivo = async (rol: string) => {
    if (rol === rolActivo) return;
    setCambiandoRol(true);
    try {
      const res = await api.post('/auth.php?action=cambiar_rol', { rol });
      if (res.data.ok) {
        setRolActivo(rol);
        await refreshUser();
        showToast(`Ahora estás como ${ROL_LABEL[rol] ?? rol}`);
      } else if (res.data.error === 'no_habilitado') {
        navigate(`/become-seller?rol=${rol}`);
      } else {
        showToast(res.data.error ?? 'No se pudo cambiar de rol');
      }
    } catch { showToast('Error de conexión'); }
    setCambiandoRol(false);
  };

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

  // Cooldown 14 días para username
  const diasRestantes = (() => {
    if (!u?.username_changed_at) return 0;
    const daysPassed = Math.floor((Date.now() - new Date(u.username_changed_at).getTime()) / 86400000);
    return Math.max(0, 14 - daysPassed);
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
        <div style={{ background: ACCENT, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 28px', marginBottom: '16px', position: 'relative' }}>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            title="Cerrar sesión"
            style={{
              position: 'absolute', top: '16px', right: '16px',
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '20px', padding: '7px 12px', cursor: 'pointer',
              color: '#fff', fontWeight: '700', fontSize: '0.78rem',
            }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Salir
          </button>
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
            {[[String(stats.pedidos), 'Pedidos'], [String(stats.guardados), 'Guardados'], [String(stats.likes), 'Me gusta']].map(([n, l], i, arr) => (
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
            <MenuItem icon="help-circle" bg={ACCENT_LIGHT} color={ACCENT} title="Soporte y Ayuda" sub="Tickets y reportes" onClick={() => navigate('/chat')} />
            <MenuItem
              icon="info" bg={ACCENT_LIGHT} color={ACCENT} title="Más información de nosotros" sub="Quiénes somos y cómo funciona [SV]Go"
              onClick={() => alert('[SV]Go conecta a comercios locales de El Salvador con compradores y repartidores de su misma zona. Nuestra misión es que cualquier negocio pequeño pueda vender en línea y que cada pedido llegue rápido, de mano de repartidores de la comunidad.')}
              last
            />
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
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6B7280)', marginTop: '1px' }}>{LANGS.find(l => l.code === i18n.language)?.label || 'Español'}</div>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                {LANGS.map(l => (
                  <button key={l.code} onClick={() => cambiarIdioma(l.code)}
                    style={{ padding: '4px 10px', borderRadius: '20px', border: '1.5px solid', borderColor: i18n.language === l.code ? ACCENT : 'var(--border, #E2DCEF)', background: i18n.language === l.code ? ACCENT : 'transparent', color: i18n.language === l.code ? '#fff' : 'inherit', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
                    {l.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <MenuItem icon="bell" bg={ACCENT_LIGHT} color={ACCENT} title="Notificaciones" sub="Pedidos, promos y mensajes" onClick={() => {}} />
            {isComprador && (
              <MenuItem icon="card" bg={ACCENT_LIGHT} color={ACCENT} title="Métodos de pago" sub="Tarjetas guardadas" onClick={abrirMetodosPago} />
            )}
            <MenuItem icon="shield" bg={ACCENT_LIGHT} color={ACCENT} title="Privacidad y Seguridad" sub="Sesiones, bloqueados y tu cuenta" onClick={abrirPrivacidad} />

            {/* Cambiar de rol activo */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 10 }}>Cambiar de rol activo</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['comprador', 'vendedor', 'repartidor'].map(r => {
                  const activo = r === rolActivo;
                  const habilitado = rolesDisponibles.includes(r);
                  return (
                    <button
                      key={r}
                      disabled={cambiandoRol}
                      onClick={() => cambiarRolActivo(r)}
                      style={{
                        padding: '8px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                        border: `1.5px solid ${activo ? ACCENT : 'var(--border, #E2DCEF)'}`,
                        background: activo ? ACCENT : 'transparent',
                        color: activo ? '#fff' : 'inherit',
                      }}
                    >
                      {ROL_LABEL[r]}{!habilitado ? ' (solicitar)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </MenuCard>

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

      {/* ── Modal: Métodos de pago guardados ── */}
      {showMetodosPago && (
        <div onClick={() => setShowMetodosPago(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg, #fff)', width: '100%', maxWidth: '560px',
            borderTopLeftRadius: '28px', borderTopRightRadius: '28px',
            maxHeight: '90vh', overflowY: 'auto', padding: '0 24px 40px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border, #E2DCEF)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.3px' }}>Métodos de pago</h3>
              <button onClick={() => setShowMetodosPago(false)} style={{ background: 'var(--bg-secondary, #F9FAFB)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
            </div>

            {cargandoMetodos ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted, #6B7280)' }}>Cargando...</div>
            ) : (
              <>
                <MenuCard>
                  {metodosPago.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted, #6B7280)' }}>No tienes tarjetas guardadas.</div>
                  ) : metodosPago.map((m: any, i: number) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i === metodosPago.length - 1 ? 'none' : '1px solid var(--border, #E2DCEF)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          {String(m.marca).charAt(0).toUpperCase() + String(m.marca).slice(1)} •••• {m.ultimos4}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #6B7280)' }}>
                          Vence {String(m.exp_mes).padStart(2, '0')}/{String(m.exp_anio).slice(-2)}{m.predeterminado ? ' · Predeterminada' : ''}
                        </div>
                      </div>
                      {!m.predeterminado && (
                        <button onClick={() => marcarPredeterminada(m.id)} style={{ background: 'none', border: 'none', color: ACCENT, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', marginRight: 12 }}>Usar</button>
                      )}
                      <button onClick={() => eliminarTarjeta(m.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  ))}
                </MenuCard>

                {!mostrarFormTarjeta ? (
                  <button onClick={() => setMostrarFormTarjeta(true)} style={{ width: '100%', padding: 13, background: ACCENT, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>
                    + Agregar tarjeta
                  </button>
                ) : (
                  <div style={{ background: 'var(--card, #fff)', borderRadius: 14, border: '1.5px solid var(--border, #E2DCEF)', padding: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Número de tarjeta</label>
                      <input style={inputStyle} value={mpNumero} onChange={e => setMpNumero(e.target.value)} placeholder="4111 1111 1111 1111" />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>MM/AA</label>
                        <input style={inputStyle} value={mpExp} onChange={e => setMpExp(e.target.value)} placeholder="12/28" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>CVV</label>
                        <input type="password" style={inputStyle} value={mpCvv} onChange={e => setMpCvv(e.target.value)} placeholder="123" />
                      </div>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted, #6B7280)', marginBottom: 12 }}>
                      No almacenamos tu número completo: solo guardamos un token seguro y los últimos 4 dígitos.
                    </p>
                    <button onClick={guardarTarjetaNueva} disabled={guardandoTarjeta}
                      style={{ width: '100%', padding: 13, background: ACCENT, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 8 }}>
                      {guardandoTarjeta ? 'Guardando...' : 'Guardar tarjeta'}
                    </button>
                    <button onClick={() => setMostrarFormTarjeta(false)} style={{ width: '100%', padding: 10, background: 'transparent', border: 'none', color: 'var(--text-muted, #6B7280)', fontWeight: 700, cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Privacidad y Seguridad ── */}
      {modalPrivacidad && (
        <div onClick={() => setModalPrivacidad(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg, #fff)', width: '100%', maxWidth: '560px',
            borderTopLeftRadius: '28px', borderTopRightRadius: '28px',
            maxHeight: '90vh', overflowY: 'auto', padding: '0 24px 40px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--border, #E2DCEF)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.3px' }}>Privacidad y seguridad</h3>
              <button onClick={() => setModalPrivacidad(false)} style={{ background: 'var(--bg-secondary, #F9FAFB)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {([
                { key: 'sesiones', label: 'Sesiones' },
                { key: 'bloqueados', label: 'Bloqueados' },
                { key: 'cuenta', label: 'Cuenta' },
              ] as const).map(o => (
                <button key={o.key} onClick={() => setPrivTab(o.key)} style={{
                  flex: 1, padding: '8px 10px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                  border: `1.5px solid ${privTab === o.key ? ACCENT : 'var(--border, #E2DCEF)'}`,
                  background: privTab === o.key ? ACCENT : 'transparent',
                  color: privTab === o.key ? '#fff' : 'inherit',
                }}>
                  {o.label}
                </button>
              ))}
            </div>

            {cargandoPriv ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted, #6B7280)' }}>Cargando...</div>
            ) : privTab === 'sesiones' ? (
              <>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #6B7280)', marginBottom: 12 }}>
                  Dispositivos donde tu cuenta tiene sesión iniciada actualmente.
                </p>
                <MenuCard>
                  {sesiones.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted, #6B7280)' }}>Sin sesiones activas.</div>
                  ) : sesiones.map((s: any, i: number) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i === sesiones.length - 1 ? 'none' : '1px solid var(--border, #E2DCEF)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{s.es_actual ? 'Este dispositivo' : (s.user_agent ? String(s.user_agent).slice(0, 40) : 'Dispositivo')}</div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #6B7280)' }}>Activo: {new Date(s.last_seen_at).toLocaleString()}</div>
                      </div>
                      {s.es_actual ? (
                        <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.76rem' }}>Activa</span>
                      ) : (
                        <button onClick={() => cerrarSesionRemota(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Cerrar</button>
                      )}
                    </div>
                  ))}
                </MenuCard>
                {sesiones.some((s: any) => !s.es_actual) && (
                  <button onClick={cerrarOtrasSesiones} style={{ width: '100%', padding: 12, background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Cerrar sesión en otros dispositivos
                  </button>
                )}
              </>
            ) : privTab === 'bloqueados' ? (
              <MenuCard>
                {bloqueados.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted, #6B7280)' }}>No has bloqueado a nadie. Puedes bloquear a alguien desde el chat.</div>
                ) : bloqueados.map((b: any, i: number) => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i === bloqueados.length - 1 ? 'none' : '1px solid var(--border, #E2DCEF)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{b.nombre}</div>
                      {b.username && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #6B7280)' }}>@{b.username}</div>}
                    </div>
                    <button onClick={() => desbloquearUsuario(b.bloqueado_id)} style={{ background: 'none', border: 'none', color: ACCENT, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Desbloquear</button>
                  </div>
                ))}
              </MenuCard>
            ) : (
              <>
                <MenuCard>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Perfil público</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6B7280)' }}>Otros usuarios pueden ver tu perfil y tienda</div>
                    </div>
                    <button onClick={() => cambiarVisibilidad(!perfilPublico)}
                      style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', background: perfilPublico ? ACCENT : '#E2DCEF', position: 'relative', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: '3px', left: perfilPublico ? '24px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                  </div>
                </MenuCard>

                <SectionLabel>Zona de peligro</SectionLabel>
                <div style={{ background: 'var(--card, #fff)', borderRadius: '14px', border: '1.5px solid #ef4444', overflow: 'hidden' }}>
                  <button onClick={() => setShowEliminarCuenta(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '19px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px', color: '#ef4444', flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ef4444' }}>Eliminar mi cuenta</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #6B7280)' }}>Desactiva tu cuenta de forma permanente</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar eliminación de cuenta ── */}
      {showEliminarCuenta && (
        <div onClick={() => setShowEliminarCuenta(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg, #fff)', width: '100%', maxWidth: 420, borderRadius: 20, padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, marginBottom: 8 }}>Eliminar cuenta</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6B7280)', lineHeight: 1.5, marginBottom: 14 }}>
              Tu cuenta será desactivada de inmediato y cerrarás sesión en todos tus dispositivos. Contacta a soporte si quieres reactivarla más adelante.
            </p>
            {(user as any)?.auth_provider === 'local' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Confirma tu contraseña</label>
                <input type="password" style={inputStyle} value={passEliminar} onChange={e => setPassEliminar(e.target.value)} />
              </div>
            )}
            <button onClick={confirmarEliminarCuenta} disabled={eliminando}
              style={{ width: '100%', padding: 13, background: '#ef4444', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 10 }}>
              {eliminando ? 'Eliminando...' : 'Eliminar mi cuenta'}
            </button>
            <button onClick={() => { setShowEliminarCuenta(false); setPassEliminar(''); }} style={{ width: '100%', padding: 10, background: 'transparent', border: 'none', color: 'var(--text-muted, #6B7280)', fontWeight: 700, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Footer />

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
  info:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  card:         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
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