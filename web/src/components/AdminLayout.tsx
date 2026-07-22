import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Store, Settings, LogOut } from 'lucide-react';
import { useGlobal } from '../context/GlobalContext';
import '../admin.css';
import './AdminLayout.css';

const SIDEBAR_ITEMS = [
  { path: '/admin/dashboard', label: 'Resumen', icon: <LayoutDashboard size={20} /> },
  { path: '/admin/users', label: 'Usuarios y Roles', icon: <Users size={20} /> },
  { path: '/admin/orders', label: 'Pedidos', icon: <ShoppingCart size={20} /> },
  { path: '/admin/products', label: 'Productos', icon: <Store size={20} /> },
  { path: '/admin/settings', label: 'Configuración', icon: <Settings size={20} /> },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useGlobal();

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar" style={{ background: '#355068' }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px 28px' }}>
          <div style={{ background: '#FFFFFF', color: '#4A6D8C', width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            SV
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            GO 
            <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '30px', marginLeft: '6px' }}>
              Admin
            </span>
          </span>
        </div>
        
        <nav className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => (
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
          <button className="nav-item logout-btn" onClick={() => { logout(); navigate('/'); }} style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-search">
            {/* Search or breadcrumbs could go here */}
          </div>
          <div className="topbar-profile" onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
            <div className="avatar" style={{ background: '#4A6D8C', color: '#fff', fontWeight: '800' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="profile-info">
              <p className="name">{user?.name || 'Admin User'}</p>
              <p className="role">Master Admin</p>
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
