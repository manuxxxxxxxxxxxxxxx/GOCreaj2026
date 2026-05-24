import { useState, useEffect } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { api } from '../api';
import '../../css/market.css';
import '../../css/dark.css';

interface Product {
  id: number;
  name: string;
  seller: string;
  cat: string;
  rating: number;
  reviews: number;
  sold: number;
  price: number;
  oldPrice: number | null;
  discount: string | null;
  stock: number;
  dist: string;
  prep: string;
  img: string;
  thumbs: string[];
  desc: string;
  ingredients: string[];
  allergens: string[];
  specs: Record<string, string>;
  lastUnits?: boolean;
}

const CAROUSEL_SLIDES = [
  {
    id: 1,
    title: "¡Lo mejor está llegando!",
    subtitle: "MÁS DE 30 MILLONES DE PRODUCTOS LOCALES PARA ELEGIR.",
    desc: "Envíos express en minutos por tus repartidores locales favoritos. Seguro y garantizado.",
    badge: "SVGO Express 🛵",
    color: "linear-gradient(135deg, #355068 0%, #4A6D8C 100%)",
    textColor: "#ffffff"
  },
  {
    id: 2,
    title: "Apoya a los comercios de tu zona",
    subtitle: "PRODUCTOS 100% FRESCOS Y ARTESANALES CULTIVADOS CON AMOR.",
    desc: "Conoce a los panaderos, agricultores y artesanos que dan vida a tu comunidad.",
    badge: "Comunidad 🏪",
    color: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
    textColor: "#ffffff"
  },
  {
    id: 3,
    title: "Artesanías y regalos únicos",
    subtitle: "PIEZAS EXCLUSIVAS DECORADAS Y PINTADAS A MANO.",
    desc: "Sorprende a tus seres queridos con productos con identidad e historia local.",
    badge: "Exclusivo 🏺",
    color: "linear-gradient(135deg, #111827 0%, #1f2937 100%)",
    textColor: "#ffffff"
  }
];

export default function Market() {
  const { addToCart, user } = useGlobal();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSort, setActiveSort] = useState('default');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  // Slider state
  const [activeSlide, setActiveSlide] = useState(0);

  // Active thumb state for gallery
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);

  const mapProduct = (p: any): Product => ({
    id: p.id,
    name: p.nombre,
    seller: p.tienda_nombre || 'Tienda',
    cat: p.categoria || 'general',
    rating: 5,
    reviews: 1,
    sold: 10,
    price: parseFloat(p.precio_unitario) || 0,
    oldPrice: null,
    discount: null,
    stock: p.stock || 10,
    dist: '1.0 km',
    prep: '10 min',
    img: p.imagen_url || 'https://via.placeholder.com/640',
    thumbs: [p.imagen_url || 'https://via.placeholder.com/640'],
    desc: p.descripcion || '',
    ingredients: [],
    allergens: [],
    specs: {}
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtroMunicipio) params.set('municipio', filtroMunicipio);
    if (activeCategory !== 'all') params.set('categoria', activeCategory);
    api.get(`/productos.php?action=listar&${params.toString()}`).then(res => {
      if (res.data.ok) setProducts(res.data.productos.map(mapProduct));
    }).catch(console.error);
  }, [filtroMunicipio, activeCategory]);

  useEffect(() => {
    api.get('/productos.php?action=municipios').then(res => {
      if (res.data.ok) setMunicipios(res.data.municipios || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/interacciones.php?action=mis_likes').then(res => {
      if (res.data.ok) {
        setLikedIds(new Set((res.data.productos || []).map((p: any) => p.id as number)));
      }
    }).catch(() => {});
    api.get('/interacciones.php?action=mis_guardados').then(res => {
      if (res.data.ok) {
        setSavedIds(new Set((res.data.productos || []).map((p: any) => p.id as number)));
      }
    }).catch(() => {});
  }, [user]);

  const toggleLike = async (e: React.MouseEvent, productoId: number) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      await api.post('/interacciones.php?action=toggle_like', { producto_id: productoId });
      setLikedIds(prev => {
        const next = new Set(prev);
        next.has(productoId) ? next.delete(productoId) : next.add(productoId);
        return next;
      });
    } catch {}
  };

  const toggleSave = async (e: React.MouseEvent, productoId: number) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      await api.post('/interacciones.php?action=toggle_guardar', { producto_id: productoId });
      setSavedIds(prev => {
        const next = new Set(prev);
        next.has(productoId) ? next.delete(productoId) : next.add(productoId);
        return next;
      });
      showToast(savedIds.has(productoId) ? 'Eliminado de guardados' : 'Guardado correctamente');
    } catch {}
  };

  const compartir = async (e: React.MouseEvent, producto: Product) => {
    e.stopPropagation();
    if (user) {
      api.post('/interacciones.php?action=compartir', { producto_id: producto.id, canal: 'web' }).catch(() => {});
    }
    const shareData = { title: producto.name, text: `Mira este producto: ${producto.name}`, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Enlace copiado al portapapeles');
      }
    } catch {}
  };

  useEffect(() => {
    // Si viene desde los Reels u otra parte, abre directamente el producto
    try {
      const pid = sessionStorage.getItem('localmarket_open_product');
      if (pid && products.length > 0) {
        const product = products.find(p => p.id === parseInt(pid, 10));
        if (product) {
          setSelectedProduct(product);
          setActiveThumbIndex(0);
          setQty(1);
          window.scrollTo(0, 0);
        }
        sessionStorage.removeItem('localmarket_open_product');
      }
    } catch (e) {
      console.error('Error reading sessionStorage', e);
    }
  }, [products]);

  // Automatic transition for slides
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'alimentos', label: 'Alimentos' },
    { id: 'panaderia', label: 'Panadería' },
    { id: 'bebidas', label: 'Bebidas' },
    { id: 'artesanias', label: 'Artesanías' },
    { id: 'ropa', label: 'Ropa' },
    { id: 'hogar', label: 'Hogar' },
    { id: 'servicios', label: 'Servicios' }
  ];

  let filtered = [...products];
  if (searchQuery) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.seller.toLowerCase().includes(searchQuery.toLowerCase()));
  
  if (activeSort === 'price_asc') filtered.sort((a, b) => a.price - b.price);
  if (activeSort === 'price_desc') filtered.sort((a, b) => b.price - a.price);
  if (activeSort === 'rating_desc') filtered.sort((a, b) => b.rating - a.rating);
  if (activeSort === 'reviews_desc') filtered.sort((a, b) => b.reviews - a.reviews);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const handleBuyNow = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, qty);
    navigate('/carritoypago');
  };

  const nextSlide = () => {
    setActiveSlide(prev => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  const prevSlide = () => {
    setActiveSlide(prev => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  return (
    <>
      <Header activeTab="categories" searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      {/* ══ MARKETPLACE LIST VIEW ══ */}
      <div id="page-marketplace" style={{ display: selectedProduct ? 'none' : 'block' }}>
        
        {/* ══ 1. PROMO CAROUSEL SLIDER (MERCADO LIBRE STYLE) ══ */}
        <div className="promo-carousel-container">
          <div 
            className="carousel-inner" 
            style={{ 
              background: CAROUSEL_SLIDES[activeSlide].color,
              color: CAROUSEL_SLIDES[activeSlide].textColor 
            }}
          >
            <button className="carousel-arrow prev" onClick={prevSlide}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="20" height="20">
                <path d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <div className="carousel-slide-content">
              <span className="slide-badge">{CAROUSEL_SLIDES[activeSlide].badge}</span>
              <h1>{CAROUSEL_SLIDES[activeSlide].title}</h1>
              <h2>{CAROUSEL_SLIDES[activeSlide].subtitle}</h2>
              <p>{CAROUSEL_SLIDES[activeSlide].desc}</p>
              <button className="slide-cta" onClick={() => navigate('/reels')}>Ver Ofertas en Reels →</button>
            </div>

            <button className="carousel-arrow next" onClick={nextSlide}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="20" height="20">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </button>

            {/* Indicators */}
            <div className="carousel-indicators">
              {CAROUSEL_SLIDES.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`indicator-dot ${activeSlide === idx ? 'active' : ''}`}
                  onClick={() => setActiveSlide(idx)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ══ 2. HORIZONTAL CATEGORIES & QUICK ACTIONS GRID (MERCADO LIBRE STYLE) ══ */}
        <div className="quick-actions-container">
          <div className="quick-card-grid">
            
            <div className="quick-card" onClick={() => navigate('/perfil')}>
              <div className="quick-card-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>👤</div>
              <div className="quick-card-info">
                <h3>Mi Cuenta</h3>
                <p>Gestiona tu perfil y dirección</p>
              </div>
            </div>

            <div className="quick-card" onClick={() => { setActiveCategory('panaderia'); window.scrollTo({top: 800, behavior: 'smooth'}); }}>
              <div className="quick-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>🥖</div>
              <div className="quick-card-info">
                <h3>Panadería</h3>
                <p>Pan artesanal y repostería</p>
              </div>
            </div>

            <div className="quick-card" onClick={() => { setActiveCategory('alimentos'); window.scrollTo({top: 800, behavior: 'smooth'}); }}>
              <div className="quick-card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>🥦</div>
              <div className="quick-card-info">
                <h3>Huertos Locales</h3>
                <p>Verduras y cosechas orgánicas</p>
              </div>
            </div>

            <div className="quick-card" onClick={() => { setActiveCategory('artesanias'); window.scrollTo({top: 800, behavior: 'smooth'}); }}>
              <div className="quick-card-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>🏺</div>
              <div className="quick-card-info">
                <h3>Artesanías</h3>
                <p>Piezas decorativas manuales</p>
              </div>
            </div>

            <div className="quick-card" onClick={() => navigate('/historial')}>
              <div className="quick-card-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>🛵</div>
              <div className="quick-card-info">
                <h3>Mis Compras</h3>
                <p>Monitorea y revisa pedidos</p>
              </div>
            </div>

            <div className="quick-card highlight" onClick={() => navigate('/login')}>
              <div className="quick-card-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>🏪</div>
              <div className="quick-card-info">
                <h3>Vende con SVGO</h3>
                <p>Publica productos gratis hoy</p>
              </div>
            </div>

          </div>
        </div>

        {/* ══ 3. PRODUCT BROWSER SECTION ══ */}
        <div className="mp-wrap" style={{ paddingTop: '10px' }}>
          
          <div className="mp-section-title-row">
            <h2>Ofertas y Productos Destacados</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {municipios.length > 0 && (
                <div className="sort-select-wrapper">
                  <span className="sort-label">Municipio:</span>
                  <select className="sort-select" value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)}>
                    <option value="">Todos</option>
                    {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              <div className="sort-select-wrapper">
                <span className="sort-label">Ordenar por:</span>
                <select className="sort-select" value={activeSort} onChange={e => setActiveSort(e.target.value)}>
                  <option value="default">Relevancia</option>
                  <option value="price_asc">Precio: de menor a mayor</option>
                  <option value="price_desc">Precio: de mayor a menor</option>
                  <option value="rating_desc">Mejor calificados</option>
                  <option value="reviews_desc">Más reseñados</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mp-cats-scroller">
            {categories.map(c => (
              <button 
                key={c.id} 
                className={`cat-pill ${activeCategory === c.id ? 'active' : ''}`} 
                onClick={() => setActiveCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mp-toolbar">
            <span className="mp-count">{filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Elegant grid cards */}
          <div className="products-grid">
            {filtered.map(p => (
              <div key={p.id} className="product-card" onClick={() => { setSelectedProduct(p); setActiveThumbIndex(0); setQty(1); window.scrollTo(0,0); }}>
                <div className="pc-img" style={{ position: 'relative' }}>
                  <img src={p.img} alt={p.name} loading="lazy" />
                  {p.discount && <span className="disc-badge">{p.discount} OFF</span>}
                  {p.lastUnits && <span className="last-badge">¡Últimas unidades!</span>}
                  {/* Like + Save + Share overlay */}
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                      onClick={e => toggleLike(e, p.id)}
                      title={likedIds.has(p.id) ? 'Quitar like' : 'Dar like'}
                      style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill={likedIds.has(p.id) ? '#ef4444' : 'none'} stroke={likedIds.has(p.id) ? '#ef4444' : '#6B7280'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    </button>
                    <button
                      onClick={e => toggleSave(e, p.id)}
                      title={savedIds.has(p.id) ? 'Quitar de guardados' : 'Guardar'}
                      style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill={savedIds.has(p.id) ? '#4A6D8C' : 'none'} stroke={savedIds.has(p.id) ? '#4A6D8C' : '#6B7280'} strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                    </button>
                    <button
                      onClick={e => compartir(e, p)}
                      title="Compartir"
                      style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#6B7280" strokeWidth="2">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="pc-body">
                  <span className="pc-shipping-tag">Envío Rápido 🛵</span>
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-seller">por {p.seller}</div>

                  <div className="pc-meta">
                    <span className="star">★</span>
                    <span className="rating-val">{p.rating}</span>
                    <span className="reviews">({p.reviews} opiniones)</span>
                  </div>

                  <div className="pc-location-info">
                    📍 {p.dist} · Prep: {p.prep}
                  </div>

                  <div className="pc-footer">
                    <div className="price-wrap">
                      <span className="price-new">${p.price.toFixed(2)}</span>
                      {p.oldPrice && <span className="price-old">${p.oldPrice.toFixed(2)}</span>}
                    </div>
                    <button className="pc-add" onClick={(e) => { e.stopPropagation(); addToCart(p, 1); showToast(`¡${p.name} añadido al carrito!`); }}>
                      <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="no-products-found">
              <span className="no-prod-emoji">🔍</span>
              <h3>No se encontraron productos</h3>
              <p>Intenta ajustar tus criterios de búsqueda o seleccionar otra categoría.</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ PRODUCT DETAIL VIEW ══ */}
      {selectedProduct && (
        <div id="page-product" style={{ display: 'block' }}>
          <div className="pd-wrap">
            <a className="back-link" onClick={() => setSelectedProduct(null)} style={{ cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Volver al catálogo local
            </a>

            <div className="pd-layout">
              {/* Left Column: Gallery & Description */}
              <div className="pd-left-column">
                <div className="pd-gallery-card">
                  <div className="pd-main-img">
                    <img src={selectedProduct.thumbs[activeThumbIndex] || selectedProduct.img} alt={selectedProduct.name} />
                  </div>
                  <div className="pd-thumbs">
                    {selectedProduct.thumbs.map((t, idx) => (
                      <div 
                        key={idx} 
                        className={`pd-thumb ${activeThumbIndex === idx ? 'active' : ''}`}
                        onClick={() => setActiveThumbIndex(idx)}
                      >
                        <img src={t} alt="" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pd-desc-card">
                  <div className="pd-desc-title">Descripción del Producto</div>
                  <p className="pd-desc-text">{selectedProduct.desc}</p>

                  <div className="pd-sub-title">Ingredientes / Composición</div>
                  <div className="tag-list">
                    {selectedProduct.ingredients.map((ing, i) => (
                      <span key={i} className="tag">{ing}</span>
                    ))}
                  </div>

                  <div className="pd-sub-title">Alérgenos conocidos</div>
                  <div className="tag-list">
                    {selectedProduct.allergens.length > 0 ? (
                      selectedProduct.allergens.map((al, i) => (
                        <span key={i} className="tag allergen">{al}</span>
                      ))
                    ) : (
                      <span className="tag spec-none">Ninguno declarado</span>
                    )}
                  </div>

                  <div className="pd-sub-title" style={{ marginTop: '20px' }}>Especificaciones técnicas</div>
                  <div className="pd-specs">
                    {Object.entries(selectedProduct.specs).map(([key, val]) => (
                      <div key={key} className="spec-item">
                        <span className="spec-label">{key}</span>
                        <span className="spec-val">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Buying card panel */}
              <div className="pd-right-column">
                <div className="pd-panel">
                  <span className="pd-shipping-top-badge">Envío Rápido de Inmediato 🛵</span>
                  
                  <div className="pd-badges" style={{ marginTop: '10px' }}>
                    {selectedProduct.discount && <span className="pd-badge badge-disc">{selectedProduct.discount} OFF</span>}
                    <span className="pd-badge badge-stock">Stock: {selectedProduct.stock} unidades</span>
                  </div>
                  
                  <h1 className="pd-title">{selectedProduct.name}</h1>
                  
                  <div className="pd-store">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" style={{ color: 'var(--blue)' }}>
                      <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
                      <path d="M9 22V12h6v10M2 9l10-7 10 7"/>
                    </svg>
                    <span>Vendido por <strong style={{ color: 'var(--text)' }}>{selectedProduct.seller}</strong></span>
                  </div>

                  <div className="pd-rating">
                    <span className="stars">★ {selectedProduct.rating}</span>
                    <span>({selectedProduct.reviews} opiniones)</span>
                    <span className="sold-count">· {selectedProduct.sold} vendidos</span>
                  </div>

                  <div className="pd-location-row">
                    <span>📍 A {selectedProduct.dist} de ti</span>
                    <span>⏱️ Prep: {selectedProduct.prep}</span>
                  </div>

                  <hr className="pd-divider" />

                  <div className="pd-price-row">
                    <span className="pd-price-main">${selectedProduct.price.toFixed(2)}</span>
                    {selectedProduct.oldPrice && <span className="pd-price-old">${selectedProduct.oldPrice.toFixed(2)}</span>}
                  </div>

                  {selectedProduct.oldPrice && (
                    <div className="pd-save-badge">
                      Ahorras ${(selectedProduct.oldPrice - selectedProduct.price).toFixed(2)} comprando hoy
                    </div>
                  )}

                  <hr className="pd-divider" />

                  <div className="pd-qty-label">Cantidad a comprar:</div>
                  <div className="pd-qty-row">
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                      <span className="qty-num">{qty}</span>
                      <button className="qty-btn" onClick={() => setQty(qty + 1)}>+</button>
                    </div>
                    <span className="qty-subtotal">Subtotal: <strong>${(selectedProduct.price * qty).toFixed(2)}</strong></span>
                  </div>

                  <button className="pd-buy-btn" onClick={handleBuyNow}>
                    Comprar Ahora
                  </button>

                  <button className="pd-cart-btn-secondary" onClick={() => { addToCart(selectedProduct, qty); showToast(`¡${qty} añadido(s) al carrito!`); }}>
                    Agregar al Carrito
                  </button>

                  <div className="pd-chat-box">
                    <div className="chat-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      ¿Tienes dudas sobre el producto?
                    </div>
                    <p>Habla directamente con {selectedProduct.seller} en tiempo real.</p>
                    <a onClick={() => navigate('/chat')} style={{ cursor: 'pointer', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px', fontSize: '0.78rem' }}>Preguntar al Vendedor →</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast show">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span id="toast-msg">{toast}</span>
        </div>
      )}
    </>
  );
}
