import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, ShoppingCart, Store, GitBranch, LogOut, ArrowLeftCircle, Tag } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';
import '../admin.css';
import './AdminLayout.css';

/* "Resumen" y "Configuración" ELIMINADOS según directiva del cliente.
   Se añade "Árbol de Control" (Botón del Alma) como nodo principal. */
const SIDEBAR_ITEMS = [
  { path: '/admin/arbol',    label: 'Árbol de Control', icon: <GitBranch size={20} /> },
  { path: '/admin/users',    label: 'Usuarios y Roles', icon: <Users size={20} /> },
  { path: '/admin/orders',   label: 'Pedidos',          icon: <ShoppingCart size={20} /> },
  { path: '/admin/products', label: 'Productos',        icon: <Store size={20} /> },
  { path: '/admin/cupones',  label: 'Cupones',          icon: <Tag size={20} /> },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useGlobal();
  const u = user as any;
  const adminName  = u?.nombre || u?.name || 'Admin';
  const adminRole  = u?.rol    || u?.role || 'admin';
  const adminAvatar = (adminName).charAt(0).toUpperCase();
  const adminFoto   = u?.foto_perfil
    ? (u.foto_perfil.startsWith('http') ? u.foto_perfil : `http://localhost/GOCreaj2026/apps/mobile/backend/uploads/${u.foto_perfil}`)
    : null;

  // ── Botón "Volver a la web" ────────────────────────────────────────────────
  // Limpia el estado de navegación administrativa y vuelve al flujo común
  // sin invalidar la sesión (el token sigue en localStorage).
  const volverWeb = (): void => {
    // No tocamos lm_token_v1; sólo reseteamos URL y forzamos hash anti-caché
    navigate('/', { replace: true });
  };

  return (
    <div className="layout-container">
      <aside className="sidebar" style={{ background: 'linear-gradient(180deg, #1E3A5F 0%, #355068 100%)' }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px 28px' }}>
          <div style={{ background: '#FFFFFF', color: '#2563EB', width: '38px', height: '38px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.95rem', boxShadow: '0 6px 16px rgba(0,0,0,0.18)' }}>
            SV
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            GO
            <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', padding: '3px 10px', borderRadius: '30px', marginLeft: '8px' }}>
              Admin
            </span>
          </span>
        </div>

        <button
          onClick={volverWeb}
          className="nav-item"
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.22)',
            margin: '6px 16px 14px 16px',
            borderRadius: '14px',
            padding: '10px 14px',
            width: 'calc(100% - 32px)',
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            fontWeight: 700, fontSize: '.92rem',
            transition: 'background .18s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
        >
          <ArrowLeftCircle size={18} />
          <span>Volver a la web</span>
        </button>

        <nav className="sidebar-nav">
          {SIDEBAR_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item logout-btn"
            onClick={() => { localStorage.removeItem('lm_token_v1'); navigate('/login'); }}
            style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-search" />
          <div className="topbar-profile" onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
            <div className="avatar" style={{ background: '#2563EB', color: '#fff', fontWeight: '800', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {adminFoto
                ? <img src={adminFoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : adminAvatar
              }
            </div>
            <div className="profile-info">
              <p className="name">{adminName}</p>
              <p className="role" style={{ textTransform: 'capitalize' }}>{adminRole}</p>
            </div>
          </div>
        </header>

        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
