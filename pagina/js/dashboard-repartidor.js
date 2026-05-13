/* ═══════════════════════════════════════════════════════════
   LocalMarket · Dashboard Repartidor
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  /* Guard: only drivers (and admins) can access this page */
  if (typeof lmRequireRole === 'function') {
    if (!lmRequireRole('driver', 'admin', 'master_admin')) return;
  }

  const user = typeof lmGetUser === 'function' ? lmGetUser() : {};
  const nameEl = document.getElementById('driver-name-display');
  if (nameEl) nameEl.textContent = user.name || user.email || 'Repartidor';

  /* ── Storage keys ── */
  const DELIVERIES_KEY  = 'lm_deliveries_v1';
  const ORDERS_KEY      = 'lm_orders_v1';
  const AVAIL_KEY       = 'lm_driver_available';

  /* ── Helpers ── */
  function getDeliveries() {
    try {
      const raw = localStorage.getItem(DELIVERIES_KEY);
      if (!raw) return seedDeliveries();
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : seedDeliveries();
    } catch { return seedDeliveries(); }
  }

  function saveDeliveries(list) {
    try { localStorage.setItem(DELIVERIES_KEY, JSON.stringify(list)); } catch {}
  }

  function seedDeliveries() {
    const seed = [
      {
        id: 'DEL-001',
        orderId: 'ORD-1001',
        customer: 'Ana García',
        address: 'Calle Mayor 12, Madrid',
        status: 'en_camino',
        amount: 18.50,
        earnings: 3.50,
        pickedAt: new Date(Date.now() - 12 * 60000).toISOString(),
      },
    ];
    saveDeliveries(seed);
    return seed;
  }

  function getOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function saveOrders(list) {
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); } catch {}
  }

  function isAvailable() {
    return localStorage.getItem(AVAIL_KEY) !== 'false';
  }

  function setAvailability(val) {
    localStorage.setItem(AVAIL_KEY, String(val));
  }

  function escHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function toast(msg) {
    if (typeof lmToast === 'function') { lmToast(msg); return; }
    const t = document.getElementById('lm-toast');
    const m = document.getElementById('lm-toast-msg');
    if (!t || !m) return;
    m.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ── Stats ── */
  function renderStats() {
    const deliveries = getDeliveries();
    const today = new Date().toDateString();

    const todayDeliveries = deliveries.filter(d =>
      d.status === 'entregado' &&
      new Date(d.deliveredAt || 0).toDateString() === today
    );

    const todayEarnings = todayDeliveries.reduce((s, d) => s + (Number(d.earnings) || 0), 0);
    const totalDeliveries = deliveries.filter(d => d.status === 'entregado').length;

    const allTimes = deliveries
      .filter(d => d.status === 'entregado' && d.pickedAt && d.deliveredAt)
      .map(d => (new Date(d.deliveredAt) - new Date(d.pickedAt)) / 60000);
    const avgTime = allTimes.length
      ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
      : 28;

    document.getElementById('stat-earnings').textContent = '$' + todayEarnings.toFixed(2);
    document.getElementById('stat-deliveries').textContent = totalDeliveries;
    document.getElementById('stat-time').textContent = avgTime;
  }

  /* ── Active deliveries ── */
  function renderActiveDeliveries() {
    const deliveries = getDeliveries().filter(d => d.status === 'en_camino' || d.status === 'recogido');
    const el = document.getElementById('active-deliveries-list');
    const badge = document.getElementById('active-badge');
    if (!el) return;
    if (badge) badge.textContent = deliveries.length;

    if (!deliveries.length) {
      el.innerHTML = '<p style="color:#9ca3af;font-size:.85rem;text-align:center;padding:20px">Sin entregas activas</p>';
      return;
    }

    el.innerHTML = deliveries.map(d => {
      const elapsed = d.pickedAt
        ? Math.round((Date.now() - new Date(d.pickedAt)) / 60000)
        : '—';
      return `
        <div class="delivery-row">
          <div class="delivery-info">
            <div class="delivery-id">${escHtml(d.id)}</div>
            <div class="delivery-meta">
              <span>📍 ${escHtml(d.address)}</span>
              <span>${elapsed} min en ruta</span>
            </div>
            <div class="delivery-customer">Cliente: ${escHtml(d.customer)}</div>
          </div>
          <div class="delivery-actions">
            <div class="delivery-amount">+$${Number(d.earnings || 0).toFixed(2)}</div>
            <button class="btn-deliver" data-del-id="${escHtml(d.id)}">
              Marcar entregado
            </button>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.btn-deliver').forEach(btn => {
      btn.addEventListener('click', function () {
        const delId = this.dataset.delId;
        const list = getDeliveries();
        const idx = list.findIndex(x => x.id === delId);
        if (idx === -1) return;
        list[idx].status = 'entregado';
        list[idx].deliveredAt = new Date().toISOString();
        saveDeliveries(list);

        /* Also update order status if linked */
        if (list[idx].orderId) {
          const orders = getOrders();
          const oi = orders.findIndex(o => o.id === list[idx].orderId);
          if (oi !== -1) {
            orders[oi].status = 'entregado';
            saveOrders(orders);
          }
        }

        renderAll();
        toast('✅ Entrega marcada como completada');
      });
    });
  }

  /* ── Available orders (ready for pickup) ── */
  function renderAvailableOrders() {
    const orders = getOrders().filter(o =>
      o.status === 'listo' || o.status === 'preparado' || o.status === 'ready'
    );
    const el = document.getElementById('available-orders-list');
    const badge = document.getElementById('avail-badge');
    if (!el) return;
    if (badge) badge.textContent = orders.length;

    if (!orders.length) {
      el.innerHTML = '<p style="color:#9ca3af;font-size:.85rem;text-align:center;padding:20px">Sin pedidos disponibles ahora</p>';
      return;
    }

    el.innerHTML = orders.map(o => `
      <div class="order-avail-row">
        <div class="order-avail-info">
          <div class="order-avail-id">${escHtml(o.id || '—')}</div>
          <div class="order-avail-meta">
            ${o.items ? o.items.length + ' producto(s)' : '—'} ·
            $${Number(o.total || 0).toFixed(2)}
          </div>
        </div>
        <button class="btn-accept" data-ord-id="${escHtml(o.id)}">
          Aceptar
        </button>
      </div>
    `).join('');

    el.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', function () {
        if (!isAvailable()) {
          toast('⚠️ Activa tu disponibilidad primero');
          return;
        }
        const ordId = this.dataset.ordId;
        const orders = getOrders();
        const oi = orders.findIndex(o => o.id === ordId);
        if (oi === -1) return;
        orders[oi].status = 'en_camino';
        saveOrders(orders);

        /* Create a delivery record */
        const deliveries = getDeliveries();
        const newDel = {
          id: 'DEL-' + Date.now(),
          orderId: ordId,
          customer: orders[oi].customerName || 'Cliente',
          address: orders[oi].address || 'Dirección no especificada',
          status: 'en_camino',
          amount: Number(orders[oi].total || 0),
          earnings: parseFloat((Number(orders[oi].total || 0) * 0.10).toFixed(2)),
          pickedAt: new Date().toISOString(),
        };
        deliveries.push(newDel);
        saveDeliveries(deliveries);

        renderAll();
        toast('🚴 Pedido aceptado — ¡en camino!');
      });
    });
  }

  /* ── Availability toggle ── */
  function renderAvailToggle() {
    const pill  = document.getElementById('avail-toggle');
    const label = document.getElementById('avail-label');
    if (!pill) return;

    const avail = isAvailable();
    pill.classList.toggle('active', avail);
    if (label) label.textContent = avail ? 'Disponible' : 'No disponible';
  }

  function bindAvailToggle() {
    const pill = document.getElementById('avail-toggle');
    if (!pill) return;
    pill.addEventListener('click', function () {
      const next = !isAvailable();
      setAvailability(next);
      renderAvailToggle();
      toast(next ? '✅ Ahora estás disponible' : '⏸ Modo no disponible activado');
    });
  }

  /* ── Render all ── */
  function renderAll() {
    renderStats();
    renderActiveDeliveries();
    renderAvailableOrders();
    renderAvailToggle();
  }

  /* ── Init ── */
  renderAll();
  bindAvailToggle();
});
