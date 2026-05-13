/* ═══════════════════════════════════════════════════════════
   LocalMarket · Dashboard Vendedor
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  /* Guard: only sellers (and admins) can access this page */
  if (typeof lmRequireRole === 'function') {
    if (!lmRequireRole('seller', 'admin', 'master_admin')) return;
  }

  const user = typeof lmGetUser === 'function' ? lmGetUser() : {};
  document.getElementById('seller-name-sub').textContent =
    (user.name || user.email || 'Vendedor') + ' · Vendedor';

  /* ── Local product storage ── */
  const PRODUCTS_KEY = 'lm_seller_products_v1';

  function getProducts() {
    try {
      const raw = localStorage.getItem(PRODUCTS_KEY);
      if (!raw) return seedProducts();
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : seedProducts();
    } catch { return seedProducts(); }
  }

  function saveProducts(list) {
    try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list)); } catch {}
  }

  function seedProducts() {
    const seed = [
      { id: 1, name: 'Pan Artesanal Integral', price: 4.05, cat: 'panaderia', emoji: '🥖', stock: 40, active: true },
      { id: 2, name: 'Croissant de Mantequilla', price: 3.50, cat: 'panaderia', emoji: '🥐', stock: 25, active: true },
      { id: 3, name: 'Baguette Clásica', price: 4.00, cat: 'panaderia', emoji: '🥖', stock: 30, active: true },
      { id: 4, name: 'Cupcake Vainilla', price: 3.25, cat: 'panaderia', emoji: '🧁', stock: 20, active: false },
    ];
    saveProducts(seed);
    return seed;
  }

  /* ── Orders from localStorage ── */
  function getOrders() {
    if (typeof lmGetOrders === 'function') return lmGetOrders();
    try {
      const raw = localStorage.getItem('lm_orders_v1');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /* ── Stats ── */
  function renderStats() {
    const orders = getOrders();
    const products = getProducts();

    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.savedAt || 0).toDateString() === today);
    const todayRevenue = todayOrders.reduce((s, o) => s + (Number(o.total) || 0) * 0.70, 0);
    const activeCount  = products.filter(p => p.active).length;

    document.getElementById('stat-ventas-hoy').textContent = '$' + todayRevenue.toFixed(2);
    document.getElementById('badge-ventas-hoy').textContent = '+' + todayOrders.length + ' hoy';
    document.getElementById('stat-pedidos').textContent = orders.length;
    document.getElementById('badge-pedidos').textContent = '+' + todayOrders.length + ' hoy';
    document.getElementById('stat-productos').textContent = activeCount;
    document.getElementById('badge-productos').textContent = activeCount + ' activos';
  }

  /* ── Chart ── */
  function renderChart() {
    const ctx = document.getElementById('chart-ventas');
    if (!ctx || typeof Chart === 'undefined') return;

    const days = [];
    const data = [];
    const orders = getOrders();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('es', { weekday: 'short' });
      days.push(label.charAt(0).toUpperCase() + label.slice(1));
      const dayStr = d.toDateString();
      const dayRevenue = orders
        .filter(o => new Date(o.savedAt || 0).toDateString() === dayStr)
        .reduce((s, o) => s + (Number(o.total) || 0) * 0.70, 0);
      data.push(parseFloat(dayRevenue.toFixed(2)));
    }

    /* Destroy existing chart if any */
    if (window._vendedorChart) window._vendedorChart.destroy();

    window._vendedorChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'Ventas ($)',
          data: data,
          borderColor: '#4f6ef7',
          backgroundColor: 'rgba(79,110,247,0.08)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#4f6ef7',
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { callback: v => '$' + v },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  /* ── Recent orders ── */
  function renderRecentOrders() {
    const orders = getOrders().slice(0, 5);
    const el = document.getElementById('orders-recientes');
    if (!el) return;

    if (!orders.length) {
      el.innerHTML = '<p style="color:#9ca3af;font-size:.85rem;text-align:center;padding:20px">Sin pedidos aún</p>';
      return;
    }

    const STATUS_CLASS = {
      confirmado: 'status-confirmado',
      preparando: 'status-preparando',
      en_camino:  'status-en_camino',
      entregado:  'status-entregado',
    };
    const STATUS_LABEL = {
      confirmado: 'Confirmado',
      preparando: 'Preparando',
      en_camino:  'En camino',
      entregado:  'Entregado',
    };

    el.innerHTML = orders.map(o => {
      const status = o.status || 'confirmado';
      const initials = (o.id || 'LM').slice(0, 2).toUpperCase();
      return `
        <div class="order-row">
          <div class="order-avatar">${initials}</div>
          <div class="order-info">
            <div class="order-id">${o.id || '—'}</div>
            <div class="order-meta">${o.items ? o.items.length + ' producto(s)' : '—'}</div>
          </div>
          <span class="order-status ${STATUS_CLASS[status] || 'status-confirmado'}">
            ${STATUS_LABEL[status] || status}
          </span>
          <div class="order-amount">$${Number(o.total || 0).toFixed(2)}</div>
        </div>
      `;
    }).join('');
  }

  /* ── Products table ── */
  function renderProductsTable() {
    const products = getProducts();
    const tbody = document.getElementById('productos-tbody');
    if (!tbody) return;

    if (!products.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Sin productos. ¡Agrega el primero!</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td class="product-emoji-cell">${p.emoji || '📦'}</td>
        <td class="product-name-cell">${escHtml(p.name)}</td>
        <td>$${Number(p.price).toFixed(2)}</td>
        <td><span class="cat-badge">${escHtml(p.cat || '—')}</span></td>
        <td>${p.stock ?? '—'}</td>
        <td>
          <button class="toggle-active ${p.active ? 'on' : 'off'}"
                  data-pid="${p.id}"
                  title="${p.active ? 'Desactivar' : 'Activar'}">
          </button>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" data-edit="${p.id}" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon danger" data-del="${p.id}" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    /* Wire toggle buttons */
    tbody.querySelectorAll('.toggle-active').forEach(btn => {
      btn.addEventListener('click', function () {
        const pid = Number(this.dataset.pid);
        const prods = getProducts();
        const p = prods.find(x => x.id === pid);
        if (!p) return;
        p.active = !p.active;
        saveProducts(prods);
        renderProductsTable();
        renderStats();
        toast(p.active ? '✅ Producto activado' : '⏸ Producto desactivado');
      });
    });

    /* Wire edit buttons */
    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', function () {
        const pid = Number(this.dataset.edit);
        openModal(pid);
      });
    });

    /* Wire delete buttons */
    tbody.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', function () {
        const pid = Number(this.dataset.del);
        if (!confirm('¿Eliminar este producto?')) return;
        const prods = getProducts().filter(x => x.id !== pid);
        saveProducts(prods);
        renderProductsTable();
        renderStats();
        toast('🗑 Producto eliminado');
      });
    });
  }

  /* ── Modal ── */
  let editingId = null;

  function openModal(pid) {
    editingId = pid ?? null;
    const products = getProducts();
    const p = pid != null ? products.find(x => x.id === pid) : null;

    document.getElementById('modal-titulo').textContent = p ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('modal-edit-id').value = p ? p.id : '';
    document.getElementById('modal-nombre').value = p ? p.name : '';
    document.getElementById('modal-precio').value = p ? p.price : '';
    document.getElementById('modal-categoria').value = p ? (p.cat || 'panaderia') : 'panaderia';
    document.getElementById('modal-emoji').value = p ? (p.emoji || '') : '';

    document.getElementById('modal-producto').classList.add('open');
    document.getElementById('modal-nombre').focus();
  }

  function closeModal() {
    document.getElementById('modal-producto').classList.remove('open');
    editingId = null;
  }

  function saveModal() {
    const nombre = document.getElementById('modal-nombre').value.trim();
    const precio = parseFloat(document.getElementById('modal-precio').value);
    const cat    = document.getElementById('modal-categoria').value;
    const emoji  = document.getElementById('modal-emoji').value.trim() || '📦';

    if (!nombre) { toast('⚠️ Escribe el nombre del producto'); return; }
    if (isNaN(precio) || precio < 0) { toast('⚠️ Precio inválido'); return; }

    const products = getProducts();

    if (editingId != null) {
      const idx = products.findIndex(x => x.id === editingId);
      if (idx !== -1) {
        products[idx] = { ...products[idx], name: nombre, price: precio, cat, emoji };
      }
      toast('✅ Producto actualizado');
    } else {
      const newId = products.length ? Math.max(...products.map(x => x.id)) + 1 : 1;
      products.push({ id: newId, name: nombre, price: precio, cat, emoji, stock: 0, active: true });
      toast('✅ Producto creado');
    }

    saveProducts(products);
    closeModal();
    renderProductsTable();
    renderStats();
  }

  /* ── Toast ── */
  function toast(msg) {
    if (typeof lmToast === 'function') { lmToast(msg); return; }
    const t = document.getElementById('lm-toast');
    const m = document.getElementById('lm-toast-msg');
    if (!t || !m) return;
    m.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ── Helpers ── */
  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  /* ── Event bindings ── */
  function bindEvents() {
    ['btn-nuevo-producto', 'btn-nuevo-producto-2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => openModal(null));
    });

    document.getElementById('btn-crear-reel')?.addEventListener('click', () =>
      toast('📹 Funcionalidad de Reels próximamente')
    );

    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('modal-save')?.addEventListener('click', saveModal);

    document.getElementById('modal-producto')?.addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
  }

  /* ── Init ── */
  renderStats();
  renderChart();
  renderRecentOrders();
  renderProductsTable();
  bindEvents();
});
