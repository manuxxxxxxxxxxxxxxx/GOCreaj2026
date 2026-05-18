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

export default function VendedorDashboard() {
  const { toggleTheme } = useGlobal();
  const navigate = useNavigate();

  // Products State
  const [products, setProducts] = useState<Product[]>([
    { emoji: '🥖', name: 'Pan Artesanal Integral', price: 4.05, cat: 'panaderia', stock: 15, active: true },
    { emoji: '☕', name: 'Café Premium 250g', price: 8.75, cat: 'bebidas', stock: 42, active: true },
    { emoji: '🥦', name: 'Mix Verduras Orgánicas', price: 12.00, cat: 'alimentos', stock: 23, active: true }
  ]);

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
          <button className="lm-theme-toggle" onClick={toggleTheme} title="Cambiar tema"></button>
          <button className="lm-theme-toggle" onClick={() => navigate('/login')} title="Cerrar sesión" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              Comercio: <strong>Panadería Don José</strong> — Panel de Administración
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
            <div className="stat-num" style={{ color: 'var(--green)' }}>$124.80</div>
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
            <div className="stat-num">{products.length + 5}</div>
            <span className="stat-badge green">3 por entregar</span>
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
                  d="M 0 160 Q 80 120 160 140 T 320 80 T 480 60 L 480 180 L 0 180 Z" 
                  fill="url(#chartGradient)" 
                />

                {/* Main Trend Line */}
                <path 
                  d="M 0 160 Q 80 120 160 140 T 320 80 T 480 60" 
                  fill="none" 
                  stroke="var(--blue)" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                />

                {/* Custom glowing points */}
                <circle cx="160" cy="140" r="5" fill="var(--blue)" stroke="#fff" strokeWidth="2" />
                <circle cx="320" cy="80" r="5" fill="var(--blue)" stroke="#fff" strokeWidth="2" />
                <circle cx="480" cy="60" r="6" fill="var(--green)" stroke="#fff" strokeWidth="2" />
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
            <div className="dash-card-title">Pedidos Recientes</div>
            <div className="orders-list">
              <div className="dash-item-row">
                <div className="dash-item-left">
                  <span className="dash-item-emoji">🥖</span>
                  <div className="dash-item-info">
                    <h4>Alejandro Cabrera</h4>
                    <p>Hoy, 14:30 · 1x Pan Artesanal Integral</p>
                  </div>
                </div>
                <div className="dash-item-right">
                  <span className="dash-item-price">$4.05</span>
                  <span className="dash-item-status avail" style={{ fontSize: '0.65rem' }}>Entregado</span>
                </div>
              </div>
              <div className="dash-item-row">
                <div className="dash-item-left">
                  <span className="dash-item-emoji">☕</span>
                  <div className="dash-item-info">
                    <h4>María Fernanda</h4>
                    <p>Hoy, 12:10 · 2x Café Premium 250g</p>
                  </div>
                </div>
                <div className="dash-item-right">
                  <span className="dash-item-price">$17.50</span>
                  <span className="dash-item-status active" style={{ fontSize: '0.65rem' }}>Preparando</span>
                </div>
              </div>
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
