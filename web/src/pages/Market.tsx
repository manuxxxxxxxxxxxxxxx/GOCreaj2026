import { useState, useEffect } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
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

const PRODUCTS: Product[] = [
  {
    id: 1, name: "Pan Artesanal Integral", seller: "Panadería Don José", cat: "panaderia",
    rating: 4.8, reviews: 124, sold: 456, price: 4.05, oldPrice: 4.50, discount: "-10%",
    stock: 15, dist: "0.5 km", prep: "15-20 min",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=640",
    thumbs: ["https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=200", "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=200"],
    desc: "Pan integral elaborado con masa madre natural y fermentación lenta de 24 horas. Crujiente por fuera y esponjoso por dentro.",
    ingredients: ["Harina integral","Masa madre","Agua","Sal marina","Semillas de chía"],
    allergens: ["Gluten"], specs: { "Peso": "500g", "Fermentación": "24h", "Tipo": "Artesanal" }, lastUnits: false,
  },
  {
    id: 2, name: "Verduras Orgánicas Mix", seller: "Huerto Verde", cat: "alimentos",
    rating: 4.9, reviews: 89, sold: 312, price: 12.00, oldPrice: null, discount: null, lastUnits: false,
    stock: 23, dist: "1.2 km", prep: "5-10 min",
    img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=640",
    thumbs: ["https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200"],
    desc: "Canasta de verduras de temporada cultivadas de forma 100% orgánica sin pesticidas.",
    ingredients: ["Lechuga","Zanahoria","Tomate","Brócoli","Pimientos"],
    allergens: [], specs: { "Peso": "2 kg", "Origen": "Local", "Cultivo": "Orgánico" }
  },
  {
    id: 3, name: "Café Premium 250g", seller: "Café del Barrio", cat: "bebidas",
    rating: 4.7, reviews: 156, sold: 621, price: 8.75, oldPrice: null, discount: null, lastUnits: false,
    stock: 42, dist: "0.8 km", prep: "3-5 min",
    img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=640",
    thumbs: ["https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200"],
    desc: "Granos de café seleccionados de altura con tostado medio artesanal.",
    ingredients: ["Café 100% Arábica"], allergens: [], specs: { "Peso": "250g", "Tueste": "Medio", "Origen": "Montaña" }
  },
  {
    id: 4, name: "Artesanías Decorativas", seller: "Manos Creativas", cat: "artesanias",
    rating: 5, reviews: 67, sold: 189, price: 21.25, oldPrice: 25.00, discount: "-15%", lastUnits: true,
    stock: 8, dist: "2.0 km", prep: "N/A",
    img: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=640",
    thumbs: ["https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200"],
    desc: "Piezas únicas de barro cocido pintadas a mano por artistas locales.",
    ingredients: ["Barro","Pintura acrílica"], allergens: [], specs: { "Material": "Cerámica", "Técnica": "Pintado a mano" }
  },
  {
    id: 5, name: "Croissant de Mantequilla", seller: "Panadería Don José", cat: "panaderia",
    rating: 4.9, reviews: 201, sold: 834, price: 2.50, oldPrice: null, discount: null, lastUnits: false,
    stock: 30, dist: "0.5 km", prep: "10 min",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640",
    thumbs: ["https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200"],
    desc: "Croissant hojaldrado con mantequilla de alta calidad.",
    ingredients: ["Harina","Mantequilla","Azúcar","Sal"], allergens: ["Gluten","Lácteos"], specs: { "Peso": "120g" }
  }
];

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState('');
  
  // Slider state
  const [activeSlide, setActiveSlide] = useState(0);

  // Active thumb state for gallery
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);

  useEffect(() => {
    // Si viene desde los Reels u otra parte, abre directamente el producto
    try {
      const pid = sessionStorage.getItem('localmarket_open_product');
      if (pid) {
        const product = PRODUCTS.find(p => p.id === parseInt(pid, 10));
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
  }, []);

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

  let filtered = [...PRODUCTS];
  if (activeCategory !== 'all') filtered = filtered.filter(p => p.cat === activeCategory);
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

            {user?.role === 'seller' ? (
              <div className="quick-card highlight" onClick={() => navigate('/dashboard-vendedor')} style={{ cursor: 'pointer' }}>
                <div className="quick-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>📊</div>
                <div className="quick-card-info">
                  <h3>Mi Tienda</h3>
                  <p>Gestiona productos y reels</p>
                </div>
              </div>
            ) : user?.role === 'driver' ? (
              <div className="quick-card highlight" onClick={() => navigate('/dashboard-repartidor')} style={{ cursor: 'pointer' }}>
                <div className="quick-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>🛵</div>
                <div className="quick-card-info">
                  <h3>Panel Repartidor</h3>
                  <p>Gestiona tus entregas activas</p>
                </div>
              </div>
            ) : user?.role === 'admin' ? (
              <div className="quick-card highlight" onClick={() => navigate('/admin')} style={{ cursor: 'pointer' }}>
                <div className="quick-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}>👑</div>
                <div className="quick-card-info">
                  <h3>Panel Admin</h3>
                  <p>Administra la plataforma</p>
                </div>
              </div>
            ) : (
              <div className="quick-card highlight" onClick={() => navigate('/login?role=seller')} style={{ cursor: 'pointer' }}>
                <div className="quick-card-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>🏪</div>
                <div className="quick-card-info">
                  <h3>Vende con SVGO</h3>
                  <p>Publica productos gratis hoy</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ══ 3. PRODUCT BROWSER SECTION ══ */}
        <div className="mp-wrap" style={{ paddingTop: '10px' }}>
          
          <div className="mp-section-title-row">
            <h2>Ofertas y Productos Destacados</h2>
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
                <div className="pc-img">
                  <img src={p.img} alt={p.name} loading="lazy" />
                  {p.discount && <span className="disc-badge">{p.discount} OFF</span>}
                  {p.lastUnits && <span className="last-badge">¡Últimas unidades!</span>}
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
