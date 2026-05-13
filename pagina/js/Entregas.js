/* ═══════════════════════════════════════════════════════════
   LocalMarket · Entregas (Tracking)
   - Persistencia 100% en localStorage (sin backend)
   - Auto-avance de estados según el tiempo transcurrido
   - Mapa SVG animado con repartidor en movimiento
   - API global: window.LocalDeliveries.create(orderData)
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────
     CONFIG
  ────────────────────────────────────────── */
  const STORAGE_KEY  = 'localmarket_deliveries';
  const ACTIVE_KEY   = 'localmarket_deliveries_active';

  // Duración acumulada de cada fase desde la creación del pedido.
  // Estas son las mismas timestamps que usan TANTO el ETA card
  // COMO el timeline de progreso → una sola fuente de verdad.
  const PHASE_MS = {
    confirmado: 0,                    // inmediato
    preparando: 1 * 60 * 1000,        // 1 min  → empieza preparación
    en_camino:  3 * 60 * 1000,        // 3 min  → sale el repartidor
    entregado:  8 * 60 * 1000,        // 8 min  → llega a tu puerta
  };

  // Repartidores: usa el pool compartido de shared.js
  const DRIVERS = typeof LM_DRIVERS !== 'undefined' ? LM_DRIVERS : [];

  /* ──────────────────────────────────────────
     STORAGE HELPERS
  ────────────────────────────────────────── */
  function readAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function writeAll(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[Entregas] No se pudo guardar:', e);
    }
  }

  function getActiveId() {
    return localStorage.getItem(ACTIVE_KEY);
  }
  function setActiveId(id) {
    localStorage.setItem(ACTIVE_KEY, id);
  }

  /* ──────────────────────────────────────────
     UTIL (aliases de shared.js para no duplicar lógica)
  ────────────────────────────────────────── */
  const fmtMoney  = typeof lmFmtMoney  === 'function' ? lmFmtMoney  : n => '$' + Number(n || 0).toFixed(2);
  const fmtTime   = typeof lmFmtTime   === 'function' ? lmFmtTime   : ts => {
    const d = new Date(ts); let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2,'0');
    const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };
  const genOrderId = typeof lmGenOrderId === 'function'
    ? () => lmGenOrderId().replace('LM-','')
    : () => Math.floor(10000 + Math.random() * 90000).toString();
  const pick = typeof lmPickRandom === 'function' ? lmPickRandom : arr => arr[Math.floor(Math.random() * arr.length)];

  /* ──────────────────────────────────────────
     MOTOR DE ESTADOS
     Calcula en qué fase está la entrega según timestamps.
  ────────────────────────────────────────── */
  function computePhase(delivery) {
    if (delivery.forcedStatus === 'entregado') return 'entregado';
    const now = Date.now();
    const created = delivery.createdAt;
    const elapsed = now - created;

    if (elapsed >= PHASE_MS.entregado)  return 'entregado';
    if (elapsed >= PHASE_MS.en_camino)  return 'en_camino';
    if (elapsed >= PHASE_MS.preparando) return 'preparando';
    return 'confirmado';
  }

  function phaseTimestamp(delivery, phase) {
    return delivery.createdAt + (PHASE_MS[phase] || 0);
  }

  function computeEta(delivery) {
    // La misma timestamp que usa el timeline de progreso: fuente única
    const arrival = delivery.createdAt + PHASE_MS.entregado;
    const phase = computePhase(delivery);
    if (phase === 'entregado') return { mins: 0, arrival };
    const remainingMs = Math.max(0, arrival - Date.now());
    const mins = Math.max(1, Math.ceil(remainingMs / 60000));
    return { mins, arrival };
  }

  /* ──────────────────────────────────────────
     CREAR ENTREGA
  ────────────────────────────────────────── */
  function createDelivery(orderData = {}) {
    const items = (orderData.items && orderData.items.length)
      ? orderData.items
      : defaultDemoItems();

    const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
    const shipping = orderData.shipping != null ? Number(orderData.shipping) : 2.50;
    // Descuento del 10% sobre el subtotal (como en la imagen de referencia)
    const discountPct = orderData.discountPct != null ? Number(orderData.discountPct) : 10;
    const discount   = +(subtotal * (discountPct / 100)).toFixed(2);
    const total      = +(subtotal + shipping - discount).toFixed(2);

    // Reparto: 70/20/10 sobre el TOTAL
    const seller   = +(total * 0.70).toFixed(2);
    const courier  = +(total * 0.20).toFixed(2);
    const platform = +(total - seller - courier).toFixed(2); // evita errores de redondeo

    const driver = orderData.driver || pick(DRIVERS);

    const delivery = {
      id:         'ENT-' + Date.now(),
      orderId:    orderData.orderId || genOrderId(),
      createdAt:  Date.now(),
      forcedStatus: null,
      items, subtotal, shipping, discount, discountPct, total,
      driver: {
        ...driver,
        deliveriesToday: 8 + Math.floor(Math.random() * 12),
      },
      address: orderData.address || {
        label: 'Mi Casa',
        street: 'Calle Principal #123, Apt 4B',
        neighborhood: 'Colonia Centro',
        city: 'Ciudad, CP 12345',
        reference: 'Edificio azul, portón negro',
      },
      income: { seller, courier, platform },
    };

    const all = readAll();
    all.unshift(delivery);
    writeAll(all);
    setActiveId(delivery.id);
    return delivery;
  }

  function defaultDemoItems() {
    return [
      { id: 'demo-1', name: 'Pan Artesanal Integral', seller: 'Panadería Don José', price: 4.50, qty: 2 },
      { id: 'demo-2', name: 'Café Premium 250g',      seller: 'Café del Barrio',    price: 8.75, qty: 1 },
    ];
  }

  /* ──────────────────────────────────────────
     OBTENER ENTREGA ACTIVA
  ────────────────────────────────────────── */
  function getActiveDelivery() {
    const all = readAll();
    if (!all.length) return null;
    const id = getActiveId();
    const found = all.find(d => d.id === id);
    if (found) return found;
    setActiveId(all[0].id);
    return all[0];
  }

  /* ──────────────────────────────────────────
     RENDER PRINCIPAL
  ────────────────────────────────────────── */
  function render() {
    const all = readAll();
    const tabsEl = document.getElementById('orders-tabs');
    const content = document.getElementById('del-content');

    // === Estado vacío ===
    if (!all.length) {
      tabsEl.innerHTML = '';
      content.innerHTML = renderEmptyState();
      // Header en modo "vacío"
      document.getElementById('del-order-id').textContent = '#—';
      document.getElementById('del-live-state').textContent = 'Sin entregas activas';
      document.getElementById('del-live-pill').style.display = 'none';
      // Botón crear primera demo
      const btn = document.getElementById('es-create-btn');
      if (btn) btn.addEventListener('click', () => {
        createDelivery();
        showToast('¡Entrega de demostración creada!');
        render();
      });
      return;
    }

    // === Render tabs si hay >1 ===
    renderTabs(all);

    const active = getActiveDelivery();
    const phase  = computePhase(active);

    // Header
    document.getElementById('del-order-id').textContent = '#' + active.orderId;
    const livePill = document.getElementById('del-live-pill');
    if (phase === 'entregado') {
      document.getElementById('del-live-state').textContent = 'Pedido completado';
      livePill.style.display = 'none';
    } else {
      document.getElementById('del-live-state').textContent = 'En tiempo real';
      livePill.style.display = '';
    }

    // Contenido principal
    content.innerHTML = `
      <div class="del-grid">
        <!-- LEFT COLUMN -->
        <div>
          ${renderEtaCard(active, phase)}
          ${renderMapCard(active, phase)}
          ${renderProgressCard(active, phase)}
        </div>
        <!-- RIGHT COLUMN -->
        <div>
          ${renderDriverCard(active, phase)}
          ${renderOrderDetails(active)}
          ${renderAddressCard(active)}
          ${renderSupportCard()}
          ${(typeof lmGetUser === 'function' && lmGetUser().role !== 'buyer') ? renderIncomeCard(active) : ''}
        </div>
      </div>
    `;

    // Iniciar animación del repartidor en el mapa
    animateCourierMarker(phase);
  }

  /* ──────────────────────────────────────────
     EMPTY STATE
  ────────────────────────────────────────── */
  function renderEmptyState() {
    return `
      <div class="empty-state">
        <span class="es-emoji">📦</span>
        <h2>Aún no tienes entregas activas</h2>
        <p>Cuando completes una compra en el marketplace, podrás seguir tu pedido en tiempo real desde aquí.</p>
        <div class="es-btns">
          <button class="btn-primary" id="es-create-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Crear entrega demo
          </button>
          <a class="btn-ghost" href="../html/market.html">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            Ir al marketplace
          </a>
        </div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────
     TABS
  ────────────────────────────────────────── */
  function renderTabs(all) {
    const tabsEl = document.getElementById('orders-tabs');
    if (all.length <= 1) { tabsEl.innerHTML = ''; return; }
    const activeId = getActiveId();
    tabsEl.innerHTML = all.map(d => {
      const phase = computePhase(d);
      const stateLabel = ({
        confirmado: 'Confirmado',
        preparando: 'Preparando',
        en_camino:  'En camino',
        entregado:  'Entregado',
      })[phase];
      return `
        <button class="order-tab ${d.id === activeId ? 'active' : ''} s-${phase}"
                data-id="${d.id}">
          <span class="tab-status"></span>
          Pedido #${d.orderId} · ${stateLabel}
        </button>
      `;
    }).join('');
    tabsEl.querySelectorAll('.order-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        setActiveId(btn.dataset.id);
        render();
      });
    });
  }

  /* ──────────────────────────────────────────
     ETA CARD (gradiente morado)
  ────────────────────────────────────────── */
  function renderEtaCard(d, phase) {
    const eta = computeEta(d);
    const isDelivered = phase === 'entregado';

    const titleLabel = isDelivered ? 'Pedido entregado' : 'Tiempo estimado de llegada';
    const timeBlock  = isDelivered
      ? `<div class="eta-time">¡Listo!</div>`
      : `<div class="eta-time">${eta.mins} ${eta.mins === 1 ? 'minuto' : 'minutos'}</div>`;

    const arrivalBlock = isDelivered
      ? `
        <div class="eta-arrival-block">
          <div class="small">Entregado a las</div>
          <div class="big">${fmtTime(eta.arrival)}</div>
        </div>`
      : `
        <div class="eta-arrival-block">
          <div class="small">Llegada estimada</div>
          <div class="big">${fmtTime(eta.arrival)}</div>
        </div>`;

    const infoBand = isDelivered
      ? `
        <div class="eta-info-band">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>
          ¡Tu pedido fue entregado con éxito! Esperamos lo disfrutes.
        </div>`
      : `
        <div class="eta-info-band">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          ETA actualizado automáticamente según condiciones de tráfico
        </div>`;

    return `
      <div class="eta-card ${isDelivered ? 'delivered' : ''}">
        <div class="eta-top">
          <div class="eta-left">
            <div class="eta-icon-circle">
              ${isDelivered
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'}
            </div>
            <div>
              <div class="eta-label">${titleLabel}</div>
              ${timeBlock}
            </div>
          </div>
          ${arrivalBlock}
        </div>
        ${infoBand}
      </div>
    `;
  }

  /* ──────────────────────────────────────────
     MAPA INTERACTIVO (SVG animado)
  ────────────────────────────────────────── */
  function renderMapCard(d, phase) {
    return `
      <div class="map-card">
        <div class="map-canvas">
          <!-- Fondo del mapa -->
          <svg class="map-svg" viewBox="0 0 700 400" preserveAspectRatio="xMidYMid slice"
               xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(124,58,237,0.06)" stroke-width="1"/>
              </pattern>
              <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"  stop-color="#eef2ff"/>
                <stop offset="50%" stop-color="#f5f3ff"/>
                <stop offset="100%" stop-color="#ecfeff"/>
              </linearGradient>
            </defs>
            <rect width="700" height="400" fill="url(#bgGrad)"/>
            <rect width="700" height="400" fill="url(#grid)"/>

            <!-- Calles "blandas" decorativas -->
            <path d="M -20 80 Q 200 60 380 120 T 720 100" stroke="rgba(255,255,255,0.7)" stroke-width="14" fill="none"/>
            <path d="M 100 -10 Q 130 150 90 250 T 140 420" stroke="rgba(255,255,255,0.7)" stroke-width="12" fill="none"/>
            <path d="M -20 320 Q 150 280 300 320 T 720 300" stroke="rgba(255,255,255,0.7)" stroke-width="12" fill="none"/>
            <path d="M 540 -10 Q 520 120 580 220 T 540 420" stroke="rgba(255,255,255,0.7)" stroke-width="12" fill="none"/>

            <!-- Manzanas decorativas -->
            <rect x="170" y="100"  width="120" height="80"  rx="6" fill="rgba(255,255,255,0.55)"/>
            <rect x="320" y="160"  width="140" height="90"  rx="6" fill="rgba(255,255,255,0.55)"/>
            <rect x="180" y="220"  width="110" height="80"  rx="6" fill="rgba(255,255,255,0.55)"/>
            <rect x="430" y="80"   width="100" height="60"  rx="6" fill="rgba(255,255,255,0.55)"/>
            <rect x="480" y="270"  width="120" height="80"  rx="6" fill="rgba(255,255,255,0.55)"/>

            <!-- RUTA del repartidor (color por tramo) -->
            <!-- Tramo 1 (verde - fluido) -->
            <path id="route-seg-1" d="M 90 320 Q 160 290 230 280" stroke="#22c55e" stroke-width="5" fill="none" stroke-linecap="round"/>
            <!-- Tramo 2 (amarillo - moderado) -->
            <path id="route-seg-2" d="M 230 280 Q 320 240 380 200" stroke="#f59e0b" stroke-width="5" fill="none" stroke-linecap="round"/>
            <!-- Tramo 3 (rojo - pesado) -->
            <path id="route-seg-3" d="M 380 200 Q 470 180 560 160" stroke="#ef4444" stroke-width="5" fill="none" stroke-linecap="round"/>

            <!-- Ruta completa (invisible) para animación del repartidor -->
            <path id="full-route"
                  d="M 90 320 Q 160 290 230 280 Q 320 240 380 200 Q 470 180 560 160"
                  fill="none" stroke="transparent"/>

            <!-- Marcador ORIGEN (tienda) -->
            <g transform="translate(90,320)">
              <circle r="14" fill="white" stroke="#7c3aed" stroke-width="3"/>
              <circle r="6"  fill="#7c3aed"/>
              <text y="-22" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="11" font-weight="700" fill="#374151">Tienda</text>
            </g>

            <!-- Marcador DESTINO (casa del cliente) -->
            <g transform="translate(560,160)">
              <circle r="14" fill="white" stroke="#ef4444" stroke-width="3"/>
              <path d="M -5 -2 L 0 -7 L 5 -2 L 5 4 L -5 4 Z" fill="#ef4444"/>
              <text y="-24" text-anchor="middle" font-family="Plus Jakarta Sans" font-size="11" font-weight="700" fill="#374151">Tu ubicación</text>
            </g>

            <!-- MARCADOR DEL REPARTIDOR (se anima por JS) -->
            <g id="courier-marker" transform="translate(90,320)">
              <!-- Aura pulsante -->
              <circle r="18" fill="rgba(79,110,247,0.25)">
                <animate attributeName="r" values="14;22;14" dur="1.6s" repeatCount="indefinite"/>
                <animate attributeName="fill-opacity" values="0.4;0;0.4" dur="1.6s" repeatCount="indefinite"/>
              </circle>
              <circle r="12" fill="#4f6ef7" stroke="white" stroke-width="3"/>
              <!-- Icono de moto -->
              <g transform="translate(-6,-6) scale(0.5)" fill="white">
                <path d="M5 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm14 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 4l3 3-2 2 3 3h3v2h-4l-3-3-3 4-3-3 3-2-2-3 3-3z"/>
              </g>
            </g>
          </svg>

          <!-- Tarjeta de tráfico -->
          <div class="traffic-card">
            <h4>Estado del Tráfico:</h4>
            <div class="traffic-row">
              <span class="traffic-dot green"></span>
              <div>
                <span class="name">Av. Principal</span>
                <span class="state">Fluido</span>
              </div>
            </div>
            <div class="traffic-row">
              <span class="traffic-dot yellow"></span>
              <div>
                <span class="name">Calle 5ta</span>
                <span class="state">Moderado</span>
              </div>
            </div>
            <div class="traffic-row">
              <span class="traffic-dot red"></span>
              <div>
                <span class="name">Intersección Centro</span>
                <span class="state">Pesado</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ruta activa -->
        <div class="route-bar">
          <div class="route-info">
            <div class="ri-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </div>
            <div>
              <div class="ri-title">Ruta Activa</div>
              <div class="ri-sub">3.2 km · Vía Av. Principal</div>
            </div>
          </div>
          <div class="route-traffic-meter">
            <div class="rtm-label">Tráfico</div>
            <div class="rtm-bars">
              <span class="b-on green"></span>
              <span class="b-on green"></span>
              <span class="b-on yellow"></span>
              <span></span>
            </div>
          </div>
        </div>

        <!-- Leyenda -->
        <div class="map-legend">
          <span><i class="green"></i> Verde: Fluido</span>
          <span><i class="yellow"></i> Amarillo: Moderado</span>
          <span><i class="red"></i> Rojo: Pesado</span>
        </div>
      </div>
    `;
  }

  /* Anima el marker del repartidor a lo largo de la ruta SVG */
  function animateCourierMarker(phase) {
    const path   = document.getElementById('full-route');
    const marker = document.getElementById('courier-marker');
    if (!path || !marker) return;

    const total = path.getTotalLength();

    // Posición según fase
    const positions = {
      confirmado: 0,
      preparando: 0.05,
      en_camino:  0.5,   // arrancará desde aquí y avanzará
      entregado:  1,
    };

    cancelAnim();
    if (phase !== 'en_camino') {
      const p = path.getPointAtLength(total * positions[phase]);
      marker.setAttribute('transform', `translate(${p.x},${p.y})`);
      return;
    }

    // En camino: animación cíclica para sensación de avance
    let start = null;
    const duration = 8000; // 8s un ciclo
    function step(ts) {
      if (!start) start = ts;
      const t = ((ts - start) % duration) / duration;
      // mapeamos t (0→1) al rango 0.45 → 0.95
      const lenT = 0.45 + t * 0.5;
      const p = path.getPointAtLength(total * lenT);
      marker.setAttribute('transform', `translate(${p.x},${p.y})`);
      if (currentAnim === step) requestAnimationFrame(step);
    }
    cancelAnim();
    currentAnim = step;
    requestAnimationFrame(step);
  }
  let currentAnim = null;
  function cancelAnim() { currentAnim = null; }

  /* ──────────────────────────────────────────
     PROGRESS TIMELINE
  ────────────────────────────────────────── */
  function renderProgressCard(d, phase) {
    const order = ['confirmado', 'preparando', 'en_camino', 'entregado'];
    const idxNow = order.indexOf(phase);

    const labels = {
      confirmado: 'Pedido Confirmado',
      preparando: 'Preparando',
      en_camino:  'En Camino',
      entregado:  'Entregado',
    };
    const icons = {
      confirmado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>',
      preparando: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>',
      en_camino:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      entregado:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    };

    const stepHtml = order.map((s, i) => {
      let cls;
      if (i < idxNow) cls = 'done';
      else if (i === idxNow) cls = phase === 'entregado' ? 'done' : 'now';
      else cls = 'pending';

      const time = (cls === 'done' || cls === 'now')
        ? fmtTime(phaseTimestamp(d, s))
        : 'Estimado: ' + fmtTime(phaseTimestamp(d, s));

      return `
        <div class="tl-step ${cls}">
          <div class="tl-circle">${icons[s]}</div>
          <div class="tl-name">${labels[s]}</div>
          <div class="tl-time">${time}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="progress-card">
        <h3>Progreso de la Entrega</h3>
        <div class="timeline">${stepHtml}</div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────
     SIDEBAR · DRIVER
  ────────────────────────────────────────── */
  function renderDriverCard(d, phase) {
    const drv = d.driver;
    const stars = '★'.repeat(Math.round(drv.rating)) + '☆'.repeat(5 - Math.round(drv.rating));
    const isDelivered = phase === 'entregado';

    return `
      <div class="side-card">
        <h3>Tu Repartidor</h3>
        <div class="driver-row">
          <div class="driver-avatar">
            ${drv.avatar ? `<img src="${drv.avatar}" alt="${drv.name}" onerror="this.replaceWith(Object.assign(document.createTextNode('${drv.initials}'), {}))"/>` : drv.initials}
          </div>
          <div class="driver-info">
            <div class="name">${drv.name}</div>
            <div class="driver-rating">
              <span class="stars">${stars}</span>
              <span>${drv.rating} (${drv.reviews})</span>
            </div>
          </div>
        </div>
        <div class="driver-stats">
          <div class="ds-row">
            <span class="ds-label">Entregas hoy</span>
            <span class="ds-val">${drv.deliveriesToday} pedidos</span>
          </div>
          <div class="ds-row">
            <span class="ds-label">Vehículo</span>
            <span class="ds-val">${drv.vehicle}</span>
          </div>
        </div>
        <div class="driver-actions">
          <button class="btn call" ${isDelivered ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''} onclick="window.LocalDeliveries._call()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Llamar
          </button>
          <button class="btn chat" onclick='window.LocalDeliveries._chat(${JSON.stringify(drv.name)})'>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Chatear con repartidor
          </button>
        </div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────
     SIDEBAR · ORDER DETAILS
  ────────────────────────────────────────── */
  function renderOrderDetails(d) {
    // Vendedores únicos para mostrar botones de chat por vendedor
    const uniqueSellers = [...new Set(d.items.map(it => it.seller).filter(Boolean))];

    const itemsHtml = d.items.map(it => `
      <div class="order-item">
        <div class="oi-info">
          <div class="oi-name">${it.name}</div>
          <div class="oi-seller">${it.seller || ''}</div>
        </div>
        <div class="oi-meta">
          <div class="oi-qty">x${it.qty || 1}</div>
          <div class="oi-price">${fmtMoney((it.price || 0) * (it.qty || 1))}</div>
        </div>
      </div>
    `).join('');

    const sellerBtns = uniqueSellers.map(seller => `
      <button class="btn-seller-chat" onclick='window.LocalDeliveries._chatSeller(${JSON.stringify(seller)})'>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Chatear con ${seller}
      </button>
    `).join('');

    return `
      <div class="side-card">
        <h3>Detalles del Pedido</h3>
        <div class="order-items">${itemsHtml}</div>
        <div class="order-totals">
          <div class="ot-row"><span>Subtotal</span><span>${fmtMoney(d.subtotal)}</span></div>
          <div class="ot-row"><span>Envío</span><span>${fmtMoney(d.shipping)}</span></div>
          ${d.discount > 0
            ? `<div class="ot-row discount"><span>Descuento (${d.discountPct}%)</span><span>-${fmtMoney(d.discount)}</span></div>`
            : ''}
          <div class="ot-divider"></div>
          <div class="ot-row total"><span>Total</span><span>${fmtMoney(d.total)}</span></div>
        </div>
        ${sellerBtns ? `<div class="seller-chat-row">${sellerBtns}</div>` : ''}
      </div>
    `;
  }

  /* ──────────────────────────────────────────
     SIDEBAR · ADDRESS
  ────────────────────────────────────────── */
  function renderAddressCard(d) {
    const a = d.address;
    return `
      <div class="side-card">
        <h3>Dirección de Entrega</h3>
        <div class="address-row">
          <div class="addr-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="addr-text">
            <div class="addr-label">${a.label}</div>
            <div class="addr-line">${a.street}<br>${a.neighborhood}<br>${a.city}</div>
            ${a.reference ? `<div class="addr-ref">Referencia: ${a.reference}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────
     SIDEBAR · SUPPORT
  ────────────────────────────────────────── */
  function renderSupportCard() {
    return `
      <div class="support-card">
        <div class="sc-ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div>
          <h4>¿Necesitas ayuda?</h4>
          <p>Nuestro equipo está disponible 24/7</p>
          <a onclick="window.LocalDeliveries._support()">Contactar Soporte</a>
        </div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────
     SIDEBAR · INCOME SPLIT
  ────────────────────────────────────────── */
  function renderIncomeCard(d) {
    return `
      <div class="side-card">
        <h3>Reparto de Ingresos</h3>
        <div class="income-bar">
          <span class="ib-blue"   style="width:70%"></span>
          <span class="ib-green"  style="width:20%"></span>
          <span class="ib-purple" style="width:10%"></span>
        </div>
        <div class="income-rows">
          <div class="income-row">
            <div class="il-left"><span class="il-dot b-blue"></span>Vendedor (70%)</div>
            <div class="il-amount">${fmtMoney(d.income.seller)}</div>
          </div>
          <div class="income-row">
            <div class="il-left"><span class="il-dot b-green"></span>Repartidor (20%)</div>
            <div class="il-amount">${fmtMoney(d.income.courier)}</div>
          </div>
          <div class="income-row">
            <div class="il-left"><span class="il-dot b-purple"></span>Plataforma (10%)</div>
            <div class="il-amount">${fmtMoney(d.income.platform)}</div>
          </div>
        </div>
        <div class="income-note">
          * Porcentajes base. Pueden variar según categoría, zona u horarios pico.
        </div>
      </div>
    `;
  }

  /* ──────────────────────────────────────────
     TOAST
  ────────────────────────────────────────── */
  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    document.getElementById('toast-msg').textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ──────────────────────────────────────────
     ACCIONES DE LA UI
  ────────────────────────────────────────── */
  function bindHeaderButtons() {
    const newBtn = document.getElementById('btn-new-demo');
    const clearBtn = document.getElementById('btn-clear');
    if (newBtn) newBtn.addEventListener('click', () => {
      const d = createDelivery();
      showToast(`Nueva entrega creada · #${d.orderId}`);
      render();
    });
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (!readAll().length) { showToast('No hay entregas para eliminar'); return; }
      if (confirm('¿Eliminar TODAS las entregas guardadas?')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ACTIVE_KEY);
        cancelAnim();
        showToast('Entregas eliminadas');
        render();
      }
    });
  }

  /* ──────────────────────────────────────────
     LOOP DE ACTUALIZACIÓN (ETA / Fase)
  ────────────────────────────────────────── */
  let lastPhase = null;
  function tick() {
    const all = readAll();
    if (!all.length) return;
    const active = getActiveDelivery();
    if (!active) return;
    const phase = computePhase(active);

    // Si cambió la fase → re-render completo (con notificación)
    if (lastPhase && lastPhase !== phase) {
      const labels = {
        preparando: '🍳 Tu pedido se está preparando',
        en_camino:  '🛵 ¡Tu pedido va en camino!',
        entregado:  '🎉 ¡Tu pedido fue entregado!',
      };
      if (labels[phase]) {
        showToast(labels[phase]);
        if (typeof lmNotify === 'function') {
          lmNotify('LocalMarket', labels[phase].replace(/^[^\s]+\s/, ''));
        }
      }
      // Sincronizar estado en el historial de órdenes
      if (typeof lmUpdateOrderByDelivery === 'function') {
        const statusMap = {
          preparando: 'preparando',
          en_camino:  'en_camino',
          entregado:  'entregado',
        };
        if (statusMap[phase]) lmUpdateOrderByDelivery(active.orderId, statusMap[phase]);
      }
      render();
    } else {
      // Actualización ligera del ETA en la card morada
      const etaCardEl = document.querySelector('.eta-card');
      if (etaCardEl) {
        const eta = computeEta(active);
        const timeEl = etaCardEl.querySelector('.eta-time');
        if (timeEl && phase !== 'entregado') {
          timeEl.textContent = `${eta.mins} ${eta.mins === 1 ? 'minuto' : 'minutos'}`;
        }
      }
    }
    lastPhase = phase;
  }

  /* ──────────────────────────────────────────
     INIT
  ────────────────────────────────────────── */
  function init() {
    bindHeaderButtons();

    // Si nunca se ha visto la página y no hay entregas → crear demo automática
    if (!readAll().length && !sessionStorage.getItem('lm_del_demo_skipped')) {
      createDelivery();
      sessionStorage.setItem('lm_del_demo_skipped', '1');
    }

    render();
    lastPhase = (function () {
      const a = getActiveDelivery();
      return a ? computePhase(a) : null;
    })();
    setInterval(tick, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ──────────────────────────────────────────
     API PÚBLICA (para integrar con otros módulos)
  ────────────────────────────────────────── */
  window.LocalDeliveries = {
    create: createDelivery,
    getAll: readAll,
    getActive: getActiveDelivery,
    setActive: setActiveId,
    clear() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIVE_KEY);
    },
    KEY: STORAGE_KEY,
    // helpers privados que usa el HTML inyectado
    _call() { showToast('Llamando al repartidor…'); },
    _chat(driverName) {
      const name = driverName || getActiveDelivery()?.driver?.name;
      if (name) {
        sessionStorage.setItem('lm_open_chat_seller', name);
        sessionStorage.setItem('lm_open_chat_filter', 'drivers');
        window.location.href = '../html/Chat.html';
      } else {
        window.location.href = '../html/Chat.html';
      }
    },
    _chatSeller(sellerName) {
      if (sellerName) {
        sessionStorage.setItem('lm_open_chat_seller', sellerName);
        sessionStorage.setItem('lm_open_chat_filter', 'sellers');
        window.location.href = '../html/Chat.html';
      } else {
        window.location.href = '../html/Chat.html';
      }
    },
    _support() { showToast('Conectando con soporte 24/7…'); },
  };
})();