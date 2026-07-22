import { useState } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/index.css';
import '../../css/dashboards.css';
import '../../css/dark.css';

interface Product {
  emoji: string;
  name: string;
  price: number;
  cat: string;
  stock: number;
  active: boolean;
}

interface SellerOrder {
  id: string;
  client: string;
  items: string;
  time: string;
  total: number;
  status: 'preparando' | 'listo' | 'entregado';
  emoji: string;
}

export default function VendedorDashboard() {
  const { theme, toggleTheme, user, logout } = useGlobal();
  const navigate = useNavigate();
  const sellerName = user?.name || 'Panadería Don José';

  // Products State
  const [products, setProducts] = useState<Product[]>([
    { emoji: '🥖', name: 'Pan Artesanal Integral', price: 4.05, cat: 'panaderia', stock: 15, active: true },
    { emoji: '☕', name: 'Café Premium 250g', price: 8.75, cat: 'bebidas', stock: 42, active: true },
    { emoji: '🥦', name: 'Mix Verduras Orgánicas', price: 12.00, cat: 'alimentos', stock: 23, active: true }
  ]);

  // Orders State (Dynamic)
  const [orders, setOrders] = useState<SellerOrder[]>([
    { id: '100450', client: 'Alejandro Cabrera', items: '1x Pan Artesanal Integral', time: 'Hoy, 14:30', total: 4.05, status: 'entregado', emoji: '🥖' },
    { id: '100451', client: 'María Fernanda', items: '2x Café Premium 250g', time: 'Hoy, 12:10', total: 17.50, status: 'preparando', emoji: '☕' },
  ]);

  // Chart Tooltip Hover State
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; sales: number; x: number; y: number } | null>(null);

  // Dynamic earnings summation
  const salesToday = orders.reduce((sum, o) => sum + (o.status === 'entregado' ? o.total : 0), 103.25);

  // Chart Data config
  const chartData = [
    { day: 'Lunes', sales: 85.00, cx: 40, cy: 160 },
    { day: 'Martes', sales: 110.50, cx: 110, cy: 130 },
    { day: 'Miércoles', sales: 95.00, cx: 180, cy: 145 },
    { day: 'Jueves', sales: 130.00, cx: 250, cy: 110 },
    { day: 'Viernes', sales: 155.00, cx: 320, cy: 80 },
    { day: 'Sábado', sales: 210.00, cx: 390, cy: 45 },
    { day: 'Domingo', sales: salesToday, cx: 460, cy: 60 }
  ];

  // Modal State — Product
  const [showModal, setShowModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCat, setNewProdCat] = useState('panaderia');
  const [newProdEmoji, setNewProdEmoji] = useState('🥐');

  // Modal State — Reel
  const [showReelModal, setShowReelModal] = useState(false);
  const [reelTitle, setReelTitle] = useState('');
  const [reelDesc, setReelDesc] = useState('');
  const [reelVideoUrl, setReelVideoUrl] = useState('');
  const [reelTags, setReelTags] = useState('');
  const [reelCategory, setReelCategory] = useState('panaderia');
  const [reelDuration, setReelDuration] = useState('15');

  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleAddMockOrder = () => {
    const mockNames = ['Carlos Mendoza', 'Diana Fuentes', 'José Reyes', 'Sofía Alvarado'];
    const mockItems = [
      { name: '1x Mix Verduras Orgánicas Mix', price: 12.00, emoji: '🥦' },
      { name: '2x Croissant de Mantequilla', price: 5.00, emoji: '🥐' },
      { name: '3x Café Premium 250g', price: 26.25, emoji: '☕' },
      { name: '1x Pan Artesanal Integral', price: 4.05, emoji: '🥖' },
    ];
    
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
    const randomItem = mockItems[Math.floor(Math.random() * mockItems.length)];
    const randomId = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newOrder: SellerOrder = {
      id: randomId,
      client: randomName,
      items: randomItem.name,
      time: 'Hace un momento',
      total: randomItem.price,
      status: 'preparando',
      emoji: randomItem.emoji
    };
    
    setOrders(prev => [newOrder, ...prev]);
    triggerToast(`🔔 Nuevo pedido recibido de ${randomName} ($${randomItem.price.toFixed(2)})`);
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const handleSaveProduct = () => {
    if (!newProdName || !newProdPrice) {
      triggerToast('⚠️ Por favor completa el nombre y el precio.');
      return;
    }
    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      triggerToast('⚠️ El precio debe ser un número positivo.');
      return;
    }

    const newProd: Product = {
      emoji: newProdEmoji || '🛍️',
      name: newProdName,
      price: priceNum,
      cat: newProdCat,
      stock: 20, // default stock
      active: true
    };

    setProducts(prev => [...prev, newProd]);
    setShowModal(false);
    // Clear inputs
    setNewProdName('');
    setNewProdPrice('');
    setNewProdCat('panaderia');
    setNewProdEmoji('🥐');
    triggerToast('✅ ¡Producto agregado con éxito!');
  };

  const handleDeleteProduct = (name: string) => {
    setProducts(prev => prev.filter(p => p.name !== name));
    triggerToast('🗑️ Producto eliminado.');
  };

  const toggleProductActive = (name: string) => {
    setProducts(prev => prev.map(p => p.name === name ? { ...p, active: !p.active } : p));
    triggerToast('🔄 Estado de producto actualizado.');
  };

  const handleSaveReel = () => {
    if (!reelTitle.trim()) {
      triggerToast('⚠️ Ingresa un título para el reel.');
      return;
    }
    setShowReelModal(false);
    setReelTitle('');
    setReelDesc('');
    setReelVideoUrl('');
    setReelTags('');
    setReelCategory('panaderia');
    setReelDuration('15');
    triggerToast('🎬 ¡Reel publicado exitosamente!');
  };

  return (
    <div className="historial-main-wrapper">
      {/* ══ NAV ══ */}
      <nav>
        <a onClick={() => navigate('/')} style={{ cursor: 'pointer' }} className="nav-logo">
          <div className="logo-icon" style={{ background: '#4A6D8C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1rem', letterSpacing: '-0.5px' }}>
            SV
          </div>
          <span className="logo-text">GO</span>
        </a>
        <ul className="nav-links">
          <li><a onClick={() => navigate('/market')} style={{ cursor: 'pointer' }}>Marketplace</a></li>
          <li><a onClick={() => navigate('/reels')} style={{ cursor: 'pointer' }}>Reels</a></li>
          <li><a onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>Mensajes</a></li>
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
          <button className="lm-theme-toggle" onClick={() => { logout(); navigate('/'); }} title="Cerrar sesión" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* ══ MAIN ══ */}
      <div className="dash-page">
        {/* HEADER */}
        <div className="dash-header">
          <div className="dash-header-left">
            <h1 className="page-title">Dashboard del Vendedor</h1>
            <p className="dash-seller-name">
              Comercio: <strong>{sellerName}</strong> — Panel de Administración
            </p>
          </div>
          <div className="dash-header-actions">
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo Producto
            </button>
            <button className="btn-purple" onClick={() => setShowReelModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
              </svg>
              Crear Reel
            </button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="stat-label">Ventas Hoy</div>
            <div className="stat-num" style={{ color: 'var(--green)' }}>${salesToday.toFixed(2)}</div>
            <span className="stat-badge">+15% vs ayer</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div className="stat-label">Pedidos Recibidos</div>
            <div className="stat-num">{orders.length}</div>
            <span className="stat-badge green">{orders.filter(o => o.status !== 'entregado').length} por entregar</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div className="stat-label">Productos Activos</div>
            <div className="stat-num">{products.filter(p => p.active).length}</div>
            <span className="stat-badge">de {products.length} totales</span>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrap orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div className="stat-label">Calificación Tienda</div>
            <div className="stat-num">4.9</div>
            <span className="stat-badge orange">★ Excelente</span>
          </div>
        </div>

        {/* CHART + ORDERS */}
        <div className="dash-cols">
          {/* Visual SVG Line Chart */}
          <div className="dash-card">
            <div className="dash-card-title">Tendencia de Ventas (Semana)</div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <svg viewBox="0 0 500 200" width="100%" height="160" style={{ overflow: 'visible' }}>
                {/* Background grid lines */}
                <line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" strokeWidth="1" />
                
                {/* SVG Gradient Area */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--blue)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path 
                  d="M 40 160 L 110 130 L 180 145 L 250 110 L 320 80 L 390 45 L 460 60 L 460 180 L 40 180 Z" 
                  fill="url(#chartGradient)" 
                />

                {/* Main Trend Line */}
                <path 
                  d="M 40 160 L 110 130 L 180 145 L 250 110 L 320 80 L 390 45 L 460 60" 
                  fill="none" 
                  stroke="var(--blue)" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                />

                {/* Custom glowing points */}
                {chartData.map((d, idx) => (
                  <circle
                    key={idx}
                    cx={d.cx}
                    cy={d.cy}
                    r={hoveredPoint?.day === d.day ? "7" : "5"}
                    fill={d.day === 'Domingo' ? "var(--green)" : "var(--blue)"}
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                ))}

                {/* Invisible hover trigger circles */}
                {chartData.map((d, idx) => (
                  <circle
                    key={idx}
                    cx={d.cx}
                    cy={d.cy}
                    r="15"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPoint({ day: d.day, sales: d.sales, x: d.cx, y: d.cy })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* Pure SVG Tooltip */}
                {hoveredPoint && (
                  <g>
                    <rect
                      x={hoveredPoint.x - 55}
                      y={hoveredPoint.y - 48}
                      width="110"
                      height="36"
                      rx="8"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    <text
                      x={hoveredPoint.x}
                      y={hoveredPoint.y - 34}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="700"
                    >
                      {hoveredPoint.day}
                    </text>
                    <text
                      x={hoveredPoint.x}
                      y={hoveredPoint.y - 20}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="10"
                      fontWeight="800"
                    >
                      ${hoveredPoint.sales.toFixed(2)}
                    </text>
                  </g>
                )}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 8px', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
            </div>
          </div>

          {/* Recent Orders List */}
          <div className="dash-card">
            <div className="dash-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Pedidos Recientes</span>
              <button 
                className="btn-purple" 
                onClick={handleAddMockOrder}
                style={{ padding: '4px 10px', fontSize: '0.72rem', boxShadow: 'none' }}
              >
                + Pedido Demo
              </button>
            </div>
            <div className="orders-list" style={{ gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
              {orders.map((o) => (
                <div key={o.id} className="dash-item-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="dash-item-left">
                      <span className="dash-item-emoji">{o.emoji}</span>
                      <div className="dash-item-info">
                        <h4>{o.client}</h4>
                        <p>{o.time} · {o.items}</p>
                      </div>
                    </div>
                    <div className="dash-item-right" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                      <span className="dash-item-price">${o.total.toFixed(2)}</span>
                      <span className={`dash-item-status ${o.status === 'entregado' ? 'avail' : o.status === 'preparando' ? 'active' : 'orange-status'}`} style={{ fontSize: '0.65rem' }}>
                        {o.status === 'entregado' ? 'Entregado' : o.status === 'preparando' ? 'Preparando' : 'Listo p/ Enviar'}
                      </span>
                    </div>
                  </div>
                  {o.status === 'preparando' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          setOrders(prev => prev.map(order => order.id === o.id ? { ...order, status: 'listo' } : order));
                          triggerToast('📦 ¡Pedido listo para que el repartidor lo retire!');
                        }}
                        style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'var(--blue)' }}
                      >
                        Marcar Listo para Enviar
                      </button>
                    </div>
                  )}
                  {o.status === 'listo' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          setOrders(prev => prev.map(order => order.id === o.id ? { ...order, status: 'entregado' } : order));
                          triggerToast('✅ Pedido entregado al repartidor/cliente.');
                        }}
                        style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'var(--green)' }}
                      >
                        Marcar como Entregado
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GESTIÓN DE PRODUCTOS */}
        <div className="section-header">
          <div className="section-title">Gestión de Catálogo de Productos</div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Agregar Producto
          </button>
        </div>
        
        <div className="products-table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>Emoji</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontSize: '1.6rem' }}>{p.emoji}</td>
                  <td style={{ fontWeight: '700' }}>{p.name}</td>
                  <td style={{ fontWeight: '800', color: 'var(--text)' }}>${p.price.toFixed(2)}</td>
                  <td style={{ textTransform: 'capitalize', fontWeight: '600', color: 'var(--text-muted)' }}>{p.cat}</td>
                  <td style={{ fontWeight: '700' }}>{p.stock} unid</td>
                  <td>
                    <button 
                      onClick={() => toggleProductActive(p.name)}
                      className={`badge ${p.active ? 'badge-success' : 'badge-danger'}`} 
                      style={{ padding: '6px 12px', borderRadius: '30px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', background: p.active ? 'var(--green-light)' : '#ffebee', color: p.active ? '#1b8543' : '#c62828', display: 'inline-flex', gap: '4px', alignItems: 'center' }}
                    >
                      {p.active ? '● Activo' : '○ Inactivo'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-icon" 
                        title="Eliminar" 
                        onClick={() => handleDeleteProduct(p.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ══ MAPA DE COBERTURA Y PEDIDOS ACTIVOS ══ */}
        <div className="section-header" style={{ marginTop: '8px' }}>
          <div className="section-title">🗺️ Cobertura y Pedidos en Tiempo Real</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Vista general de tu zona de entrega
          </span>
        </div>

        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: 'var(--card-shadow)',
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
        }}>
          {/* SVG Map Mockup */}
          <div style={{ position: 'relative', minHeight: '360px', background: '#e8f0e8' }}>
            <svg width="100%" height="360" viewBox="0 0 700 360" preserveAspectRatio="xMidYMid slice">
              {/* Base map tiles */}
              <rect width="700" height="360" fill="#e8f0e8"/>
              {/* Streets grid */}
              <g stroke="#c5d5c5" strokeWidth="12" fill="none" opacity="0.9">
                <line x1="0" y1="90"  x2="700" y2="90"/>
                <line x1="0" y1="180" x2="700" y2="180"/>
                <line x1="0" y1="270" x2="700" y2="270"/>
                <line x1="140" y1="0" x2="140" y2="360"/>
                <line x1="280" y1="0" x2="280" y2="360"/>
                <line x1="420" y1="0" x2="420" y2="360"/>
                <line x1="560" y1="0" x2="560" y2="360"/>
              </g>
              {/* Secondary roads */}
              <g stroke="#d4e4d4" strokeWidth="5" fill="none" opacity="0.8">
                <line x1="0" y1="45"  x2="700" y2="45"/>
                <line x1="0" y1="135" x2="700" y2="135"/>
                <line x1="0" y1="225" x2="700" y2="225"/>
                <line x1="0" y1="315" x2="700" y2="315"/>
                <line x1="70" y1="0" x2="70" y2="360"/>
                <line x1="210" y1="0" x2="210" y2="360"/>
                <line x1="350" y1="0" x2="350" y2="360"/>
                <line x1="490" y1="0" x2="490" y2="360"/>
                <line x1="630" y1="0" x2="630" y2="360"/>
              </g>
              {/* Block fill colors */}
              <rect x="142" y="92" width="136" height="86" fill="#dce9dc" rx="4"/>
              <rect x="282" y="92" width="136" height="86" fill="#e2eee2" rx="4"/>
              <rect x="142" y="182" width="136" height="86" fill="#e2eee2" rx="4"/>
              <rect x="282" y="182" width="136" height="86" fill="#dce9dc" rx="4"/>
              <rect x="422" y="92" width="136" height="86" fill="#dce9dc" rx="4"/>
              <rect x="422" y="182" width="136" height="86" fill="#e5f0e5" rx="4"/>
              <rect x="2" y="2" width="136" height="86" fill="#e5f0e5" rx="4"/>
              <rect x="2" y="92" width="136" height="86" fill="#dce9dc" rx="4"/>

              {/* Delivery zone radius overlay */}
              <circle cx="350" cy="180" r="160" fill="rgba(74,109,140,0.08)" stroke="rgba(74,109,140,0.25)" strokeWidth="2" strokeDasharray="8 4"/>

              {/* Store marker (center) */}
              <g transform="translate(330,160)">
                <circle cx="20" cy="20" r="22" fill="white" opacity="0.95" style={{filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.18))'}}/>
                <circle cx="20" cy="20" r="16" fill="#4A6D8C"/>
                <text x="20" y="26" textAnchor="middle" fill="white" fontSize="16">🏪</text>
                <circle cx="20" cy="20" r="22" fill="none" stroke="#4A6D8C" strokeWidth="3" opacity="0.5">
                  <animate attributeName="r" from="22" to="36" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
                </circle>
              </g>
              <text x="350" y="215" textAnchor="middle" fill="#4A6D8C" fontSize="11" fontWeight="700">Tu tienda</text>

              {/* Active delivery markers */}
              <g transform="translate(178,100)">
                <circle cx="14" cy="14" r="16" fill="white" opacity="0.92" style={{filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.15))'}}/>
                <circle cx="14" cy="14" r="12" fill="#e67e22"/>
                <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13">🛵</text>
              </g>
              <text x="192" y="133" textAnchor="middle" fill="#e67e22" fontSize="10" fontWeight="700">#100451</text>

              <g transform="translate(450,220)">
                <circle cx="14" cy="14" r="16" fill="white" opacity="0.92" style={{filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.15))'}}/>
                <circle cx="14" cy="14" r="12" fill="#2ecc71"/>
                <text x="14" y="19" textAnchor="middle" fill="white" fontSize="13">🛵</text>
              </g>
              <text x="464" y="253" textAnchor="middle" fill="#2ecc71" fontSize="10" fontWeight="700">#100453</text>

              {/* Destination pins */}
              <g transform="translate(100,60)">
                <ellipse cx="12" cy="26" rx="5" ry="2" fill="rgba(0,0,0,0.15)"/>
                <path d="M12 0 C6 0 0 6 0 12 C0 20 12 28 12 28 C12 28 24 20 24 12 C24 6 18 0 12 0Z" fill="#e74c3c"/>
                <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
              </g>

              <g transform="translate(500,130)">
                <ellipse cx="12" cy="26" rx="5" ry="2" fill="rgba(0,0,0,0.15)"/>
                <path d="M12 0 C6 0 0 6 0 12 C0 20 12 28 12 28 C12 28 24 20 24 12 C24 6 18 0 12 0Z" fill="#e74c3c"/>
                <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
              </g>

              {/* Route lines */}
              <path d="M192 114 Q 150 140 112 73" stroke="#e67e22" strokeWidth="2.5" fill="none" strokeDasharray="6 4" opacity="0.7"/>
              <path d="M464 234 Q 520 200 512 143" stroke="#2ecc71" strokeWidth="2.5" fill="none" strokeDasharray="6 4" opacity="0.7"/>

              {/* Compass rose */}
              <g transform="translate(650,20)">
                <circle cx="18" cy="18" r="18" fill="white" opacity="0.85"/>
                <text x="18" y="14" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="700">N</text>
                <path d="M18 16 L22 26 L18 24 L14 26 Z" fill="#e74c3c"/>
                <path d="M18 20 L22 26 L18 28 L14 26 Z" fill="#334155"/>
              </g>

              {/* Scale bar */}
              <g transform="translate(20,330)">
                <rect x="0" y="8" width="60" height="4" fill="#4A6D8C" opacity="0.5" rx="2"/>
                <text x="0" y="6" fill="#4A6D8C" fontSize="9" fontWeight="600">0</text>
                <text x="55" y="6" fill="#4A6D8C" fontSize="9" fontWeight="600">500m</text>
              </g>

              {/* Watermark */}
              <text x="350" y="350" textAnchor="middle" fill="#6b7280" fontSize="9" opacity="0.6">Vista de mapa — SVGO LocalMarket</text>
            </svg>

            {/* Map controls overlay */}
            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['+','−','⌖'].map((btn, i) => (
                <button key={i} style={{
                  width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0',
                  background: 'white', fontWeight: 700, fontSize: i < 2 ? '1.2rem' : '1rem',
                  cursor: 'pointer', display: 'grid', placeItems: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#334155',
                  transition: 'background 0.15s'
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                >{btn}</button>
              ))}
            </div>
          </div>

          {/* Right legend panel */}
          <div style={{ padding: '24px 20px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                Pedidos Activos
              </div>
              {[
                { id: '100451', dest: 'Av. Masferrer #102', status: 'En camino', color: '#e67e22', bg: '#fff7ed' },
                { id: '100453', dest: 'Escalón #45', status: 'En tienda', color: '#2ecc71', bg: '#e8fcf0' },
              ].map(p => (
                <div key={p.id} style={{
                  padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)',
                  marginBottom: 8, background: 'var(--bg)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--blue)' }}>#{p.id}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: p.bg, color: p.color }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {p.dest}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                Leyenda
              </div>
              {[
                { color: '#4A6D8C', label: 'Tu tienda', icon: '🏪' },
                { color: '#e67e22', label: 'Repartidor en camino', icon: '🛵' },
                { color: '#2ecc71', label: 'Repartidor en tienda', icon: '🛵' },
                { color: '#e74c3c', label: 'Destino de entrega', icon: '📍' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: item.color, display: 'grid', placeItems: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 'auto' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center' }}>
                🔵 Radio de cobertura: ~1.5 km<br/>
                <span style={{ color: 'var(--blue)', fontWeight: 700 }}>2 repartidores</span> activos en tu zona
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CREAR REEL */}
      {showReelModal && (
        <div className="modal-overlay show">
          <div className="modal-box" style={{ maxWidth: '540px' }}>
            <div className="modal-head" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', borderBottom: 'none', padding: '28px 32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', display: 'grid', placeItems: 'center', backdropFilter: 'blur(4px)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10"/>
                      <polygon points="10 8 16 12 10 16 10 8" fill="white"/>
                    </svg>
                  </div>
                  <h2 style={{ color: 'white', fontSize: '1.3rem', fontWeight: '800' }}>Crear Nuevo Reel</h2>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.83rem', marginLeft: '46px' }}>Muestra tu producto con un video corto y atractivo</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowReelModal(false)} style={{ color: 'rgba(255,255,255,0.8)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="modal-body" style={{ gap: '18px', padding: '28px 32px' }}>

              {/* Video upload area */}
              <div style={{ border: '2px dashed #c4b5fd', borderRadius: '16px', padding: '28px', textAlign: 'center', background: '#faf5ff', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#a855f7')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#c4b5fd')}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎬</div>
                <p style={{ fontWeight: '700', color: '#7c3aed', fontSize: '0.9rem' }}>Subir video o URL</p>
                <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '4px' }}>MP4, MOV · Máx 60 seg · O pega un enlace abajo</p>
              </div>

              {/* Video URL field */}
              <div className="modal-field">
                <label htmlFor="reel-url" style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>URL del video (YouTube, TikTok, etc.)</label>
                <div style={{ position: 'relative' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" width="16" height="16"
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  <input className="modal-input" type="url" id="reel-url" placeholder="https://..." value={reelVideoUrl}
                    onChange={e => setReelVideoUrl(e.target.value)}
                    style={{ paddingLeft: '40px', background: '#f9fafb', color: '#111827' }}
                  />
                </div>
              </div>

              {/* Title */}
              <div className="modal-field">
                <label htmlFor="reel-title" style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Título del reel *</label>
                <input className="modal-input" type="text" id="reel-title" placeholder="Ej: Pan recién horneado esta mañana 🥖" value={reelTitle}
                  onChange={e => setReelTitle(e.target.value)}
                  style={{ background: '#f9fafb', color: '#111827' }}
                />
              </div>

              {/* Description */}
              <div className="modal-field">
                <label htmlFor="reel-desc" style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Descripción</label>
                <textarea id="reel-desc" placeholder="Describe tu producto, ingredientes, promociones..." value={reelDesc}
                  onChange={e => setReelDesc(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--border)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none', resize: 'vertical', background: '#f9fafb', color: '#111827' }}
                  onFocus={e => e.target.style.borderColor = '#a855f7'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* Category + Duration row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="modal-field">
                  <label style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Categoría</label>
                  <select className="modal-input" value={reelCategory} onChange={e => setReelCategory(e.target.value)} style={{ background: '#f9fafb', color: '#111827' }}>
                    <option value="panaderia">🥖 Panadería</option>
                    <option value="bebidas">☕ Bebidas</option>
                    <option value="alimentos">🥦 Alimentos</option>
                    <option value="artesanias">🏺 Artesanías</option>
                    <option value="otro">🛍️ Otro</option>
                  </select>
                </div>
                <div className="modal-field">
                  <label style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Duración máx.</label>
                  <select className="modal-input" value={reelDuration} onChange={e => setReelDuration(e.target.value)} style={{ background: '#f9fafb', color: '#111827' }}>
                    <option value="15">15 segundos</option>
                    <option value="30">30 segundos</option>
                    <option value="60">60 segundos</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div className="modal-field">
                <label htmlFor="reel-tags" style={{ color: '#6b7280', fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Etiquetas</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#a855f7', fontWeight: '700', fontSize: '0.9rem' }}>#</span>
                  <input className="modal-input" type="text" id="reel-tags" placeholder="panaderia, frescos, artesanal" value={reelTags}
                    onChange={e => setReelTags(e.target.value)}
                    style={{ paddingLeft: '30px', background: '#f9fafb', color: '#111827' }}
                  />
                </div>
                <span style={{ fontSize: '0.73rem', color: '#9ca3af' }}>Separa las etiquetas con comas</span>
              </div>

            </div>

            <div className="modal-foot" style={{ padding: '20px 32px', gap: '12px', background: 'rgba(250,245,255,0.85)' }}>
              <button className="btn-cancel" onClick={() => setShowReelModal(false)}>Cancelar</button>
              <button onClick={handleSaveReel}
                style={{ padding: '11px 24px', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(168,85,247,0.35)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(168,85,247,0.45)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(168,85,247,0.35)'; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
                </svg>
                Publicar Reel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PRODUCTO */}
      {showModal && (
        <div className="modal-overlay show">
          <div className="modal-box">
            <div className="modal-head">
              <h2>Agregar Nuevo Producto</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label htmlFor="modal-nombre">Nombre del producto</label>
                <input className="modal-input" type="text" id="modal-nombre" placeholder="Ej: Pan de Coco Especial" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} />
              </div>
              <div className="modal-field">
                <label htmlFor="modal-precio">Precio ($)</label>
                <input className="modal-input" type="number" id="modal-precio" placeholder="0.00" step="0.01" min="0" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} />
              </div>
              <div className="modal-field">
                <label htmlFor="modal-categoria">Categoría</label>
                <select className="modal-input" id="modal-categoria" value={newProdCat} onChange={(e) => setNewProdCat(e.target.value)}>
                  <option value="panaderia">Panadería</option>
                  <option value="alimentos">Alimentos</option>
                  <option value="bebidas">Bebidas</option>
                  <option value="artesanias">Artesanías</option>
                </select>
              </div>
              <div className="modal-field">
                <label htmlFor="modal-emoji">Emoji del producto</label>
                <input className="modal-input" type="text" id="modal-emoji" placeholder="🥐" maxLength={4} value={newProdEmoji} onChange={(e) => setNewProdEmoji(e.target.value)} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-save" onClick={handleSaveProduct}>Guardar Producto</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`lm-toast ${showToast ? 'show' : ''}`} style={{ background: '#111111', color: '#fff', borderRadius: '16px', display: 'flex', gap: '12px', padding: '14px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{toastMsg}</span>
      </div>
    </div>
  );
}
