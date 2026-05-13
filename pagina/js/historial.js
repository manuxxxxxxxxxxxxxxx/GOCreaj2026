/* LocalMarket · historial.js */

let activeFilter = 'all';

function renderStats(orders) {
  document.getElementById('stat-total-orders').textContent = orders.length;
  const spent = orders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById('stat-total-spent').textContent = lmFmtMoney(spent);

  // Vendedor favorito
  const sellerCount = {};
  orders.forEach(o => (o.items||[]).forEach(it => {
    const s = it.seller || it.sellerName || '?';
    sellerCount[s] = (sellerCount[s]||0) + (it.qty||1);
  }));
  const fav = Object.entries(sellerCount).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('stat-fav-seller').textContent = fav ? fav[0].split(' ')[0] : '—';
}

function statusLabel(status) {
  return {
    entregado: '✓ Entregado',
    en_camino: '🛵 En camino',
    preparando: '👨‍🍳 Preparando',
    confirmado: '📋 Confirmado',
  }[status] || status;
}

function renderOrders() {
  const all = lmGetOrders();
  renderStats(all);

  const filtered = activeFilter === 'all' ? all : all.filter(o => o.status === activeFilter);
  const list = document.getElementById('orders-list');

  if (!filtered.length) {
    list.innerHTML = `<div class="hist-empty">
      <div class="hist-empty-icon">🛒</div>
      <h3>${activeFilter === 'all' ? 'Aún no tienes pedidos' : 'Sin pedidos en esta categoría'}</h3>
      <p>Explora el marketplace y haz tu primera compra.</p>
      <a href="../html/market.html">Ir al Marketplace →</a>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(order => {
    const date = new Date(order.savedAt);
    const dateStr = date.toLocaleDateString('es', {day:'numeric',month:'long',year:'numeric'});
    const timeStr = lmFmtTime(order.savedAt);
    const items = order.items || [];
    const itemsHtml = items.slice(0, 4).map(it => `
      <div class="order-item-row">
        <div class="order-item-emoji">${it.emoji || '🛒'}</div>
        <div class="order-item-info">
          <div class="order-item-name">${lmEscapeHtml(it.name)}</div>
          <div class="order-item-qty">x${it.qty || 1} · ${it.seller || ''}</div>
        </div>
        <div class="order-item-price">${lmFmtMoney((it.price||0) * (it.qty||1))}</div>
      </div>`).join('');
    const moreItems = items.length > 4 ? `<div style="padding:8px 0;font-size:.78rem;color:var(--text-muted)">+${items.length-4} artículo(s) más</div>` : '';

    const driverHtml = order.driver ? `
      <div class="order-driver">
        <img class="driver-avatar-mini" src="${lmEscapeHtml(order.driver.avatar||'')}" alt="" onerror="this.style.display='none'">
        Entregado por <strong>${lmEscapeHtml(order.driver.name)}</strong> &middot; ⭐ ${order.driver.rating || ''}
      </div>` : '';

    return `<div class="order-card" data-oid="${lmEscapeHtml(order.id)}">
      <div class="order-card-header">
        <div>
          <div class="order-id">${lmEscapeHtml(order.id)}</div>
          <div class="order-date">${dateStr} · ${timeStr}</div>
        </div>
        <span class="order-status ${lmEscapeHtml(order.status||'entregado')}">${statusLabel(order.status)}</span>
      </div>
      <div class="order-items">${itemsHtml}${moreItems}</div>
      ${driverHtml}
      <div class="order-card-footer">
        <div class="order-total">Total: <span>${lmFmtMoney(order.total)}</span></div>
        <div class="order-actions">
          <button class="order-action-btn primary" onclick="reorder('${lmEscapeHtml(order.id)}')">Pedir de nuevo</button>
          <button class="order-action-btn secondary" onclick="deleteOrder('${lmEscapeHtml(order.id)}')">Eliminar</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function reorder(orderId) {
  const orders = lmGetOrders();
  const order  = orders.find(o => o.id === orderId);
  if (!order?.items?.length) { lmToast('Sin artículos para re-ordenar'); return; }
  if (window.LocalCart) {
    order.items.forEach((it, idx) => window.LocalCart.add({ id:it.id||(it.name+'_'+idx), name:it.name, price:it.price, emoji:it.emoji||'🛒', qty:it.qty||1 }));
    lmToast('✅ Artículos añadidos al carrito');
    setTimeout(() => window.location.href = 'carritoypago.html', 1000);
  } else {
    window.location.href = 'market.html';
  }
}

function deleteOrder(orderId) {
  try {
    const orders = lmGetOrders().filter(o => o.id !== orderId);
    localStorage.setItem(LM_KEYS.orders, JSON.stringify(orders));
    lmToast('Pedido eliminado');
    renderOrders();
  } catch {}
}

window.addEventListener('DOMContentLoaded', () => {
  _lmSyncToggleIcons();
  renderOrders();

  document.querySelectorAll('.hist-filter').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hist-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderOrders();
    })
  );

  document.getElementById('clear-btn').addEventListener('click', () => {
    if (!lmGetOrders().length) { lmToast('No hay pedidos que limpiar'); return; }
    if (!confirm('¿Eliminar todo el historial de pedidos?')) return;
    localStorage.removeItem(LM_KEYS.orders);
    lmToast('Historial eliminado');
    renderOrders();
  });
});
