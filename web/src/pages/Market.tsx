import React, { useState, useEffect } from 'react';
import { useGlobal } from "../context/GlobalContext";
import { useNavigate } from 'react-router-dom';
import '../../css/market.css';
import '../../css/dark.css';

const products = [
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

export default function Market() {
  const { toggleTheme, cartCount, addToCart } = useGlobal();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSort, setActiveSort] = useState('default');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [toast, setToast] = useState('');

  useEffect(() => {
    // Si viene desde los Reels u otra parte, abre directamente el producto
    try {
      const pid = sessionStorage.getItem('localmarket_open_product');
      if (pid) {
        const product = products.find(p => p.id === parseInt(pid, 10));
        if (product) {
          setSelectedProduct(product);
          setQty(1);
          window.scrollTo(0, 0);
        }
        sessionStorage.removeItem('localmarket_open_product');
      }
    } catch (e) {
      console.error('Error reading sessionStorage', e);
    }
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
    addToCart(selectedProduct, qty);
    navigate('/carritoypago');
  };

  return (
    <>
      <nav>
        <a onClick={() => navigate('/')} className="nav-logo" style={{cursor:'pointer'}}>
          <div className="logo-icon" style={{color: '#fff'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="M9 22V12h6v10M2 9l10-7 10 7"/>
            </svg>
          </div>
          LocalMarket
        </a>
        <ul className="nav-links">
          <li><a onClick={() => navigate('/market')} className="active" style={{cursor:'pointer'}}>Marketplace</a></li>
          <li><a onClick={() => navigate('/reels')} style={{cursor:'pointer'}}>Reels</a></li>
          <li><a onClick={() => navigate('/chat')} style={{cursor:'pointer'}}>Mensajes</a></li>
        </ul>
        <div className="nav-right">
          <button className="lm-theme-toggle" onClick={toggleTheme} title="Cambiar tema"></button>
          <button className="cart-btn" onClick={() => navigate('/carritoypago')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </nav>

      <div id="page-marketplace" style={{ display: selectedProduct ? 'none' : 'block' }}>
        <div className="mp-wrap">
          <div className="mp-header">
            <h1>Marketplace Local</h1>
            <p>Descubre productos y servicios de emprendedores en tu zona</p>
          </div>

          <div className="mp-search-row">
            <div className="search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input type="text" placeholder="Buscar productos, tiendas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <select className="sort-select" value={activeSort} onChange={e => setActiveSort(e.target.value)} style={{marginLeft: 10, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)'}}>
              <option value="default">Relevancia</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
              <option value="rating_desc">Mejor valorado</option>
              <option value="reviews_desc">Más reseñas</option>
            </select>
          </div>

          <div className="mp-cats">
            {categories.map(c => (
              <button key={c.id} className={`cat-pill ${activeCategory === c.id ? 'active' : ''}`} onClick={() => setActiveCategory(c.id)}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="mp-toolbar">
            <span className="mp-count">{filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="products-grid">
            {filtered.map(p => (
              <div key={p.id} className="product-card" onClick={() => { setSelectedProduct(p); setQty(1); window.scrollTo(0,0); }}>
                <div className="pc-img">
                  <img src={p.img} alt={p.name} loading="lazy" />
                  {p.discount && <span className="disc-badge">{p.discount}</span>}
                  {p.lastUnits && <span className="last-badge">¡Últimas unidades!</span>}
                </div>
                <div className="pc-body">
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-seller">{p.seller}</div>
                  <div className="pc-meta">
                    <span className="star">★</span>
                    <span>{p.rating}</span>
                    <span className="reviews">({p.reviews})</span>
                    <span className="dot"></span>
                    <span>📍 {p.dist}</span>
                  </div>
                  <div className="pc-footer">
                    <div className="price-wrap">
                      <span className="price-new">${p.price.toFixed(2)}</span>
                      {p.oldPrice && <span className="price-old">${p.oldPrice.toFixed(2)}</span>}
                    </div>
                    <button className="pc-add" onClick={(e) => { e.stopPropagation(); addToCart(p, 1); showToast(`¡${p.name} añadido al carrito!`); }}>
                      <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedProduct && (
        <div id="page-product">
          <div className="pd-wrap">
            <a className="back-link" onClick={() => setSelectedProduct(null)} style={{cursor:'pointer'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Volver al Marketplace
            </a>

            <div className="pd-layout">
              <div className="pd-gallery">
                <div className="pd-main-img">
                  <img src={selectedProduct.img} alt="" />
                </div>
                <div className="pd-thumbs">
                  {selectedProduct.thumbs?.map((t: string, i: number) => (
                    <img key={i} src={t} alt="" onClick={() => {}} />
                  ))}
                </div>
              </div>

              <div>
                <div className="pd-panel">
                  <div className="pd-badges">
                    {selectedProduct.discount && <span className="pd-badge badge-disc">{selectedProduct.discount} OFF</span>}
                    <span className="pd-badge badge-stock">Stock: {selectedProduct.stock} disponibles</span>
                  </div>
                  <h1 className="pd-title">{selectedProduct.name}</h1>
                  <div className="pd-store">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
                    <span>{selectedProduct.seller}</span>
                  </div>
                  <div className="pd-rating">
                    <span className="stars">★ {selectedProduct.rating}</span>
                    <span>({selectedProduct.reviews} reseñas)</span>
                    <span>·</span>
                    <span className="sold">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                      {selectedProduct.sold} vendidos
                    </span>
                  </div>
                  <div className="pd-location-row">
                    <span>📍 {selectedProduct.dist}</span>
                    <span>·</span>
                    <span>⏱️ Prep: {selectedProduct.prep}</span>
                  </div>

                  <hr className="pd-divider" />

                  <div className="pd-price-row">
                    <span className="pd-price-main">${selectedProduct.price.toFixed(2)}</span>
                    {selectedProduct.oldPrice && <span className="pd-price-old">${selectedProduct.oldPrice.toFixed(2)}</span>}
                    {selectedProduct.oldPrice && <span className="pd-save">Ahorras ${(selectedProduct.oldPrice - selectedProduct.price).toFixed(2)}</span>}
                  </div>

                  <hr className="pd-divider" />

                  <div className="pd-qty-label">Cantidad</div>
                  <div className="pd-qty-row">
                    <div className="qty-ctrl">
                      <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                      <span className="qty-num">{qty}</span>
                      <button className="qty-btn" onClick={() => setQty(qty + 1)}>+</button>
                    </div>
                    <span className="qty-subtotal">Subtotal: <strong>${(selectedProduct.price * qty).toFixed(2)}</strong></span>
                  </div>

                  <button className="pd-buy-btn" onClick={handleBuyNow}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Comprar Ahora
                  </button>
                  <div className="pd-sec-row">
                    <button className="pd-sec-btn" onClick={() => { addToCart(selectedProduct, qty); showToast(`¡${qty} añadido(s) al carrito!`); }}>
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                       Agregar al Carrito
                    </button>
                    <button className="pd-sec-btn">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      Favorito
                    </button>
                  </div>
                  
                  <div className="pd-chat-box">
                    <div className="chat-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      ¿Tienes dudas?
                    </div>
                    <p>Chatea con el vendedor antes de comprar</p>
                    <a onClick={() => navigate('/chat')} style={{cursor:'pointer'}}>Iniciar Chat →</a>
                  </div>
                </div>

                <div className="pd-desc-card">
                  <div className="pd-desc-title">Descripción</div>
                  <p className="pd-desc-text">{selectedProduct.desc}</p>

                  <div className="pd-sub-title">Ingredientes</div>
                  <div className="tag-list">
                    {selectedProduct.ingredients?.map((ing: string, i: number) => (
                      <span key={i} className="tag">{ing}</span>
                    ))}
                  </div>

                  <div className="pd-sub-title">Alérgenos</div>
                  <div className="tag-list">
                    {selectedProduct.allergens?.map((al: string, i: number) => (
                      <span key={i} className="tag danger">{al}</span>
                    )) || <span className="tag">Ninguno</span>}
                  </div>

                  <div className="pd-sub-title">Especificaciones</div>
                  <div className="pd-specs">
                    {Object.entries(selectedProduct.specs || {}).map(([key, val]: [string, any]) => (
                      <div key={key} className="spec-row">
                        <span className="spec-label">{key}</span>
                        <span className="spec-val">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast show">
          <span id="toast-msg">{toast}</span>
        </div>
      )}
    </>
  );
}
