/* ══════════════════════════
   DATA
══════════════════════════ */
const products = [
  {
    id: 1,
    name: "Pan Artesanal Integral",
    seller: "Panadería Don José",
    cat: "panaderia",
    rating: 4.8, reviews: 124, sold: 456,
    price: 4.05, oldPrice: 4.50,
    discount: "-10%",
    stock: 15, dist: "0.5 km de tu ubicación", prep: "Prep: 15-20 min",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=640",
    thumbs: [
      "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=200",
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=200",
      "https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=200",
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200",
    ],
    desc: "Pan integral elaborado con masa madre natural, sin conservantes ni aditivos. Horneado diariamente con harina 100% integral y semillas seleccionadas.",
    ingredients: ["Harina integral","Masa madre","Semillas de girasol","Semillas de sésamo","Sal marina","Agua"],
    allergens: ["Gluten"],
    specs: { "Peso": "500g", "Tiempo de Preparación": "15-20 min" },
    lastUnits: false,
  },
  {
    id: 2,
    name: "Verduras Orgánicas Mix",
    seller: "Huerto Verde",
    cat: "alimentos",
    rating: 4.9, reviews: 89, sold: 312,
    price: 12.00, oldPrice: null,
    discount: null, lastUnits: false,
    stock: 23, dist: "1.2 km de tu ubicación", prep: "Prep: 5-10 min",
    img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=640",
    thumbs: [
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200",
      "https://images.unsplash.com/photo-1518843875459-f738682238a6?w=200",
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=200",
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200",
    ],
    desc: "Mix de verduras orgánicas frescas cosechadas diariamente. Incluye espinacas, zanahorias, brócoli y más según temporada.",
    ingredients: ["Espinaca","Zanahoria","Brócoli","Apio","Pepino"],
    allergens: [],
    specs: { "Peso": "1 kg", "Tiempo de Preparación": "5-10 min" },
  },
  {
    id: 3,
    name: "Café Premium 250g",
    seller: "Café del Barrio",
    cat: "bebidas",
    rating: 4.7, reviews: 156, sold: 621,
    price: 8.75, oldPrice: null,
    discount: null, lastUnits: false,
    stock: 42, dist: "0.8 km de tu ubicación", prep: "Prep: 3-5 min",
    img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=640",
    thumbs: [
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200",
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200",
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200",
    ],
    desc: "Café de especialidad de origen único, tostado artesanalmente. Notas de chocolate, caramelo y frutas rojas.",
    ingredients: ["Café 100% arábica","Origen: Antigua Guatemala"],
    allergens: [],
    specs: { "Peso": "250g", "Tiempo de Preparación": "3-5 min" },
  },
  {
    id: 4,
    name: "Artesanías Decorativas",
    seller: "Manos Creativas",
    cat: "artesanias",
    rating: 5, reviews: 67, sold: 189,
    price: 21.25, oldPrice: 25.00,
    discount: "-15%", lastUnits: true,
    stock: 8, dist: "2.0 km de tu ubicación", prep: "Prep: N/A",
    img: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=640",
    thumbs: [
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200",
      "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=200",
      "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=200",
    ],
    desc: "Artesanías decorativas hechas a mano por artesanos locales. Cada pieza es única y elaborada con materiales naturales.",
    ingredients: ["Barro natural","Pigmentos naturales","Barniz ecológico"],
    allergens: [],
    specs: { "Peso": "~300g c/u", "Tiempo de Preparación": "Entrega inmediata" },
  },
  {
    id: 5,
    name: "Croissant de Mantequilla",
    seller: "Panadería Don José",
    cat: "panaderia",
    rating: 4.9, reviews: 201, sold: 834,
    price: 2.50, oldPrice: null,
    discount: null, lastUnits: false,
    stock: 30, dist: "0.5 km de tu ubicación", prep: "Prep: 10 min",
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640",
    thumbs: [
      "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200",
      "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=200",
      "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=200",
      "https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=200",
    ],
    desc: "Croissant hojaldrado de mantequilla pura, horneado todas las mañanas. Crocante por fuera, suave por dentro.",
    ingredients: ["Harina","Mantequilla","Huevo","Leche","Azúcar","Sal"],
    allergens: ["Gluten","Lácteos","Huevo"],
    specs: { "Peso": "120g", "Tiempo de Preparación": "10 min" },
  },
  {
    id: 6,
    name: "Frutas Tropicales",
    seller: "Finca El Paraíso",
    cat: "alimentos",
    rating: 4.6, reviews: 43, sold: 127,
    price: 6.50, oldPrice: null,
    discount: null, lastUnits: false,
    stock: 18, dist: "3.0 km de tu ubicación", prep: "Prep: 5 min",
    img: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=640",
    thumbs: [
      "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=200",
      "https://images.unsplash.com/photo-1560316560-5f8a294b7dbe?w=200",
      "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=200",
      "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=200",
    ],
    desc: "Selección de frutas tropicales frescas: mango, piña, papaya y más. Recogidas en el punto exacto de madurez.",
    ingredients: ["Mango","Piña","Papaya","Maracuyá"],
    allergens: [],
    specs: { "Peso": "1.5 kg", "Tiempo de Preparación": "5 min" },
  },
];

/* ── Shorthand seguro para escapes XSS ── */
const esc = typeof lmEscapeHtml === 'function' ? lmEscapeHtml : s =>
  String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ══════════════════════════
   STATE
══════════════════════════ */
let currentQty = 1;
let currentProduct = null;
let activeCategory = 'all';
let activeSortFn = null;

/* ══════════════════════════
   RENDER MARKETPLACE
══════════════════════════ */
function renderGrid(list) {
  const grid = document.getElementById('products-grid');
  document.getElementById('product-count').textContent = `${list.length} producto${list.length !== 1 ? 's' : ''} encontrado${list.length !== 1 ? 's' : ''}`;
  grid.innerHTML = list.map(p => `
    <div class="product-card" onclick="openProduct(${Number(p.id)})">
      <div class="pc-img">
        <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">
        ${p.discount ? `<span class="disc-badge">${esc(p.discount)}</span>` : ''}
        ${p.lastUnits ? `<span class="last-badge">¡Últimas unidades!</span>` : ''}
      </div>
      <div class="pc-body">
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-seller">${esc(p.seller)}</div>
        <div class="pc-meta">
          <span class="star">★</span>
          <span>${esc(p.rating)}</span>
          <span class="reviews">(${esc(p.reviews)})</span>
          <span class="dot"></span>
          <span>📍 ${esc(String(p.dist).replace(' de tu ubicación',''))}</span>
        </div>
        <div class="pc-footer">
          <div class="price-wrap">
            <span class="price-new">$${Number(p.price).toFixed(2)}</span>
            ${p.oldPrice ? `<span class="price-old">$${Number(p.oldPrice).toFixed(2)}</span>` : ''}
          </div>
          <button class="pc-add" onclick="quickAdd(event,${Number(p.id)})">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </button>
        </div>
        <div class="pc-stock">Stock: ${Number(p.stock)} unidades</div>
      </div>
    </div>
  `).join('');
}

function filterCat(btn, cat) {
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeCategory = cat;
  applyFilters();
}

const SORT_OPTIONS = {
  default:       null,
  price_asc:     (a, b) => a.price - b.price,
  price_desc:    (a, b) => b.price - a.price,
  rating_desc:   (a, b) => b.rating - a.rating,
  reviews_desc:  (a, b) => b.reviews - a.reviews,
};

function applyFilters() {
  const q = document.getElementById('search-input').value.toLowerCase();
  let list = [...products];
  if (activeCategory !== 'all') list = list.filter(p => p.cat === activeCategory);
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.seller.toLowerCase().includes(q));
  if (activeSortFn) list.sort(activeSortFn);
  renderGrid(list);
}

document.getElementById('search-input').addEventListener('input', applyFilters);

/* ── Inject sort select into the toolbar ── */
(function injectSortSelect() {
  const toolbar = document.querySelector('.mp-toolbar');
  if (!toolbar) return;
  const sel = document.createElement('select');
  sel.className = 'sort-select';
  sel.innerHTML = `
    <option value="default">Relevancia</option>
    <option value="price_asc">Precio ↑</option>
    <option value="price_desc">Precio ↓</option>
    <option value="rating_desc">Mejor valorado</option>
    <option value="reviews_desc">Más reseñas</option>
  `;
  sel.addEventListener('change', () => {
    activeSortFn = SORT_OPTIONS[sel.value] || null;
    applyFilters();
  });
  toolbar.appendChild(sel);
})();

/* ══════════════════════════
   OPEN PRODUCT
══════════════════════════ */
function openProduct(id) {
  currentProduct = products.find(p => p.id === id);
  currentQty = 1;
  const p = currentProduct;

  // badges
  const badges = document.getElementById('pd-badges');
  badges.innerHTML = '';
  if (p.discount) badges.innerHTML += `<span class="pd-badge badge-disc">${esc(p.discount)} OFF</span>`;
  badges.innerHTML += `<span class="pd-badge badge-stock">Stock: ${Number(p.stock)} disponibles</span>`;

  document.getElementById('pd-title').textContent = p.name;
  document.getElementById('pd-store').textContent = p.seller;
  document.getElementById('pd-stars').textContent = `★ ${p.rating}`;
  document.getElementById('pd-reviews').textContent = `(${p.reviews} reseñas)`;
  document.getElementById('pd-sold').textContent = `${p.sold} vendidos`;
  document.getElementById('pd-dist').textContent = p.dist;
  document.getElementById('pd-prep').textContent = p.prep;
  document.getElementById('pd-price').textContent = `$${p.price.toFixed(2)}`;

  const oldEl  = document.getElementById('pd-price-old');
  const saveEl = document.getElementById('pd-save');
  if (p.oldPrice) {
    oldEl.textContent  = `$${p.oldPrice.toFixed(2)}`;
    const saved = p.oldPrice - p.price;
    saveEl.textContent = `Ahorras $${saved.toFixed(2)}`;
    saveEl.style.display = '';
  } else {
    oldEl.textContent  = '';
    saveEl.style.display = 'none';
  }

  updateSubtotal();

  // main image
  document.getElementById('pd-main-img').src = p.img;

  // thumbs
  const thumbsEl = document.getElementById('pd-thumbs');
  thumbsEl.innerHTML = p.thumbs.map((t, i) => `
    <div class="pd-thumb ${i === 0 ? 'active' : ''}" onclick="setThumb(this,'${esc(t)}')">
      <img src="${esc(t)}" alt="">
    </div>
  `).join('');

  // description
  document.getElementById('pd-desc').textContent = p.desc;
  document.getElementById('pd-ingredients').innerHTML =
    p.ingredients.map(i => `<span class="tag">${esc(i)}</span>`).join('');
  document.getElementById('pd-allergens').innerHTML =
    p.allergens.length ? p.allergens.map(a => `<span class="tag allergen">${esc(a)}</span>`).join('')
    : '<span class="tag" style="color:#9ca3af">Ninguno</span>';

  const specsEl = document.getElementById('pd-specs');
  specsEl.innerHTML = Object.entries(p.specs).map(([k,v]) => `
    <div class="spec-item">
      <div class="spec-label">${esc(k)}</div>
      <div class="spec-val">${esc(v)}</div>
    </div>
  `).join('');

  // Wire "Iniciar Chat" link to open Chat with this seller pre-selected
  const chatLink = document.querySelector('.pd-chat-box a');
  if (chatLink) {
    chatLink.href = '#';
    chatLink.onclick = e => {
      e.preventDefault();
      if (typeof lmOpenChatWithSeller === 'function') {
        lmOpenChatWithSeller(p.seller);
      } else {
        window.location.href = '../html/Chat.html';
      }
    };
  }

  document.getElementById('page-marketplace').style.display = 'none';
  document.getElementById('page-product').style.display = 'block';
  window.scrollTo(0, 0);
}

function setThumb(el, src) {
  document.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('pd-main-img').src = src;
}

function changeQty(delta) {
  currentQty = Math.max(1, currentQty + delta);
  document.getElementById('qty-num').textContent = currentQty;
  updateSubtotal();
}

function updateSubtotal() {
  if (!currentProduct) return;
  const sub = (currentProduct.price * currentQty).toFixed(2);
  document.getElementById('qty-subtotal').textContent = `$${sub}`;
}

function addToCart() {
  if (!currentProduct) return;
  const item = buildCartItem(currentProduct);
  window.LocalCart.add(item, currentQty);
  showToast(`¡${currentProduct.name} añadido al carrito!`);
}

function buyNow() {
  if (!currentProduct) return;
  const item = buildCartItem(currentProduct);
  window.LocalCart.add(item, currentQty);
  showToast('Procesando compra...');
  setTimeout(() => {
    window.location.href = 'carritoypago.html';
  }, 600);
}

function quickAdd(e, id) {
  e.stopPropagation();
  const p = products.find(x => x.id === id);
  if (!p) return;
  window.LocalCart.add(buildCartItem(p), 1);
  showToast(`¡${p.name} añadido al carrito!`);
}

/* Convierte un producto del marketplace a un item del carrito.
   Prefijamos el id con 'mkt-' para que no choque con otros catálogos. */
function buildCartItem(p) {
  return {
    id:     'mkt-' + p.id,
    name:   p.name,
    seller: p.seller,
    desc:   p.seller,        // alias para checkout
    price:  p.price,
    img:    p.img,
    emoji:  '🛍️',            // fallback
  };
}

/* ══════════════════════════
   NAVIGATION
══════════════════════════ */
function showMarketplace(e) {
  if (e) e.preventDefault();
  document.getElementById('page-marketplace').style.display = 'block';
  document.getElementById('page-product').style.display = 'none';
  window.scrollTo(0, 0);
}

function goHome(e) {
  if (e) e.preventDefault();
  window.location.href = '../html/index.html';
}

/* ══════════════════════════
   TOAST
══════════════════════════ */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ══════════════════════════
   INIT
══════════════════════════ */
renderGrid(products);

// Si viene desde los Reels, abre directamente la info del producto
(function () {
  try {
    const pid = sessionStorage.getItem('localmarket_open_product');
    if (pid) {
      sessionStorage.removeItem('localmarket_open_product');
      sessionStorage.removeItem('localmarket_filter_seller');
      const id = parseInt(pid, 10);
      if (!isNaN(id)) openProduct(id);
    }
  } catch {}
})();