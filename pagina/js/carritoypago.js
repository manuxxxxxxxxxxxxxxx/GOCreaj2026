(() => {
    'use strict';
  
    /* ─── Catalog (usa el catálogo unificado de shared.js) ─── */
    const CATALOG = LM_CATALOG.map(p => ({
      id:    p.id,
      name:  p.name,
      desc:  p.seller || '',
      price: p.price,
      emoji: p.emoji,
    }));
  
    const SHIPPING = {
      1: { cost: 2.50, eta: '30–45 minutos' },
      2: { cost: 4.99, eta: '15–20 minutos' },
    };
  
    const COUPONS = typeof LM_COUPONS !== 'undefined' ? LM_COUPONS : {
      DESCUENTO10: { type: 'percent',  value: 0.10, label: '10% de descuento' },
      ENVIOGRATIS: { type: 'shipping', value: 1.00, label: 'Envío gratis' },
    };
  
    const DEFAULT_ADDRESS = {
      label:  'Mi Casa',
      street: 'Calle Principal #123, Apt 4B',
      city:   'Colonia Centro, Ciudad, CP 12345',
    };

    const STORAGE_KEY = (typeof LM_KEYS !== 'undefined') ? LM_KEYS.checkout : 'lm_checkout_v1';

    /* ─── Claves del módulo de Entregas ─── */
    const DELIVERIES_KEY        = (typeof LM_KEYS !== 'undefined') ? LM_KEYS.deliveries       : 'localmarket_deliveries';
    const DELIVERIES_ACTIVE_KEY = (typeof LM_KEYS !== 'undefined') ? LM_KEYS.deliveriesActive : 'localmarket_deliveries_active';

    /* ─── Repartidores: usa el pool compartido de shared.js ─── */
    const DRIVERS = typeof LM_DRIVERS !== 'undefined' ? LM_DRIVERS : [];

    /* ─── State (todo menos el cart, que vive en LocalCart) ─── */
    let state = {
      coupon:       '',
      shippingMode: 1,
      paymentMode:  1,
      address:      { ...DEFAULT_ADDRESS },
    };
  
    /* ─── Persistence (solo metadata del checkout, NO el cart) ─── */
    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        state.coupon       = typeof parsed.coupon === 'string' ? parsed.coupon : '';
        state.shippingMode = parsed.shippingMode === 2 ? 2 : 1;
        state.paymentMode  = parsed.paymentMode  === 2 ? 2 : 1;
        state.address      = parsed.address && typeof parsed.address === 'object'
          ? { ...DEFAULT_ADDRESS, ...parsed.address }
          : { ...DEFAULT_ADDRESS };
      } catch (e) {
        console.warn('Failed to load state', e);
      }
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          coupon:       state.coupon,
          shippingMode: state.shippingMode,
          paymentMode:  state.paymentMode,
          address:      state.address,
        }));
      } catch (e) { /* ignore quota errors */ }
    }
  
    /* ─── Helpers ─── */
    const $   = id => document.getElementById(id);
    const fmt = n  => '$' + n.toFixed(2);

    const productById = id => CATALOG.find(p => p.id === id);

    /* Items del carrito ahora vienen de LocalCart como objetos completos */
    const getCartProducts = () => {
      const items = (window.LocalCart && window.LocalCart.get()) || [];
      return items.map(it => ({
        id:    it.id,
        name:  it.name || 'Producto',
        desc:  it.desc || it.seller || '',
        price: Number(it.price) || 0,
        emoji: it.emoji || '',
        img:   it.img   || '',
        qty:   Number(it.qty) || 1,
      }));
    };
  
    const getSubtotal = () =>
      getCartProducts().reduce((s, p) => s + p.price * p.qty, 0);
  
    const getShippingCost = () => SHIPPING[state.shippingMode].cost;
  
    const getDiscount = () => {
      const coupon = COUPONS[state.coupon];
      if (!coupon) return 0;
      if (coupon.type === 'percent')  return getSubtotal() * coupon.value;
      if (coupon.type === 'shipping') return getShippingCost() * coupon.value;
      return 0;
    };
  
    const getTotal = () =>
      Math.max(0, getSubtotal() + getShippingCost() - getDiscount());
  
    /* ═══════════════════════════════════════════════
       INTEGRACIÓN CON MÓDULO DE ENTREGAS
       Crea una entrega en localStorage en el mismo
       formato que usa entregas.js, sin depender de
       que ese script esté cargado.
       ═══════════════════════════════════════════════ */

    function pickDriver() {
      return DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
    }

    /** Convierte la dirección del checkout al formato que espera entregas.js */
    function mapAddressForDelivery(addr) {
      const parts = (addr.city || '').split(',').map(s => s.trim()).filter(Boolean);
      return {
        label:        addr.label  || 'Mi dirección',
        street:       addr.street || '',
        neighborhood: parts[0] || '',
        city:         parts.slice(1).join(', ') || '',
        reference:    addr.reference || '',
      };
    }

    /** Lee/escribe directo en localStorage si LocalDeliveries no está cargado */
    function readDeliveriesRaw() {
      try {
        const raw = localStorage.getItem(DELIVERIES_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    }
    function writeDeliveriesRaw(list) {
      try { localStorage.setItem(DELIVERIES_KEY, JSON.stringify(list)); } catch {}
    }

    /**
     * Construye el objeto de entrega con datos REALES del checkout
     * (productos, costos, descuentos, dirección).
     */
    function buildDeliveryFromCheckout(orderId) {
      const products  = getCartProducts();
      const subtotal  = getSubtotal();
      const realDisc  = getDiscount();
      const realShip  = Math.max(0, getShippingCost() - (
        // Si el cupón es de envío, todo el "descuento" se resta del envío
        COUPONS[state.coupon] && COUPONS[state.coupon].type === 'shipping' ? realDisc : 0
      ));
      // Descuento que NO viene del envío (sólo el de tipo percent sobre subtotal)
      const subtotalDisc = (COUPONS[state.coupon] && COUPONS[state.coupon].type === 'percent')
        ? realDisc : 0;
      const discountPct = subtotal > 0
        ? +((subtotalDisc / subtotal) * 100).toFixed(2)
        : 0;

      const total = Math.max(0, +(subtotal + realShip - subtotalDisc).toFixed(2));

      // Reparto 70/20/10
      const seller   = +(total * 0.70).toFixed(2);
      const courier  = +(total * 0.20).toFixed(2);
      const platform = +(total - seller - courier).toFixed(2);

      const driver = pickDriver();

      return {
        id:           'ENT-' + Date.now(),
        orderId:      String(orderId),
        createdAt:    Date.now(),
        forcedStatus: null,
        items: products.map(p => ({
          id:     p.id,
          name:   p.name,
          seller: p.desc || '',
          price:  p.price,
          qty:    p.qty,
        })),
        subtotal:    +subtotal.toFixed(2),
        shipping:    +realShip.toFixed(2),
        discount:    +subtotalDisc.toFixed(2),
        discountPct,
        total,
        driver: {
          ...driver,
          deliveriesToday: 8 + Math.floor(Math.random() * 12),
        },
        address: mapAddressForDelivery(state.address),
        income: { seller, courier, platform },
      };
    }

    /**
     * Crea la entrega y la guarda. Usa la API global LocalDeliveries
     * si está disponible, si no escribe directo a localStorage.
     */
    function createDeliveryFromOrder(orderId) {
      const delivery = buildDeliveryFromCheckout(orderId);

      if (window.LocalDeliveries && typeof window.LocalDeliveries.create === 'function') {
        // Usar API si está cargada (más limpio)
        window.LocalDeliveries.create({
          orderId:     delivery.orderId,
          items:       delivery.items,
          shipping:    delivery.shipping,
          discountPct: delivery.discountPct,
          address:     delivery.address,
          driver:      delivery.driver,
        });
      } else {
        // Fallback: escribir directo
        const all = readDeliveriesRaw();
        all.unshift(delivery);
        writeDeliveriesRaw(all);
        try { localStorage.setItem(DELIVERIES_ACTIVE_KEY, delivery.id); } catch {}
      }
      return delivery;
    }

    /** Redirige a la página de entregas (puede usarse desde un botón en el panel 3) */
    function goToDeliveries() {
      window.location.href = 'Entregas.html';
    }

    /* ═══════════════════════════════════════════════
       RENDERING
       ═══════════════════════════════════════════════ */
  
    function renderAll() {
      renderCart();
      renderSummary();
      renderMini();
      renderAddress();
    }
  
    function renderCart() {
      const list  = $('cart-items');
      const empty = $('empty-msg');
      const badge = $('count-badge');
      const addBtn = $('addMoreBtn');
      const checkoutBtn = $('checkoutBtn');
  
      const products = getCartProducts();
      const totalQty = products.reduce((s, p) => s + p.qty, 0);
  
      badge.textContent = totalQty + ' producto' + (totalQty !== 1 ? 's' : '');
  
      if (products.length === 0) {
        list.innerHTML = '';
        empty.classList.add('show');
        addBtn.style.display = 'none';
        checkoutBtn.disabled = true;
        return;
      }
  
      empty.classList.remove('show');
      addBtn.style.display = 'flex';
      checkoutBtn.disabled = false;
  
      list.innerHTML = products.map(p => `
        <div class="product-row" data-id="${p.id}">
          <div class="prod-img">${p.img
            ? `<img src="${p.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
            : (p.emoji || '📦')}</div>
          <div class="prod-info">
            <div class="prod-name">${p.name}</div>
            <div class="prod-sub">${p.desc}</div>
            <div class="prod-unit">${fmt(p.price)} c/u</div>
          </div>
          <div class="prod-controls">
            <div class="qty-ctrl">
              <button class="qty-btn" type="button" onclick="changeQty('${p.id}', -1)" aria-label="Disminuir cantidad">−</button>
              <span class="qty-val">${p.qty}</span>
              <button class="qty-btn" type="button" onclick="changeQty('${p.id}', 1)" aria-label="Aumentar cantidad">+</button>
            </div>
            <div class="prod-price">${fmt(p.price * p.qty)}</div>
            <button class="trash-btn" type="button" onclick="removeItem('${p.id}')" aria-label="Eliminar producto">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('');
    }
  
    function renderSummary() {
      const sub  = getSubtotal();
      const ship = getShippingCost();
      const disc = getDiscount();
      const tot  = getTotal();
  
      $('subtotalVal').textContent  = fmt(sub);
      $('shippingVal1').textContent = fmt(ship);
      $('totalVal').textContent     = fmt(tot);
  
      const discRow = $('discountRow');
      if (disc > 0) {
        discRow.classList.add('show');
        $('discountVal').textContent = '-' + fmt(disc);
      } else {
        discRow.classList.remove('show');
      }
  
      /* Panel 2 */
      $('p2-subtotal').textContent = fmt(sub);
      $('p2-shipping').textContent = fmt(ship);
      $('p2-total').textContent    = fmt(tot);
  
      const p2Row = $('p2-discRow');
      if (disc > 0) {
        p2Row.classList.add('show');
        $('p2-disc').textContent = '-' + fmt(disc);
      } else {
        p2Row.classList.remove('show');
      }
  
      /* Active coupon pill */
      const active = $('couponActive');
      const tag = $('couponTag');
      if (state.coupon && COUPONS[state.coupon]) {
        active.classList.add('show');
        tag.textContent = state.coupon;
      } else {
        active.classList.remove('show');
      }
    }
  
    function renderMini() {
      const el = $('mini-items');
      const products = getCartProducts();
      el.innerHTML = products.map(p => `
        <div class="mini-item">
          <div class="mini-emoji">${p.img
            ? `<img src="${p.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`
            : (p.emoji || '📦')}</div>
          <div class="mini-name">${p.name} <span>×${p.qty}</span></div>
          <div class="mini-price">${fmt(p.price * p.qty)}</div>
        </div>
      `).join('');
    }
  
    function renderAddress() {
      $('addrLabelView').textContent  = state.address.label;
      $('addrStreetView').textContent = state.address.street;
      $('addrCityView').textContent   = state.address.city;
    }
  
    /* ═══════════════════════════════════════════════
       CART ACTIONS (todas pasan por LocalCart)
       ═══════════════════════════════════════════════ */

    function changeQty(id, delta) {
      const items = window.LocalCart.get();
      const item = items.find(c => c.id === id);
      if (!item) return;
      const next = (Number(item.qty) || 1) + delta;
      if (next < 1) {
        removeItem(id);
        return;
      }
      if (next > 99) return;
      window.LocalCart.updateQty(id, next);
      // No llamamos renderAll() aquí: el listener 'cart:changed' lo hace.
    }

    function removeItem(id) {
      const row = document.querySelector(`.product-row[data-id="${id}"]`);
      if (row) {
        row.classList.add('removing');
        setTimeout(() => actuallyRemove(id), 220);
      } else {
        actuallyRemove(id);
      }
    }

    function actuallyRemove(id) {
      const items = window.LocalCart.get();
      const removed = items.find(c => c.id === id);
      window.LocalCart.remove(id);
      if (removed) toast(`${removed.name} eliminado del carrito`, 'info');
    }

    /* Añadir desde el modal del CATÁLOGO interno (panadería).
       Prefijamos el id con 'cat-' para no chocar con productos del marketplace. */
    function addToCart(id) {
      const product = productById(id);
      if (!product) return;
      window.LocalCart.add({
        id:    'cat-' + product.id,
        name:  product.name,
        desc:  product.desc,
        price: product.price,
        emoji: product.emoji,
      }, 1);
      toast(`${product.name} agregado al carrito`, 'success');
    }
  
    /* ═══════════════════════════════════════════════
       COUPON
       ═══════════════════════════════════════════════ */
  
    function applyCoupon() {
      const input = $('couponInput');
      const code  = input.value.trim().toUpperCase();
      const msg   = $('couponMsg');
  
      if (!code) {
        showCouponMsg('Escribe un código', 'err');
        return;
      }
  
      const coupon = COUPONS[code];
      if (!coupon) {
        state.coupon = '';
        showCouponMsg('✗ Código inválido. Intenta DESCUENTO10, ENVIOGRATIS o BIENVENIDO', 'err');
        saveState();
        renderSummary();
        return;
      }
  
      state.coupon = code;
      showCouponMsg('✓ Cupón aplicado: ' + coupon.label, 'ok');
      input.value = '';
      saveState();
      renderSummary();
      toast('Cupón ' + code + ' aplicado', 'success');
    }
  
    function removeCoupon() {
      state.coupon = '';
      showCouponMsg('', '');
      saveState();
      renderSummary();
      toast('Cupón eliminado', 'info');
    }
  
    function showCouponMsg(text, kind) {
      const msg = $('couponMsg');
      msg.textContent = text;
      msg.className = 'coupon-msg' + (kind ? ' ' + kind : '');
      if (text && kind === 'ok') {
        setTimeout(() => { if (msg.textContent === text) msg.className = 'coupon-msg'; }, 4000);
      }
    }
  
    /* ═══════════════════════════════════════════════
       PAYMENT / SHIPPING
       ═══════════════════════════════════════════════ */
  
    function selectPM(n) {
      state.paymentMode = n;
      [1, 2].forEach(i => $('pm' + i).classList.toggle('selected', i === n));
      $('card-fields').style.display = n === 1 ? 'block' : 'none';
      saveState();
    }
  
    function selectSH(n) {
      state.shippingMode = n;
      [1, 2].forEach(i => $('sh' + i).classList.toggle('selected', i === n));
      saveState();
      renderSummary();
    }
  
    /* ═══════════════════════════════════════════════
       INPUT FORMATTERS
       ═══════════════════════════════════════════════ */
  
    function fmtCard(el) {
      const v = el.value.replace(/\D/g, '').substring(0, 16);
      el.value = v.replace(/(.{4})/g, '$1 ').trim();
      detectCardBrand(v);
      clearError('field-num');
    }
  
    function fmtExp(el) {
      let v = el.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 3) v = v.substring(0, 2) + '/' + v.substring(2);
      el.value = v;
      clearError('field-exp');
    }
  
    function detectCardBrand(digits) {
      const tag = $('cardBrand');
      if (!tag) return;
      let brand = '';
      if (/^4/.test(digits))                  brand = 'VISA';
      else if (/^(5[1-5]|2[2-7])/.test(digits)) brand = 'MC';
      else if (/^3[47]/.test(digits))         brand = 'AMEX';
      else if (/^6(?:011|5)/.test(digits))    brand = 'DISC';
  
      if (brand && digits.length >= 2) {
        tag.textContent = brand;
        tag.classList.add('show');
      } else {
        tag.classList.remove('show');
      }
    }
  
    /* ═══════════════════════════════════════════════
       STEPPER
       ═══════════════════════════════════════════════ */
  
    function goStep(n) {
      if (n === 2 && getCartProducts().length === 0) {
        toast('Tu carrito está vacío', 'error');
        return;
      }
  
      [1, 2, 3].forEach(i => {
        const panel = $('panel' + i);
        if (panel) panel.classList.toggle('active', i === n);
  
        const tab = $('tab' + i);
        const sn  = $('sn' + i);
        if (!tab || !sn) return;
  
        tab.classList.remove('active', 'done');
        if (i === n)      tab.classList.add('active');
        else if (i < n)   tab.classList.add('done');
  
        if (i < n) {
          sn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/></svg>`;
        } else {
          sn.textContent = i;
        }
      });
  
      /* Connector fill */
      const conn = $('connector1');
      if (conn) conn.style.width = (n >= 2 ? '100%' : '0');
  
      if (n === 2) {
        renderMini();
        renderSummary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (n === 3) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  
    /* ═══════════════════════════════════════════════
       ORDER CONFIRMATION + VALIDATION
       ═══════════════════════════════════════════════ */
  
    function validateCard() {
      const num  = $('cardNum').value.replace(/\s/g, '');
      const name = $('cardName').value.trim();
      const exp  = $('cardExp').value;
      const cvv  = $('cardCvv').value;
  
      let ok = true;
  
      if (!/^\d{15,16}$/.test(num)) {
        setError('field-num', 'Ingresa un número de tarjeta válido (15–16 dígitos)');
        ok = false;
      } else if (typeof lmLuhnCheck === 'function' && !lmLuhnCheck(num)) {
        setError('field-num', 'Número de tarjeta inválido');
        ok = false;
      }
      if (name.length < 3) {
        setError('field-name', 'Ingresa el nombre del titular');
        ok = false;
      }
      const expMatch = exp.match(/^(\d{2})\/(\d{2})$/);
      if (!expMatch) {
        setError('field-exp', 'Formato MM/AA');
        ok = false;
      } else {
        const mm = parseInt(expMatch[1], 10);
        const yy = parseInt(expMatch[2], 10);
        const now = new Date();
        const curYY = now.getFullYear() % 100;
        const curMM = now.getMonth() + 1;
        if (mm < 1 || mm > 12) {
          setError('field-exp', 'Mes inválido');
          ok = false;
        } else if (yy < curYY || (yy === curYY && mm < curMM)) {
          setError('field-exp', 'Tarjeta vencida');
          ok = false;
        }
      }
      if (!/^\d{3,4}$/.test(cvv)) {
        setError('field-cvv', 'CVV inválido');
        ok = false;
      }
  
      return ok;
    }
  
    function setError(fieldId, msg) {
      const f = $(fieldId);
      if (!f) return;
      f.classList.add('error');
      const err = f.querySelector('.field-error');
      if (err) err.textContent = msg;
    }
  
    function clearError(fieldId) {
      const f = $(fieldId);
      if (!f) return;
      f.classList.remove('error');
    }
  
    function confirmOrder() {
      if (state.paymentMode === 1 && !validateCard()) {
        toast('Revisa los datos de tu tarjeta', 'error');
        return;
      }

      if (getCartProducts().length === 0) {
        toast('Tu carrito está vacío', 'error');
        return;
      }

      /* Generamos el ID UNA sola vez para que coincida en
         pantalla y en la entrega creada. */
      const num = Math.floor(100000 + Math.random() * 900000);

      /* ── INTEGRACIÓN CON ENTREGAS ──
         Crear la entrega ANTES de limpiar el carrito,
         porque buildDeliveryFromCheckout() lee del cart. */
      let createdDelivery = null;
      try {
        createdDelivery = createDeliveryFromOrder(num);
      } catch (e) {
        console.warn('[Checkout] No se pudo crear la entrega:', e);
      }

      /* ── GUARDAR EN HISTORIAL ── */
      try {
        const products = getCartProducts();
        if (typeof lmSaveOrder === 'function') {
          lmSaveOrder({
            items:           products.map(p => ({ name: p.name, emoji: p.emoji, qty: p.qty, price: p.price })),
            total:           getTotal(),
            shipping:        SHIPPING[state.shippingMode].eta,
            payment:         state.paymentMode === 1 ? 'Tarjeta' : 'Efectivo',
            address:         state.address.label + ' – ' + state.address.street,
            driver:          createdDelivery ? createdDelivery.driver : null,
            // El pedido está confirmado pero NO entregado; Entregas.js actualizará el estado
            status:          'confirmado',
            deliveryOrderId: createdDelivery ? createdDelivery.orderId : String(num),
          });
        }
      } catch (e) { console.warn('[Checkout] No se pudo guardar historial:', e); }

      $('orderNum').textContent = '#' + num;
      $('etaText').textContent  = SHIPPING[state.shippingMode].eta;

      document.querySelector('.stepper').style.display = 'none';

      /* Mark step 2 as done in case user comes back */
      const tab2 = $('tab2');
      if (tab2) { tab2.classList.remove('active'); tab2.classList.add('done'); }

      /* Clear cart on confirm */
      window.LocalCart.clear();
      state.coupon = '';
      saveState();

      goStep(3);
      toast('¡Pedido confirmado!', 'success');

      /* Mensaje secundario invitando a ver el seguimiento */
      if (createdDelivery) {
        setTimeout(() => {
          toast('📦 Sigue tu entrega en la sección "Entregas"', 'info');
        }, 1400);
      }
    }
  
    /* ═══════════════════════════════════════════════
       RESET
       ═══════════════════════════════════════════════ */
  
    function resetAll() {
      state = {
        coupon:       '',
        shippingMode: 1,
        paymentMode:  1,
        address:      { ...DEFAULT_ADDRESS },
      };
      window.LocalCart.clear();
      saveState();
  
      $('couponInput').value = '';
      showCouponMsg('', '');
  
      /* Reset card fields */
      ['cardNum','cardName','cardExp','cardCvv'].forEach(id => {
        const el = $(id); if (el) el.value = '';
      });
      ['field-num','field-name','field-exp','field-cvv'].forEach(clearError);
      $('cardBrand').classList.remove('show');
  
      /* Reset payment + shipping selectors */
      selectPM(1);
      selectSH(1);
  
      document.querySelector('.stepper').style.display = '';
      goStep(1);
      renderAll();
    }
  
    /* ═══════════════════════════════════════════════
       CATALOG MODAL
       ═══════════════════════════════════════════════ */
  
    function openCatalog() {
      renderCatalog();
      $('catalogModal').classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  
    function closeCatalog() {
      $('catalogModal').classList.remove('show');
      document.body.style.overflow = '';
    }
  
    function catalogBgClick(e) {
      if (e.target.id === 'catalogModal') closeCatalog();
    }
  
    function renderCatalog() {
      const grid = $('catalogList');
      const cartItems = window.LocalCart.get();
      grid.innerHTML = CATALOG.map(p => {
        const cartId = 'cat-' + p.id;
        const inCart = cartItems.find(c => c.id === cartId);
        return `
          <div class="cat-item ${inCart ? 'in-cart' : ''}">
            <div class="cat-img">${p.emoji}</div>
            <div class="cat-info">
              <div class="cat-name">${p.name}</div>
              <div class="cat-desc">${p.desc}</div>
              <div class="cat-price">${fmt(p.price)}</div>
            </div>
            ${inCart
              ? `<div class="cat-qty">
                   <button class="qty-btn" type="button" onclick="changeQty('${cartId}', -1)" aria-label="Disminuir">−</button>
                   <span class="qty-val">${inCart.qty}</span>
                   <button class="qty-btn" type="button" onclick="changeQty('${cartId}', 1)" aria-label="Aumentar">+</button>
                 </div>`
              : `<button class="cat-add" type="button" onclick="addToCart(${p.id})" aria-label="Agregar al carrito">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round">
                     <line x1="12" y1="5" x2="12" y2="19"/>
                     <line x1="5" y1="12" x2="19" y2="12"/>
                   </svg>
                 </button>`
            }
          </div>
        `;
      }).join('');
    }
  
    /* ═══════════════════════════════════════════════
       ADDRESS MODAL
       ═══════════════════════════════════════════════ */
  
    function openAddress() {
      $('addrLabel').value  = state.address.label;
      $('addrStreet').value = state.address.street;
      $('addrCity').value   = state.address.city;
      $('addressModal').classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  
    function closeAddress() {
      $('addressModal').classList.remove('show');
      document.body.style.overflow = '';
    }
  
    function addressBgClick(e) {
      if (e.target.id === 'addressModal') closeAddress();
    }
  
    function saveAddress() {
      const label  = $('addrLabel').value.trim()  || 'Mi dirección';
      const street = $('addrStreet').value.trim();
      const city   = $('addrCity').value.trim();
  
      if (!street || !city) {
        toast('Completa la calle y la ciudad', 'error');
        return;
      }
  
      state.address = { label, street, city };
      saveState();
      renderAddress();
      closeAddress();
      toast('Dirección actualizada', 'success');
    }
  
    /* ═══════════════════════════════════════════════
       TOAST
       ═══════════════════════════════════════════════ */
  
    function toast(message, kind = 'info') {
      const wrap = $('toasts');
      if (!wrap) return;
  
      const el = document.createElement('div');
      el.className = 'toast ' + kind;
  
      const icons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
        info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      };
  
      el.innerHTML = (icons[kind] || icons.info) + '<span>' + message + '</span>';
      wrap.appendChild(el);
  
      setTimeout(() => {
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 250);
      }, 2800);
    }
  
    /* ═══════════════════════════════════════════════
       INPUT EVENT BINDINGS (clear errors on type)
       ═══════════════════════════════════════════════ */
  
    function bindFieldErrors() {
      const map = {
        cardNum: 'field-num',
        cardName: 'field-name',
        cardExp: 'field-exp',
        cardCvv: 'field-cvv',
      };
      Object.entries(map).forEach(([id, fid]) => {
        const el = $(id);
        if (el) el.addEventListener('input', () => clearError(fid));
      });
    }
  
    function bindKeyboardShortcuts() {
      /* Enter on coupon input */
      const coupon = $('couponInput');
      if (coupon) {
        coupon.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
        });
      }
      /* Escape closes modals */
      document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if ($('catalogModal').classList.contains('show')) closeCatalog();
        if ($('addressModal').classList.contains('show')) closeAddress();
      });
    }
  
    /* ═══════════════════════════════════════════════
       INIT
       ═══════════════════════════════════════════════ */
  
    function init() {
      loadState();

      /* Sync UI to loaded state */
      [1, 2].forEach(i => $('pm' + i).classList.toggle('selected', i === state.paymentMode));
      [1, 2].forEach(i => $('sh' + i).classList.toggle('selected', i === state.shippingMode));
      $('card-fields').style.display = state.paymentMode === 1 ? 'block' : 'none';

      renderAll();
      bindFieldErrors();
      bindKeyboardShortcuts();

      /* Re-renderiza cuando el carrito cambie (misma página o entre pestañas) */
      window.addEventListener('cart:changed', () => {
        renderAll();
        // Si el modal del catálogo está abierto, también lo refrescamos
        if ($('catalogModal').classList.contains('show')) renderCatalog();
      });
    }
  
    /* ─── Expose for inline onclick ─── */
    Object.assign(window, {
      goStep, changeQty, removeItem, addToCart,
      applyCoupon, removeCoupon,
      selectPM, selectSH, fmtCard, fmtExp,
      confirmOrder, resetAll,
      openCatalog, closeCatalog, catalogBgClick,
      openAddress, closeAddress, addressBgClick, saveAddress,
      goToDeliveries,
    });
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();