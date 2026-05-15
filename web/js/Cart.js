/* ═══════════════════════════════════════════════
   LocalMarket · Shared cart module
   - Persiste objetos completos de producto en localStorage
   - Sincroniza el badge del carrito entre pestañas
     (storage event) y dentro de la misma página
     (custom event 'cart:changed').
   - Expone window.LocalCart globalmente.
   ═══════════════════════════════════════════════ */

(function () {
  'use strict';

  const KEY = 'localmarket_cart';

  /* ─── Lectura / escritura ─── */
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[LocalCart] No se pudo leer el carrito:', e);
      return [];
    }
  }

  function write(cart) {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('[LocalCart] No se pudo guardar el carrito:', e);
    }
    // Notifica a oyentes de la misma página
    window.dispatchEvent(new CustomEvent('cart:changed', { detail: { cart } }));
    updateAllBadges();
  }

  /* ─── API pública ─── */
  function get() {
    return read();
  }

  function count() {
    return read().reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  }

  function add(product, qty = 1) {
    if (!product || product.id == null) {
      console.warn('[LocalCart] Producto inválido:', product);
      return read();
    }
    const cart = read();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.qty = Math.min(99, (Number(existing.qty) || 1) + qty);
    } else {
      // Guardamos el OBJETO COMPLETO del producto + qty
      cart.push({ ...product, qty });
    }
    write(cart);
    return cart;
  }

  function remove(id) {
    const cart = read().filter(item => item.id !== id);
    write(cart);
    return cart;
  }

  function updateQty(id, qty) {
    if (qty <= 0) return remove(id);
    const cart = read();
    const item = cart.find(i => i.id === id);
    if (!item) return cart;
    item.qty = Math.min(99, qty);
    write(cart);
    return cart;
  }

  function changeQty(id, delta) {
    const cart = read();
    const item = cart.find(i => i.id === id);
    if (!item) return cart;
    return updateQty(id, (Number(item.qty) || 1) + delta);
  }

  function clear() {
    write([]);
  }

  /* ─── Badges ─── */
  function updateAllBadges() {
    const n = count();
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = n;
      badge.style.display = n > 0 ? '' : 'none';
    });
  }

  /* ─── Sincronización entre pestañas ─── */
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    updateAllBadges();
    window.dispatchEvent(new CustomEvent('cart:changed', { detail: { cart: read() } }));
  });

  /* ─── Inicializar badges al cargar ─── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateAllBadges);
  } else {
    updateAllBadges();
  }

  /* ─── Exposición global ─── */
  window.LocalCart = {
    get,
    add,
    remove,
    updateQty,
    changeQty,
    clear,
    count,
    updateBadges: updateAllBadges,
    KEY,
  };
})();