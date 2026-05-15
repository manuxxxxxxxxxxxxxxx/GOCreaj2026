/* ═══════════════════════════════════════════════
   LocalMarket · Index page
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── Actividad real del usuario (si tiene pedidos) ─── */
  if (typeof lmGetStats === 'function' && typeof lmGetUser === 'function') {
    const stats = lmGetStats();
    const user  = lmGetUser();
    if (stats.orders > 0) {
      const section = document.querySelector('.stats');
      if (section) {
        const banner = document.createElement('div');
        banner.className = 'user-activity-bar';
        banner.style.cssText = 'grid-column:1/-1;display:flex;gap:20px;padding:12px 20px;background:linear-gradient(135deg,rgba(79,110,247,.08),rgba(124,58,237,.08));border-radius:12px;font-size:.82rem;color:#4f6ef7;font-weight:600;align-items:center;margin-top:8px;flex-wrap:wrap;';
        banner.innerHTML = `
          <span>👤 ${typeof lmEscapeHtml==='function'?lmEscapeHtml(user.name):user.name}</span>
          <span>🛒 ${stats.orders} pedido${stats.orders!==1?'s':''}</span>
          ${stats.activeOrders>0?`<span>🛵 ${stats.activeOrders} en camino</span>`:''}
          <a href="../html/historial.html" style="margin-left:auto;color:inherit;text-decoration:none">Ver historial →</a>
        `;
        section.appendChild(banner);
      }
    }
  }

  /* ─── Animación de stats al entrar en viewport ─── */
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseFloat(el.textContent.replace(',', ''));
    const isFloat = el.textContent.includes('.');
    const isFormatted = el.textContent.includes(',');
    let start = 0;
    const duration = 1800;
    const step = timestamp => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const value = target * ease;
      if (isFloat) {
        el.textContent = value.toFixed(1);
      } else if (isFormatted) {
        el.textContent = Math.floor(value).toLocaleString();
      } else {
        el.textContent = Math.floor(value);
      }
      if (progress < 1) requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
  });

  /* ─── Botones "Agregar" → guardar producto en localStorage ─── */
  function slugify(str) {
    return str.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function readCard(card) {
    const name   = card.querySelector('.product-name')?.textContent.trim() || 'Producto';
    const seller = card.querySelector('.product-seller')?.textContent.trim() || '';
    const priceText = card.querySelector('.product-price')?.textContent || '$0';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    const img   = card.querySelector('.product-img img')?.src || '';
    return {
      id: 'idx-' + slugify(name),
      name,
      seller,
      desc: seller, // alias para componentes que esperan `desc`
      price,
      img,
      emoji: '🛍️', // fallback por si la página de checkout lo necesita
    };
  }

  document.querySelectorAll('.product-card .add-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      const card = btn.closest('.product-card');
      if (!card) return;

      const product = readCard(card);
      // Guarda el objeto del producto en localStorage
      window.LocalCart.add(product);

      // Feedback visual
      const orig = this.textContent;
      this.textContent = '✓ Agregado';
      this.style.background = '#22c55e';
      setTimeout(() => {
        this.textContent = orig;
        this.style.background = '';
      }, 1200);
    });
  });

});