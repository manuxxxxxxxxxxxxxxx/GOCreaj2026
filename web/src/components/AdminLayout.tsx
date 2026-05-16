import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Store, Settings, LogOut } from 'lucide-react';
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
  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>LocalMarket <span>Admin</span></h2>
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
          <button className="nav-item logout-btn">
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
          <div className="topbar-profile">
            <div className="avatar">A</div>
            <div className="profile-info">
              <p className="name">Admin User</p>
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
