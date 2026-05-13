/* ═══════════════════════════════════════════════════════════
   LocalMarket · shared.js
   Fuente única de verdad: datos, utilidades y helpers globales.
   Cargar ANTES de cualquier otro script de la app.
   ═══════════════════════════════════════════════════════════ */

/* ── STORAGE KEYS ── */
const LM_KEYS = {
  cart:             'lm_cart_v1',
  checkout:         'lm_checkout_v1',
  deliveries:       'localmarket_deliveries',
  deliveriesActive: 'localmarket_deliveries_active',
  chat:             'lm_chat_v2',
  reels:            'localmarket_reels_state',
  user:             'lm_user_v1',
  orders:           'lm_orders_v1',
  theme:            'lm_theme',
};

/* ── REPARTIDORES (pool compartido) ── */
const LM_DRIVERS = [
  { name:'Carlos Martínez', rating:4.9, reviews:234, vehicle:'Moto ABC-123', vehicleType:'moto', initials:'CM',
    avatar:'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=120&h=120&fit=crop' },
  { name:'María López',     rating:4.8, reviews:187, vehicle:'Moto XJK-450', vehicleType:'moto', initials:'ML',
    avatar:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop' },
  { name:'José Hernández',  rating:4.7, reviews:312, vehicle:'Bicicleta',    vehicleType:'bici', initials:'JH',
    avatar:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop' },
  { name:'Ana Ramírez',     rating:5.0, reviews:98,  vehicle:'Moto QPL-221', vehicleType:'moto', initials:'AR',
    avatar:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop' },
];

/* ── CATÁLOGO UNIFICADO ── */
const LM_CATALOG = [
  { id:1,  name:'Pan Artesanal Integral',    price:4.05,  emoji:'🥖', cat:'panaderia',   seller:'Panadería Don José' },
  { id:2,  name:'Verduras Orgánicas Mix',    price:12.00, emoji:'🥬', cat:'alimentos',   seller:'Huerto Verde' },
  { id:3,  name:'Café Premium 250g',         price:8.75,  emoji:'☕', cat:'bebidas',     seller:'Café del Barrio' },
  { id:4,  name:'Artesanías Decorativas',    price:21.25, emoji:'🎨', cat:'artesanias',  seller:'Manos Creativas' },
  { id:5,  name:'Croissant de Mantequilla',  price:3.50,  emoji:'🥐', cat:'panaderia',   seller:'Panadería Don José' },
  { id:6,  name:'Frutas Tropicales Mix',     price:9.50,  emoji:'🍎', cat:'alimentos',   seller:'Huerto Verde' },
  { id:7,  name:'Café Latte',                price:5.25,  emoji:'☕', cat:'bebidas',     seller:'Café del Barrio' },
  { id:8,  name:'Cupcake Vainilla',          price:3.25,  emoji:'🧁', cat:'panaderia',   seller:'Panadería Don José' },
  { id:9,  name:'Baguette Clásica',          price:4.00,  emoji:'🥖', cat:'panaderia',   seller:'Panadería Don José' },
  { id:10, name:'Galletas de Avena',         price:6.00,  emoji:'🍪', cat:'panaderia',   seller:'Panadería Don José' },
  { id:11, name:'Té de Jamaica',             price:3.75,  emoji:'🌺', cat:'bebidas',     seller:'Café del Barrio' },
  { id:12, name:'Miel Local Pura',           price:9.00,  emoji:'🍯', cat:'alimentos',   seller:'Huerto Verde' },
];

/* ── CUPONES ── */
const LM_COUPONS = {
  DESCUENTO10: { type:'percent',  value:0.10, label:'10% de descuento' },
  ENVIOGRATIS: { type:'shipping', value:1.00, label:'Envío gratis' },
  BIENVENIDO:  { type:'percent',  value:0.15, label:'15% bienvenida' },
};

/* ══════════════════════════════════
   UTILIDADES COMUNES
══════════════════════════════════ */
function lmEscapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function lmFmtMoney(n) {
  return '$' + Number(n || 0).toFixed(2);
}

function lmFmtTime(ts) {
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2,'0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function lmNowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function lmPickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lmGenOrderId() {
  return 'LM-' + Math.floor(10000 + Math.random() * 90000);
}

/* ── ALGORITMO DE LUHN (validación de tarjetas) ── */
function lmLuhnCheck(num) {
  const digits = String(num).replace(/\D/g,'');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, odd = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]);
    if (!odd) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    odd = !odd;
  }
  return sum % 10 === 0;
}

/* ══════════════════════════════════
   DARK MODE
══════════════════════════════════ */
function lmApplyTheme() {
  const saved = localStorage.getItem(LM_KEYS.theme);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  _lmSyncToggleIcons();
}

function lmToggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(LM_KEYS.theme, isDark ? 'dark' : 'light');
  _lmSyncToggleIcons();
}

function _lmSyncToggleIcons() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.lm-theme-toggle').forEach(btn => {
    btn.title = isDark ? 'Modo claro' : 'Modo oscuro';
    btn.innerHTML = isDark
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  });
}

/* ══════════════════════════════════
   TOAST GLOBAL
══════════════════════════════════ */
function lmToast(msg, duration = 2800) {
  const t = document.getElementById('lm-toast') || document.getElementById('toast');
  const m = document.getElementById('lm-toast-msg') || document.getElementById('toast-msg');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._lmTimer);
  t._lmTimer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ══════════════════════════════════
   NOTIFICACIONES DEL NAVEGADOR
══════════════════════════════════ */
async function lmRequestNotifications() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const p = await Notification.requestPermission();
  return p === 'granted';
}

function lmNotify(title, body, icon) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: icon || '', badge: icon || '' });
  } catch {}
}

/* ══════════════════════════════════
   HISTORIAL DE ÓRDENES
══════════════════════════════════ */
function lmSaveOrder(orderData) {
  try {
    const orders = lmGetOrders();
    const order = {
      id:              lmGenOrderId(),
      savedAt:         Date.now(),
      items:           orderData.items           || [],
      total:           orderData.total           || 0,
      shipping:        orderData.shipping        || '',
      payment:         orderData.payment         || '',
      address:         orderData.address         || '',
      // El pedido empieza como 'confirmado'; Entregas.js lo actualizará
      status:          orderData.status          || 'confirmado',
      driver:          orderData.driver          || null,
      // ID del pedido en el módulo de entregas para poder sincronizar el estado
      deliveryOrderId: orderData.deliveryOrderId || null,
    };
    orders.unshift(order);
    localStorage.setItem(LM_KEYS.orders, JSON.stringify(orders.slice(0, 50)));
  } catch {}
}

/* Actualiza el status de una orden en el historial usando el orderId de la entrega */
function lmUpdateOrderByDelivery(deliveryOrderId, status) {
  try {
    const orders = lmGetOrders();
    const idx = orders.findIndex(o => String(o.deliveryOrderId) === String(deliveryOrderId));
    if (idx === -1) return false;
    orders[idx].status = status;
    localStorage.setItem(LM_KEYS.orders, JSON.stringify(orders));
    return true;
  } catch { return false; }
}

function lmGetOrders() {
  try {
    const raw = localStorage.getItem(LM_KEYS.orders);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

/* ══════════════════════════════════
   PERFIL DE USUARIO
══════════════════════════════════ */
const LM_DEFAULT_USER = {
  name:     'Mi perfil',
  email:    '',
  phone:    '',
  address:  '',
  bio:      '',
  avatar:   null,
  role:     'buyer',
  joinedAt: null,
};

function lmGetUser() {
  try {
    const raw = localStorage.getItem(LM_KEYS.user);
    if (!raw) return { ...LM_DEFAULT_USER, joinedAt: Date.now() };
    return { ...LM_DEFAULT_USER, ...JSON.parse(raw) };
  } catch { return { ...LM_DEFAULT_USER, joinedAt: Date.now() }; }
}

function lmSaveUser(data) {
  try {
    const current = lmGetUser();
    if (!current.joinedAt) current.joinedAt = Date.now();
    localStorage.setItem(LM_KEYS.user, JSON.stringify({ ...current, ...data }));
  } catch {}
}

/* ── ESTADÍSTICAS DINÁMICAS ── */
function lmGetStats() {
  const orders = lmGetOrders();
  return {
    products:     LM_CATALOG.length,
    sellers:      [...new Set(LM_CATALOG.map(p => p.seller))].length,
    orders:       orders.length,
    // Usa la misma fuente que orders para que activeOrders nunca supere orders.
    // El campo status lo mantiene lmUpdateOrderByDelivery() desde Entregas.js.
    activeOrders: orders.filter(o => o.status !== 'entregado').length,
  };
}

/* ── NAVEGACIÓN AL CHAT CON VENDEDOR PRE-SELECCIONADO ── */
function lmOpenChatWithSeller(sellerName) {
  sessionStorage.setItem('lm_open_chat_seller', sellerName);
  window.location.href = '../html/Chat.html';
}

/* ══════════════════════════════════
   RBAC – ROLES Y PERMISOS
══════════════════════════════════ */
/* Base URL for the backend REST API */
const LM_API = (function () {
  var port = '3000';
  return 'http://localhost:' + port + '/api/v1';
})();

const LM_PERMISSIONS = {
  buyer:        ['view_products','cart','orders','tracking','chat','profile'],
  seller:       ['view_products','cart','orders','tracking','chat','profile',
                 'manage_products','view_sales','seller_dashboard'],
  driver:       ['tracking','chat','profile',
                 'driver_deliveries','driver_earnings','driver_dashboard'],
  admin:        ['*'],
  master_admin: ['*'],
};

function lmHasPermission(perm) {
  const user = lmGetUser();
  const perms = LM_PERMISSIONS[user.role] || LM_PERMISSIONS.buyer;
  return perms.includes('*') || perms.includes(perm);
}

/* Redirige al index si el usuario no tiene uno de los roles permitidos */
function lmRequireRole(...roles) {
  const user = lmGetUser();
  if (!roles.includes(user.role)) {
    window.location.replace('../html/index.html');
    return false;
  }
  return true;
}

/* URL del dashboard según el rol del usuario actual */
function lmDashboardUrl() {
  const map = {
    seller:       '../html/dashboard-vendedor.html',
    driver:       '../html/dashboard-repartidor.html',
    admin:        '../html/dashboard-admin.html',
    master_admin: '../html/dashboard-admin.html',
  };
  return map[lmGetUser().role] || '../html/index.html';
}

/* ══════════════════════════════════
   AUTH HELPERS
══════════════════════════════════ */
function lmIsLoggedIn() {
  try {
    const raw = localStorage.getItem(LM_KEYS.user);
    if (!raw) return false;
    const u = JSON.parse(raw);
    return !!(u.email && u.name && u.name !== 'Mi perfil');
  } catch { return false; }
}

function lmLogout() {
  localStorage.removeItem(LM_KEYS.user);
  localStorage.removeItem('lm_access_token');
  localStorage.removeItem('lm_refresh_token');
  window.location.href = '../html/login.html';
}

/* ── Usuarios simulados (admin) ── */
function lmGetAllUsers() {
  try {
    const raw = localStorage.getItem('lm_all_users_v1');
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed inicial
  const seed = [
    { id:'u1', name:'Ana García',      email:'ana@demo.com',    role:'buyer',  status:'verified', joinedAt: Date.now()-86400000*30 },
    { id:'u2', name:'Panadería Don José', email:'jose@demo.com', role:'seller', status:'verified', joinedAt: Date.now()-86400000*90 },
    { id:'u3', name:'Carlos Martínez', email:'carlos@demo.com', role:'driver', status:'verified', joinedAt: Date.now()-86400000*15 },
    { id:'u4', name:'María López',     email:'maria@demo.com',  role:'driver', status:'pending',  joinedAt: Date.now()-86400000*2  },
    { id:'u5', name:'Huerto Verde',    email:'huerto@demo.com', role:'seller', status:'verified', joinedAt: Date.now()-86400000*60 },
    { id:'u6', name:'Café del Barrio', email:'cafe@demo.com',   role:'seller', status:'verified', joinedAt: Date.now()-86400000*45 },
    { id:'u7', name:'Luis Torres',     email:'luis@demo.com',   role:'buyer',  status:'verified', joinedAt: Date.now()-86400000*5  },
    { id:'u8', name:'José Hernández',  email:'jhern@demo.com',  role:'driver', status:'pending',  joinedAt: Date.now()-86400000*1  },
  ];
  localStorage.setItem('lm_all_users_v1', JSON.stringify(seed));
  return seed;
}

function lmSaveAllUsers(list) {
  try { localStorage.setItem('lm_all_users_v1', JSON.stringify(list)); } catch {}
}

// Aplica el tema antes de que se pinte nada (evita flash)
lmApplyTheme();
