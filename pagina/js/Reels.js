/* ═══════════════════════════════════════════════
   LocalMarket · Reels page
   Conectado con LocalCart (cart.js)
   ═══════════════════════════════════════════════ */

/* ══════════════════════════
   DATA - Reels
   Cada reel está vinculado con un producto del marketplace
   (mismos IDs que market.js → buildCartItem usa 'mkt-' + id)
══════════════════════════ */
const reels = [
  {
    id: 1,
    productId: 1,
    img:  "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=900",
    seller: "Panadería Don José",
    sellerAvatar: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=100",
    distance: "0.5 km de ti",
    verified: true,
    caption: "🥖 Pan recién horneado cada mañana con ingredientes 100% naturales. ¡Visítanos!",
    views: "12.4K",
    likes: 248,
    comments: 89,
    shares: 34,
    saves: 56,
    product: {
      id: "mkt-1",
      name: "Pan Artesanal Integral",
      seller: "Panadería Don José",
      desc: "Panadería Don José",
      price: 4.05,
      oldPrice: 4.50,
      discount: "-10%",
      img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400",
      emoji: "🥖",
    },
    sampleComments: [
      { author: "María G.", text: "¡Mi pan favorito! Lo pido cada semana 😍", time: "2h", initial: "M" },
      { author: "Carlos R.", text: "El sabor es increíble, recomendado al 100%", time: "5h", initial: "C" },
      { author: "Sofía L.", text: "¿Hacen entregas a domicilio?", time: "1d", initial: "S" },
    ],
  },
  {
    id: 2,
    productId: 2,
    img:  "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=900",
    seller: "Huerto Verde",
    sellerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    distance: "1.2 km de ti",
    verified: true,
    caption: "🥬 Verduras orgánicas cosechadas hoy. Frescas, locales y sin pesticidas.",
    views: "8.7K",
    likes: 412,
    comments: 56,
    shares: 21,
    saves: 78,
    product: {
      id: "mkt-2",
      name: "Verduras Orgánicas Mix",
      seller: "Huerto Verde",
      desc: "Huerto Verde",
      price: 12.00,
      oldPrice: null,
      discount: null,
      img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
      emoji: "🥬",
    },
    sampleComments: [
      { author: "Ana P.", text: "La calidad es excelente, llegan fresquísimas", time: "3h", initial: "A" },
      { author: "Diego M.", text: "Mi familia ama estas verduras 💚", time: "8h", initial: "D" },
    ],
  },
  {
    id: 3,
    productId: 3,
    img:  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=900",
    seller: "Café del Barrio",
    sellerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    distance: "0.8 km de ti",
    verified: false,
    caption: "☕ Café de especialidad tostado artesanalmente. Notas de chocolate y caramelo ✨",
    views: "15.2K",
    likes: 587,
    comments: 124,
    shares: 67,
    saves: 142,
    product: {
      id: "mkt-3",
      name: "Café Premium 250g",
      seller: "Café del Barrio",
      desc: "Café del Barrio",
      price: 8.75,
      oldPrice: null,
      discount: null,
      img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400",
      emoji: "☕",
    },
    sampleComments: [
      { author: "Luis V.", text: "El mejor café de la zona, sin duda", time: "1h", initial: "L" },
      { author: "Patricia E.", text: "¿Tienen variedad descafeinada?", time: "4h", initial: "P" },
      { author: "Andrés F.", text: "Pedí ayer y llegó perfecto, recomendado ☕", time: "12h", initial: "A" },
    ],
  },
  {
    id: 4,
    productId: 4,
    img:  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=900",
    seller: "Manos Creativas",
    sellerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
    distance: "2.0 km de ti",
    verified: true,
    caption: "🎨 Cada pieza es única, hecha a mano por artesanos locales. ¡Apoya lo nuestro!",
    views: "6.3K",
    likes: 198,
    comments: 42,
    shares: 18,
    saves: 39,
    product: {
      id: "mkt-4",
      name: "Artesanías Decorativas",
      seller: "Manos Creativas",
      desc: "Manos Creativas",
      price: 21.25,
      oldPrice: 25.00,
      discount: "-15%",
      img: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400",
      emoji: "🎨",
    },
    sampleComments: [
      { author: "Elena R.", text: "Hermosos detalles, los compré para regalar 🎁", time: "6h", initial: "E" },
      { author: "Roberto T.", text: "Calidad artesanal, vale cada peso", time: "1d", initial: "R" },
    ],
  },
  {
    id: 5,
    productId: 5,
    img:  "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=900",
    seller: "Panadería Don José",
    sellerAvatar: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=100",
    distance: "0.5 km de ti",
    verified: true,
    caption: "🥐 Croissant hojaldrado de mantequilla pura. ¡Recién salidos del horno!",
    views: "9.8K",
    likes: 356,
    comments: 71,
    shares: 28,
    saves: 92,
    product: {
      id: "mkt-5",
      name: "Croissant de Mantequilla",
      seller: "Panadería Don José",
      desc: "Panadería Don José",
      price: 2.50,
      oldPrice: null,
      discount: null,
      img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
      emoji: "🥐",
    },
    sampleComments: [
      { author: "Carmen Z.", text: "Mi desayuno todos los sábados ☕🥐", time: "30min", initial: "C" },
      { author: "Iván B.", text: "Crocantes por fuera, suaves por dentro. Perfectos.", time: "2h", initial: "I" },
    ],
  },
];

/* ══════════════════════════
   STATE
══════════════════════════ */
const STATE_KEY = 'localmarket_reels_state';

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch { return {}; }
}
function saveState(state) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('No se pudo guardar el estado de reels', e); }
}

let reelsState = loadState();
// reelsState[id] = { liked, saved, following, likes, comments: [{author,text,time,initial}] }

function getReelState(id) {
  if (!reelsState[id]) {
    const reel = reels.find(r => r.id === id);
    reelsState[id] = {
      liked: false,
      saved: false,
      following: false,
      likes: reel ? reel.likes : 0,
      comments: reel ? [...(reel.sampleComments || [])] : [],
    };
  }
  return reelsState[id];
}

let currentIndex = 0;
let activeReelId = reels[0].id;
let volume = 0.6;

/* ══════════════════════════
   RENDER
══════════════════════════ */
function formatNum(n) {
  if (n >= 1000) return (n/1000).toFixed(1).replace('.0','') + 'K';
  return n.toString();
}

function renderReels() {
  const viewport = document.getElementById('reels-viewport');
  viewport.innerHTML = reels.map((r, i) => {
    const st = getReelState(r.id);
    return `
    <article class="reel" data-reel-id="${r.id}" data-index="${i}">

      <img class="reel-bg" src="${r.img}" alt="${r.seller}" loading="lazy">

      <!-- Header -->
      <div class="reel-top">
        <div class="seller-info">
          <div class="seller-avatar" style="background-image:url('${r.sellerAvatar}')"></div>
          <div class="seller-meta">
            <div class="seller-name">
              ${r.seller}
              ${r.verified ? `<span class="verified"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" fill="none" stroke="white" stroke-width="3"/></svg></span>` : ''}
            </div>
            <div class="seller-loc">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${r.distance}
            </div>
          </div>
        </div>
        <button class="follow-btn ${st.following ? 'following' : ''}" data-act="follow" data-id="${r.id}">
          ${st.following ? 'Siguiendo' : 'Seguir'}
        </button>
      </div>

      <!-- Up arrow -->
      <div class="nav-arrows middle-up">
        <button class="arrow-btn" data-act="up" ${i === 0 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
      </div>

      <!-- Action buttons -->
      <div class="reel-actions">
        <div>
          <button class="action-btn ${st.liked ? 'liked' : ''}" data-act="like" data-id="${r.id}">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span class="action-count" data-likes="${r.id}">${formatNum(st.likes)}</span>
          </button>
        </div>
        <div>
          <button class="action-btn" data-act="comment" data-id="${r.id}">
            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="action-count" data-comments="${r.id}">${formatNum(st.comments.length)}</span>
          </button>
        </div>
        <div class="vol-wrap">
          <div class="vol-slider" data-vol="${r.id}">
            <input type="range" min="0" max="100" value="${Math.round(volume*100)}" data-vol-input>
          </div>
          <button class="action-btn" data-act="vol" data-id="${r.id}">
            <svg viewBox="0 0 24 24" data-vol-icon>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="white"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div>
          <button class="action-btn" data-act="share" data-id="${r.id}">
            <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span class="action-count">${formatNum(r.shares)}</span>
          </button>
        </div>
        <div>
          <button class="action-btn ${st.saved ? 'saved' : ''}" data-act="save" data-id="${r.id}">
            <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>

      <!-- Down arrow -->
      <div class="nav-arrows middle-down">
        <button class="arrow-btn" data-act="down" ${i === reels.length - 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      <!-- Bottom: caption + product -->
      <div class="reel-bottom">
        <div class="reel-caption">${r.caption}</div>
        <div class="reel-views">${r.views} vistas</div>

        <div class="product-card-reel">
          <div class="pc-reel-img">
            <img src="${r.product.img}" alt="${r.product.name}">
          </div>
          <div class="pc-reel-info">
            <div class="pc-reel-name">${r.product.name}</div>
            <div class="pc-reel-prices">
              <span class="pc-reel-price">$${r.product.price.toFixed(2)}</span>
              ${r.product.oldPrice ? `<span class="pc-reel-old">$${r.product.oldPrice.toFixed(2)}</span>` : ''}
              ${r.product.discount ? `<span class="pc-reel-disc">${r.product.discount}</span>` : ''}
            </div>
          </div>
          <button class="pc-reel-buy" data-act="buy" data-id="${r.id}">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Comprar
          </button>
        </div>

        <button class="visit-local-btn" data-act="visit" data-id="${r.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
          Visitar Local
        </button>
      </div>

      <!-- Heart pop on double-tap -->
      <div class="heart-pop" data-heart>
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </div>

      <!-- Progress dots -->
      <div class="reel-progress">
        ${reels.map((_, j) => `<div class="progress-dot ${j === i ? 'active' : ''}"></div>`).join('')}
      </div>
    </article>
    `;
  }).join('');
}

/* ══════════════════════════
   ACTIONS
══════════════════════════ */
function toggleLike(id) {
  const st = getReelState(id);
  st.liked = !st.liked;
  st.likes += st.liked ? 1 : -1;
  saveState(reelsState);

  // UI update
  document.querySelectorAll(`[data-act="like"][data-id="${id}"]`).forEach(b => {
    b.classList.toggle('liked', st.liked);
  });
  document.querySelectorAll(`[data-likes="${id}"]`).forEach(s => {
    s.textContent = formatNum(st.likes);
  });

  if (st.liked) showHeart(id);
  renderTray(activeTrayTab);
}

function showHeart(id) {
  const reel = document.querySelector(`[data-reel-id="${id}"] [data-heart]`);
  if (!reel) return;
  reel.classList.remove('show');
  // re-trigger animation
  void reel.offsetWidth;
  reel.classList.add('show');
}

function toggleSave(id) {
  const st = getReelState(id);
  st.saved = !st.saved;
  saveState(reelsState);
  document.querySelectorAll(`[data-act="save"][data-id="${id}"]`).forEach(b => {
    b.classList.toggle('saved', st.saved);
  });
  showToast(st.saved ? '⭐ Guardado en tu lista' : 'Eliminado de guardados');
  renderTray(activeTrayTab);
}

function toggleFollow(id) {
  const st = getReelState(id);
  st.following = !st.following;
  saveState(reelsState);
  const reel = reels.find(r => r.id === id);
  document.querySelectorAll(`[data-act="follow"][data-id="${id}"]`).forEach(b => {
    b.classList.toggle('following', st.following);
    b.textContent = st.following ? 'Siguiendo' : 'Seguir';
  });
  showToast(st.following ? `Ahora sigues a ${reel.seller}` : `Dejaste de seguir a ${reel.seller}`);
  renderTray(activeTrayTab);
}

/* ── Comprar / Carrito ───────── */
function buyReel(id) {
  const reel = reels.find(r => r.id === id);
  if (!reel) return;
  // Agrega al carrito y va a checkout
  window.LocalCart.add(reel.product, 1);
  showToast(`¡${reel.product.name} añadido!`);
  setTimeout(() => {
    window.location.href = 'carritoypago.html';
  }, 700);
}

function addToCartFromReel(id) {
  const reel = reels.find(r => r.id === id);
  if (!reel) return;
  window.LocalCart.add(reel.product, 1);
  showToast(`✓ ${reel.product.name} añadido al carrito`);
}

/* ── Visitar Local → marketplace ── */
function visitLocal(id) {
  const reel = reels.find(r => r.id === id);
  if (!reel) return;
  // Guarda el productId para que market.html podría abrirlo
  try {
    sessionStorage.setItem('localmarket_open_product', String(reel.productId));
    sessionStorage.setItem('localmarket_filter_seller', reel.seller);
  } catch {}
  showToast(`Abriendo ${reel.seller}...`);
  setTimeout(() => {
    window.location.href = 'market.html';
  }, 500);
}

/* ══════════════════════════
   COMMENTS
══════════════════════════ */
let activeCommentReel = null;

function openComments(id) {
  activeCommentReel = id;
  const st = getReelState(id);
  const list = document.getElementById('comments-list');
  document.getElementById('comments-count').textContent = `(${st.comments.length})`;

  if (st.comments.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#9ca3af; font-size:0.9rem;">
      Aún no hay comentarios.<br>¡Sé el primero!</div>`;
  } else {
    list.innerHTML = st.comments.map((c, i) => `
      <div class="comment-item">
        <div class="comment-avatar">${c.initial}</div>
        <div class="comment-content">
          <div>
            <span class="comment-author">${c.author}</span>
            <span class="comment-time">${c.time}</span>
          </div>
          <div class="comment-text">${escapeHTML(c.text)}</div>
          <div class="comment-actions">
            <button class="comment-action ${c.liked ? 'liked' : ''}" data-comment-like="${i}">
              ${c.liked ? '♥' : '♡'} ${c.likeCount || 0}
            </button>
            <button class="comment-action">Responder</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('comments-modal').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Like en comentarios
  list.querySelectorAll('[data-comment-like]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.commentLike, 10);
      const c = st.comments[idx];
      c.liked = !c.liked;
      c.likeCount = (c.likeCount || 0) + (c.liked ? 1 : -1);
      saveState(reelsState);
      btn.classList.toggle('liked', c.liked);
      btn.innerHTML = `${c.liked ? '♥' : '♡'} ${c.likeCount}`;
    });
  });

  setTimeout(() => document.getElementById('comment-input').focus(), 100);
}

function closeComments() {
  document.getElementById('comments-modal').classList.remove('open');
  document.body.style.overflow = '';
  activeCommentReel = null;
}

document.getElementById('comments-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text || !activeCommentReel) return;

  const st = getReelState(activeCommentReel);
  st.comments.unshift({
    author: 'Tú',
    text,
    time: 'ahora',
    initial: 'T',
    liked: false,
    likeCount: 0,
  });
  saveState(reelsState);
  input.value = '';

  // Refresh list
  openComments(activeCommentReel);

  // Update counter on reel
  document.querySelectorAll(`[data-comments="${activeCommentReel}"]`).forEach(s => {
    s.textContent = formatNum(st.comments.length);
  });
  renderTray(activeTrayTab);
});

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ══════════════════════════
   SHARE
══════════════════════════ */
let activeShareReel = null;

function openShare(id) {
  activeShareReel = id;
  document.getElementById('share-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeShare() {
  document.getElementById('share-modal').classList.remove('open');
  document.body.style.overflow = '';
  activeShareReel = null;
}

document.querySelectorAll('.share-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    const net = opt.dataset.net;
    const reel = reels.find(r => r.id === activeShareReel);
    if (!reel) return;

    const url = window.location.href;
    const text = `Mira este reel de ${reel.seller}: ${reel.product.name}`;

    let target = '';
    switch (net) {
      case 'whatsapp':
        target = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        window.open(target, '_blank', 'noopener');
        break;
      case 'facebook':
        target = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(target, '_blank', 'noopener');
        break;
      case 'twitter':
        target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(target, '_blank', 'noopener');
        break;
      case 'copy': {
        const fallback = () => {
          const ta = document.createElement('textarea');
          ta.value = url; document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch {}
          document.body.removeChild(ta);
        };
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url).catch(fallback);
        } else fallback();
        showToast('🔗 Enlace copiado');
        break;
      }
    }
    closeShare();
  });
});

/* ══════════════════════════
   VOLUME
══════════════════════════ */
function toggleVolSlider(id) {
  // Cierra los demás
  document.querySelectorAll('.vol-slider').forEach(s => {
    if (s.dataset.vol !== String(id)) s.classList.remove('open');
  });
  const slider = document.querySelector(`.vol-slider[data-vol="${id}"]`);
  if (slider) slider.classList.toggle('open');
}

function updateVolume(val) {
  volume = Math.max(0, Math.min(1, val / 100));
  // Sincroniza todos los sliders
  document.querySelectorAll('[data-vol-input]').forEach(inp => {
    inp.value = Math.round(volume * 100);
  });
  // Actualiza icono según volumen
  document.querySelectorAll('[data-vol-icon]').forEach(svg => updateVolIcon(svg));
  try { localStorage.setItem('localmarket_vol', String(volume)); } catch {}
}

function updateVolIcon(svg) {
  if (volume === 0) {
    svg.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="white"/>
                     <line x1="23" y1="9" x2="17" y2="15" stroke-linecap="round"/>
                     <line x1="17" y1="9" x2="23" y2="15" stroke-linecap="round"/>`;
  } else if (volume < 0.5) {
    svg.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="white"/>
                     <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"/>`;
  } else {
    svg.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="white"/>
                     <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"/>
                     <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke-linecap="round"/>`;
  }
}

// Restaurar volumen guardado
try {
  const saved = parseFloat(localStorage.getItem('localmarket_vol'));
  if (!isNaN(saved)) volume = Math.max(0, Math.min(1, saved));
} catch {}

/* ══════════════════════════
   NAVIGATION (up / down)
══════════════════════════ */
function goToReel(index) {
  if (index < 0 || index >= reels.length) return;
  currentIndex = index;
  activeReelId = reels[index].id;
  const target = document.querySelector(`[data-index="${index}"]`);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function nextReel() { goToReel(currentIndex + 1); }
function prevReel() { goToReel(currentIndex - 1); }

/* Detecta cuál reel está visible */
const observerOptions = {
  root: document.getElementById('reels-viewport'),
  threshold: 0.6,
};
const reelObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = parseInt(entry.target.dataset.index, 10);
      currentIndex = idx;
      activeReelId = parseInt(entry.target.dataset.reelId, 10);
      // Cierra slider de volumen al cambiar
      document.querySelectorAll('.vol-slider.open').forEach(s => s.classList.remove('open'));
    }
  });
}, observerOptions);

/* ══════════════════════════
   EVENT DELEGATION
══════════════════════════ */
document.getElementById('reels-viewport').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;

  const act = btn.dataset.act;
  const id  = parseInt(btn.dataset.id, 10);

  // Stopper para que el click en el botón no dispare double-tap del reel
  e.stopPropagation();

  switch (act) {
    case 'like':    toggleLike(id); break;
    case 'save':    toggleSave(id); break;
    case 'comment': openComments(id); break;
    case 'share':   openShare(id); break;
    case 'follow':  toggleFollow(id); break;
    case 'vol':     toggleVolSlider(id); break;
    case 'buy':     buyReel(id); break;
    case 'visit':   visitLocal(id); break;
    case 'up':      prevReel(); break;
    case 'down':    nextReel(); break;
  }
});

// Volumen: input range
document.getElementById('reels-viewport').addEventListener('input', e => {
  if (e.target.matches('[data-vol-input]')) {
    updateVolume(parseInt(e.target.value, 10));
  }
});

/* ── Double-tap to like ───────────── */
let lastTap = { id: null, time: 0 };
document.getElementById('reels-viewport').addEventListener('click', e => {
  // Si el click fue sobre un control, ignora
  if (e.target.closest('[data-act]') || e.target.closest('.reel-bottom') || e.target.closest('.reel-top')) return;
  const reel = e.target.closest('.reel');
  if (!reel) return;
  const id = parseInt(reel.dataset.reelId, 10);
  const now = Date.now();
  if (lastTap.id === id && now - lastTap.time < 350) {
    // Double-tap
    const st = getReelState(id);
    if (!st.liked) toggleLike(id);
    else showHeart(id);
    lastTap = { id: null, time: 0 };
  } else {
    lastTap = { id, time: now };
  }
});

/* ── Keyboard navigation ───────────── */
document.addEventListener('keydown', e => {
  // Si el modal de comentarios está abierto y el foco está en input, no navegar
  if (document.activeElement?.tagName === 'INPUT') return;
  if (document.getElementById('comments-modal').classList.contains('open')) {
    if (e.key === 'Escape') closeComments();
    return;
  }
  if (document.getElementById('share-modal').classList.contains('open')) {
    if (e.key === 'Escape') closeShare();
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
    case 'PageDown':
      e.preventDefault(); nextReel(); break;
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault(); prevReel(); break;
    case 'l':
    case 'L':
      toggleLike(activeReelId); break;
    case 's':
    case 'S':
      toggleSave(activeReelId); break;
    case 'c':
    case 'C':
      openComments(activeReelId); break;
    case 'm':
    case 'M':
      // Mute toggle
      updateVolume(volume > 0 ? 0 : 60);
      break;
  }
});

/* ══════════════════════════
   TOAST
══════════════════════════ */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ══════════════════════════
   CIERRE de slider al hacer click fuera
══════════════════════════ */
document.addEventListener('click', e => {
  if (!e.target.closest('.vol-wrap')) {
    document.querySelectorAll('.vol-slider.open').forEach(s => s.classList.remove('open'));
  }
});

/* ══════════════════════════
   INIT
══════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  renderReels();
  document.querySelectorAll('.reel').forEach(r => reelObserver.observe(r));
  updateVolume(Math.round(volume * 100));

  // Activity Tray
  renderTray('saved');
  document.querySelectorAll('.tray-tab').forEach(btn => {
    btn.addEventListener('click', () => renderTray(btn.dataset.tab));
  });

  // Si hay un parámetro ?reel=ID en la URL → ir a ese reel
  const params = new URLSearchParams(window.location.search);
  const startId = parseInt(params.get('reel'), 10);
  if (startId) {
    const idx = reels.findIndex(r => r.id === startId);
    if (idx >= 0) setTimeout(() => goToReel(idx), 100);
  }
});

/* ══════════════════════════
   ACTIVITY TRAY
══════════════════════════ */
let activeTrayTab = 'saved';

function renderTray(tab) {
  activeTrayTab = tab;
  document.querySelectorAll('.tray-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  const content = document.getElementById('tray-content');
  if (!content) return;
  switch (tab) {
    case 'saved':     renderSavedTray(content);     break;
    case 'following': renderFollowingTray(content); break;
    case 'likes':     renderLikesTray(content);     break;
    case 'comments':  renderCommentsTray(content);  break;
  }
}

function trayEmpty(icon, msg) {
  return `<div class="tray-empty">${icon}<p>${msg}</p></div>`;
}

function renderSavedTray(el) {
  const saved = reels.filter(r => getReelState(r.id).saved);
  if (!saved.length) {
    el.innerHTML = trayEmpty(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
      'Aún no tienes reels guardados.<br>Guarda los que más te gusten.'
    );
    return;
  }
  el.innerHTML = saved.map(r => `
    <div class="tray-item" onclick="goToReel(${reels.indexOf(r)})">
      <img class="tray-item-thumb" src="${r.product.img}" alt="${r.product.name}">
      <div class="tray-item-info">
        <div class="tray-item-name">${r.product.name}</div>
        <div class="tray-item-sub">${r.seller}</div>
      </div>
      <span class="tray-item-badge saved">$${r.product.price.toFixed(2)}</span>
    </div>
  `).join('');
}

function renderFollowingTray(el) {
  const followed = reels.filter(r => getReelState(r.id).following);
  const unique = [...new Map(followed.map(r => [r.seller, r])).values()];
  if (!unique.length) {
    el.innerHTML = trayEmpty(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      'Aún no sigues a ningún vendedor.<br>Pulsa "Seguir" en un reel.'
    );
    return;
  }
  el.innerHTML = unique.map(r => `
    <div class="tray-item" onclick="goToReel(${reels.indexOf(r)})">
      <div class="tray-item-avatar" style="background-image:url('${r.sellerAvatar}')"></div>
      <div class="tray-item-info">
        <div class="tray-item-name">${r.seller}</div>
        <div class="tray-item-sub">${r.distance}</div>
      </div>
      <span class="tray-item-badge following">Siguiendo</span>
    </div>
  `).join('');
}

function renderLikesTray(el) {
  const liked = reels.filter(r => getReelState(r.id).liked);
  if (!liked.length) {
    el.innerHTML = trayEmpty(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
      'Aún no has dado like a ningún reel.'
    );
    return;
  }
  el.innerHTML = liked.map(r => `
    <div class="tray-item" onclick="goToReel(${reels.indexOf(r)})">
      <img class="tray-item-thumb" src="${r.img}" alt="${r.seller}">
      <div class="tray-item-info">
        <div class="tray-item-name">${r.seller}</div>
        <div class="tray-item-sub">${r.caption.slice(0, 38)}…</div>
      </div>
      <span class="tray-item-badge liked">❤️</span>
    </div>
  `).join('');
}

function renderCommentsTray(el) {
  const commented = reels.filter(r => {
    return getReelState(r.id).comments.some(c => c.author === 'Tú');
  });
  if (!commented.length) {
    el.innerHTML = trayEmpty(
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      'Aún no has comentado en ningún reel.'
    );
    return;
  }
  el.innerHTML = commented.map(r => {
    const myComment = getReelState(r.id).comments.find(c => c.author === 'Tú');
    const preview = myComment.text.length > 36
      ? myComment.text.slice(0, 36) + '…'
      : myComment.text;
    return `
      <div class="tray-item" onclick="openComments(${r.id})">
        <img class="tray-item-thumb" src="${r.img}" alt="${r.seller}">
        <div class="tray-item-info">
          <div class="tray-item-name">${r.seller}</div>
          <div class="tray-item-sub">"${escapeHTML(preview)}"</div>
        </div>
        <span class="tray-item-badge commented">💬</span>
      </div>
    `;
  }).join('');
}

/* ══════════════════════════
   Exposición global (por si la quieres usar)
══════════════════════════ */
window.LocalReels = {
  reels,
  goToReel,
  nextReel,
  prevReel,
  toggleLike,
  toggleSave,
  buyReel,
};