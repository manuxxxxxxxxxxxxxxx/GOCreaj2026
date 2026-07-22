import { Link, useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import '../../css/index.css';

export default function Home() {
  const { theme, toggleTheme, cartCount, user, logout } = useGlobal();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (user?.role === 'seller') return '/dashboard-vendedor';
    if (user?.role === 'driver') return '/dashboard-repartidor';
    if (user?.role === 'admin') return '/dashboard-admin';
    return '/perfil';
  };

  const getRoleLabel = () => {
    if (user?.role === 'seller') return '🏪 Panel Vendedor';
    if (user?.role === 'driver') return '🛵 Panel Repartidor';
    if (user?.role === 'admin') return '⚙️ Panel Admin';
    return `👤 ${user?.name?.split(' ')[0] || 'Mi Perfil'}`;
  };

  return (
    <div className="home-page">
      <nav>
        <Link to="/" className="nav-logo">
          <div className="logo-icon" style={{color: '#fff'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="M9 22V12h6v10M2 9l10-7 10 7"/>
            </svg>
          </div>
          LocalMarket
        </Link>

        <ul className="nav-links">
          <li><Link to="/market" className="active">Marketplace</Link></li>
          <li><Link to="/reels">Reels</Link></li>
          <li><Link to="/chat">Mensajes</Link></li>
        </ul>

        <div className="nav-right">
          <button 
            className="lm-theme-toggle" 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
          <button className="cart-btn" onClick={() => navigate('/carritoypago')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
          {user ? (
            <button className="roles-btn" onClick={() => navigate(getDashboardPath())} style={{ background: 'rgba(79,110,247,0.08)', color: 'var(--blue)', fontWeight: 700, borderRadius: 10, padding: '6px 14px' }}>
              {getRoleLabel()}
            </button>
          ) : (
            <button className="roles-btn" onClick={() => navigate('/login')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Perfil / Ingresar
            </button>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Impulsa tu Comunidad<br />Local</h1>
          <p className="hero-desc">Marketplace digital que conecta emprendedores locales con su comunidad. Compra, vende, invierte y aprende todo en un solo lugar.</p>
          <div className="hero-btns">
            <button className="btn-outline-white" onClick={() => navigate('/market')}>Explorar Productos</button>
            <button className="btn-solid-white" onClick={() => navigate('/market')}>Explorar como Comprador</button>
          </div>
        </div>
        <div className="hero-image-wrap">
          <div className="hero-img-placeholder"></div>
        </div>
      </section>

      <section className="stats">
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="stat-num">1,234</div>
          <div className="stat-label">Emprendedores Activos</div>
        </div>
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <div className="stat-num">5,678</div>
          <div className="stat-label">Productos Disponibles</div>
        </div>
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div className="stat-num">890</div>
          <div className="stat-label">Entregas Hoy</div>
        </div>
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div className="stat-num">4.8</div>
          <div className="stat-label">Calificación Promedio</div>
        </div>
      </section>

      <section className="section section-bg-light">
        <div className="centered">
          <h2 className="section-title">¿Cómo Quieres Participar?</h2>
          <p className="section-sub">Accede al panel según tu rol en la plataforma</p>
        </div>
        <div className="roles-grid">
          <div className="role-card">
            <div className="role-icon green">
              <svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
            </div>
            <div className="role-title">Soy Vendedor</div>
            <div className="role-desc">Publica productos, gestiona pedidos y aumenta tus ventas</div>
            <button className="role-btn green" onClick={() => navigate('/login?role=vendedor&tab=register')}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              70% de ganancias
            </button>
          </div>
          <div className="role-card">
            <div className="role-icon blue">
              <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div className="role-title">Soy Repartidor</div>
            <div className="role-desc">Acepta entregas, gana dinero y optimiza tus rutas</div>
            <button className="role-btn blue" onClick={() => navigate('/login?role=repartidor&tab=register')}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              20% de ganancias
            </button>
          </div>
          <div className="role-card">
            <div className="role-icon purple">
              <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="role-title">Soy Comprador</div>
            <div className="role-desc">Explora productos locales y recibe entregas rápidas</div>
            <button className="role-btn purple" onClick={() => navigate('/market')}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Ofertas exclusivas
            </button>
          </div>
        </div>
      </section>

      <section className="section section-bg-light" style={{paddingTop: 0}}>
        <div className="products-header">
          <div>
            <h2 className="section-title">Productos Destacados</h2>
            <p className="section-sub" style={{marginBottom: 0}}>Los más populares en tu zona</p>
          </div>
          <a href="#" className="see-all">Ver todos →</a>
        </div>
        <div className="products-grid">
          {[
            { img: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400', name: 'Pan Artesanal Integral', seller: 'Panadería Don José', badge: 'Promoción', badgeCls: 'badge-promo', price: '$4.50' },
            { img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400', name: 'Verduras Orgánicas Mix', seller: 'Huerto Verde', badge: 'Nuevo', badgeCls: 'badge-new', price: '$12.00' },
            { img: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400', name: 'Café Premium 250g', seller: 'Café del Barrio', badge: 'Destacado', badgeCls: 'badge-feat', price: '$8.75' },
            { img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400', name: 'Artesanías Decorativas', seller: 'Manos Creativas', badge: 'Popular', badgeCls: 'badge-pop', price: '$25.00' },
          ].map((item, i) => (
            <div className="product-card" key={i}>
              <div className="product-img">
                <img src={item.img} alt={item.name} />
                <span className={`product-badge ${item.badgeCls}`}>{item.badge}</span>
              </div>
              <div className="product-body">
                <div className="product-name">{item.name}</div>
                <div className="product-seller">{item.seller}</div>
                <div className="product-meta">
                  <span className="rating"><span className="star">★</span> 4.8</span>
                  <span className="dot"></span>
                  <span>📍 0.5 km</span>
                </div>
                <div className="product-footer">
                  <span className="product-price">{item.price}</span>
                  <button className="add-btn" onClick={() => navigate('/market')}>Agregar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section features-section">
        <div className="centered">
          <h2 className="section-title">Todo lo que Necesitas en un Solo Lugar</h2>
          <p className="section-sub">Una plataforma completa diseñada para impulsar el comercio local y la economía comunitaria</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon blue">
              <svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
            </div>
            <div className="feature-name">Marketplace Local</div>
            <div className="feature-desc">Descubre productos de emprendedores de tu zona</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon green">
              <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <div className="feature-name">Entregas en Tiempo Real</div>
            <div className="feature-desc">Seguimiento GPS con información de tráfico en vivo</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon purple">
              <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="12" r="2"/><path d="M16 8l-4 4 4 4"/></svg>
            </div>
            <div className="feature-name">Reels Promocionales</div>
            <div className="feature-desc">Videos cortos de productos y negocios locales</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon pink">
              <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div className="feature-name">Chat Integrado</div>
            <div className="feature-desc">Comunicación directa entre todos los participantes</div>
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <h2>¿Listo para Empezar?</h2>
        <p>Únete a nuestra comunidad de emprendedores y forma parte del cambio económico local</p>
        <div className="cta-btns">
          <button className="cta-btn" onClick={() => navigate('/market')}>Explorar como Comprador</button>
          {(!user || user.role === 'buyer') && (
            <button className="cta-btn" onClick={() => navigate('/login?role=seller')}>Registrarme como Vendedor</button>
          )}
          {user?.role === 'seller' && (
            <button className="cta-btn" onClick={() => navigate('/dashboard-vendedor')}>🏪 Ver mi Panel de Vendedor</button>
          )}
          {(!user || user.role === 'buyer') && (
            <button className="cta-btn" onClick={() => navigate('/login?role=driver')}>Ser Repartidor</button>
          )}
          {user?.role === 'driver' && (
            <button className="cta-btn" onClick={() => navigate('/dashboard-repartidor')}>🛵 Ver mi Panel de Repartidor</button>
          )}
          {user && (
            <button className="cta-btn" onClick={() => { logout(); }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)' }}>Cerrar Sesión</button>
          )}
        </div>
      </section>

      <footer>
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo-wrap">
              <div className="logo-icon">
                <svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
              </div>
              <span className="brand-name">LocalMarket</span>
            </div>
            <p>Impulsando la economía local a través de la tecnología</p>
          </div>
          <div className="footer-col">
            <h4>Comprador</h4>
            <ul>
              <li><a href="#">Explorar Productos</a></li>
              <li><a href="#">Reels</a></li>
              <li><a href="#">Invertir</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Vendedor</h4>
            <ul>
              <li><a href="#">Dashboard</a></li>
              <li><a href="#">Capacitación</a></li>
              <li><a href="#">Financiamiento</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Repartidor</h4>
            <ul>
              <li><a href="#">Dashboard</a></li>
              <li><a href="#">Entregas</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-copy">© 2026 LocalMarket. Todos los derechos reservados.</div>
      </footer>
    </div>
  );
}
