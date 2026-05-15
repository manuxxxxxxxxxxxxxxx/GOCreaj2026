/* ═══════════════════════════════════
   LocalMarket · Chat  (Enhanced)
   ═══════════════════════════════════ */

/* ── STATIC CONTACTS ── */
const BASE_CONTACTS = [
  { id:'c1', name:'María González', role:'Vecina del barrio', isSeller:false, online:true, color:'#ec4899', initials:'MG', distance:'0.3 km',
    msgs:[
      {from:'them',text:'¡Hola! Vi tu perfil en LocalMarket 😊',time:'10:20'},
      {from:'me',  text:'¡Hola María! ¿Cómo te puedo ayudar?',time:'10:22'},
      {from:'them',text:'¿Tienes más de esas frutas orgánicas?',time:'10:32'},
    ]},
  { id:'c2', name:'Panadería Don José', role:'Vendedor · Panadería', isSeller:true, online:true, color:'#f97316', initials:'DJ', distance:'0.5 km',
    msgs:[
      {from:'me',  text:'¡Buenos días! ¿A qué hora tienen el pan fresco?',time:'09:10'},
      {from:'them',text:'¡Buenos días! El pan sale del horno a las 7am 🥖',time:'09:14'},
      {from:'me',  text:'Perfecto, mañana paso a comprar',time:'09:15'},
      {from:'them',text:'¡Te esperamos! Tendremos croissants también 😊',time:'09:16'},
    ]},
  { id:'c3', name:'Carlos Ruiz', role:'Cliente regular', isSeller:false, online:false, color:'#4f6ef7', initials:'CR', distance:'1.1 km',
    msgs:[
      {from:'them',text:'¿Me puedes recomendar el vendedor de café?',time:'Ayer'},
      {from:'me',  text:'Sí! Es el Café del Barrio, está en el marketplace',time:'Ayer'},
      {from:'them',text:'Perfecto, muchas gracias 👍',time:'Ayer'},
    ]},
  { id:'c4', name:'Huerto Verde', role:'Vendedor · Frutas y Verduras', isSeller:true, online:false, color:'#22c55e', initials:'HV', distance:'1.2 km',
    msgs:[
      {from:'me',  text:'¿Cuándo llegan las verduras frescas?',time:'Lun'},
      {from:'them',text:'Cosecha nueva los martes y viernes 🥬',time:'Lun'},
    ]},
  { id:'c5', name:'Ana López', role:'Vecina del barrio', isSeller:false, online:true, color:'#a855f7', initials:'AL', distance:'0.7 km',
    msgs:[{from:'them',text:'¡Hola! ¿Viste la oferta de croissants? 🥐',time:'11:48'}]},
  { id:'c6', name:'Café del Barrio', role:'Vendedor · Café de especialidad', isSeller:true, online:true, color:'#92400e', initials:'CB', distance:'0.8 km',
    msgs:[
      {from:'me',  text:'¡Hola! ¿Tienen café descafeinado?',time:'08:25'},
      {from:'them',text:'¡Sí, tenemos una mezcla descafeinada excelente ☕',time:'08:28'},
      {from:'them',text:'El de 250g está a $8.75 😊',time:'08:30'},
    ]},
];

const INITIAL_UNREAD = {c1:2, c5:1};

const VEHICLE_COLORS = {bicicleta:'#22c55e',bici:'#22c55e',moto:'#f97316',scooter:'#ec4899',carro:'#4f6ef7',auto:'#4f6ef7'};

/* ── AUTO-REPLY ENGINE ── */
const REPLY_RULES = [
  {keys:/hola|buenos|buenas|hey|saludos/i,           replies:['¡Hola! 👋 ¿En qué te puedo ayudar?','¡Buenas! Bienvenido a LocalMarket 🌟','¡Hola! Aquí para lo que necesites 😊']},
  {keys:/precio|costo|cuánto|cuanto|vale/i,          replies:['Depende del producto, ¿cuál te interesa? 😊','Puedes ver los precios en el marketplace.']},
  {keys:/entrega|envío|envio|delivery|llevar/i,      replies:['Hacemos entregas el mismo día antes de las 2pm 🚚','¿Cuál es tu dirección? Coordinamos la entrega.']},
  {keys:/gracias|genial|perfecto|excelente|súper/i,  replies:['¡Con mucho gusto! 😊','¡Para eso estamos! ¿Algo más?','¡Que tengas un excelente día! 🌟']},
  {keys:/horario|abre|cierra|hora|cuándo/i,          replies:['Estamos de lunes a sábado de 7am a 7pm 🕖','Nuestro horario es 7am - 7pm. ¡Te esperamos!']},
  {keys:/disponible|stock|hay|tienen|queda/i,        replies:['¡Sí! Tenemos stock disponible ✅ ¿Cuánto necesitas?','Déjame verificar... ¡Sí hay disponibilidad! 😊']},
  {keys:/dirección|donde|ubicación|local|tienda/i,   replies:['Puedes ver la ubicación exacta en el marketplace 📍']},
];
const DRIVER_RULES = [
  {keys:/dónde|donde|estás|estas|llegas/i,           replies:['Estoy a unos minutos de tu ubicación 📍','Ya casi llego, unos 5 minutos más 🛵']},
  {keys:/cuánto|cuanto|tiempo|eta|cuando/i,          replies:['Según el GPS llego en ~8 minutos ⏱️','Unos 10 minutos más 🗺️']},
  {keys:/ok|listo|perfecto|bien|gracias/i,           replies:['¡De nada! Cualquier cosa me avisas 👍','¡Perfecto! Enseguida llego 🚀']},
  {keys:/problema|demora|tarde/i,                    replies:['Me disculpo, hay tráfico. Voy lo más rápido posible 🙏']},
];
const GENERIC = ['¡Entendido! Te respondo en un momento 😊','Claro, con gusto te ayudo.','Perfecto, déjame verificar eso.','¡Interesante! Cuéntame más.','Anotado 🌟'];

function getAutoReply(text, isDriver) {
  const rules = isDriver ? [...DRIVER_RULES, ...REPLY_RULES] : REPLY_RULES;
  for (const r of rules) if (r.keys.test(text)) return r.replies[Math.floor(Math.random() * r.replies.length)];
  return GENERIC[Math.floor(Math.random() * GENERIC.length)];
}

/* ── EMOJIS ── */
const EMOJIS = ['😀','😂','🥰','😍','😎','🥳','😊','🤩','😄','😅','👍','❤️','🎉','✨','🔥','💯','👏','🙏','💪','🤝','👋','😮','😢','😡','🤔','😴','🤗','🥺','😏','🙄','🌟','💫','🎯','🚀','💡','🛒','🏪','🥖','🥬','☕','🍕','🎨','🌿','🍎','🥕','🧁','🎁','💐','🚚','📦'];

/* ── SAMPLE PRODUCTS ── */
const SAMPLE_PRODUCTS = [
  {id:1,name:'Pan Artesanal',price:'$4.50',emoji:'🥖',seller:'Panadería Don José'},
  {id:2,name:'Frutas Orgánicas',price:'$8.00',emoji:'🍎',seller:'Huerto Verde'},
  {id:3,name:'Café Premium',price:'$12.00',emoji:'☕',seller:'Café del Barrio'},
  {id:4,name:'Verduras Frescas',price:'$6.00',emoji:'🥬',seller:'Huerto Verde'},
  {id:5,name:'Croissants x6',price:'$7.50',emoji:'🥐',seller:'Panadería Don José'},
  {id:6,name:'Miel Local',price:'$9.00',emoji:'🍯',seller:'LocalMiel'},
];

/* ── STATE ── */
const STORAGE_KEY = 'lm_chat_v2';
let CONTACTS = [];
let chatData  = {};
let unreadMap = {};
let activeContact   = null;
let activeFilter    = 'all';
let infoVisible     = false;
let callTimer = null, callSeconds = 0;
let vcMuted = false, vcSpeaker = false;
let vidMuted = false, vidCamOff = false, vidScreenOn = false;
let mediaRecorder = null, recChunks = [], recTimer = null, recSeconds = 0, isRecording = false;
let replyingTo      = null;
let reactionTargetId = null;
let actionPanelOpen = false;
const scheduledTimers = {};
let lastMsgAt = {};   // contactId → timestamp numérico del último mensaje

/* ── HELPERS ── */
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function makeAvatar(contact, size = 46) {
  const el = document.createElement('div');
  el.className = 'avatar-circle';
  el.style.cssText = `background:${contact.color};width:${size}px;height:${size}px;font-size:${size*0.3}px`;
  el.textContent = contact.initials;
  return el;
}

function formatTimer(secs) {
  return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('lm-toast');
  document.getElementById('lm-toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

function findMsg(id) {
  for (const msgs of Object.values(chatData)) {
    const m = msgs.find(m => String(m.id) === String(id));
    if (m) return m;
  }
  return null;
}

/* ── DELIVERY DRIVER CONTACTS ── */
function loadDeliveryDriverContacts() {
  try {
    const raw = localStorage.getItem('localmarket_deliveries');
    if (!raw) return [];
    const deliveries = JSON.parse(raw);
    if (!Array.isArray(deliveries)) return [];

    const seen = new Set();
    const drivers = [];

    deliveries.forEach(delivery => {
      const driver = delivery.repartidor || delivery.driver || delivery.conductor;
      if (!driver) return;

      const driverName = typeof driver === 'string' ? driver : (driver.nombre || driver.name || 'Repartidor');
      if (seen.has(driverName)) return;
      seen.add(driverName);

      const vehicle = (typeof driver === 'object' ? (driver.vehiculo || driver.vehicle || '') : '').toLowerCase();
      const colorKey = Object.keys(VEHICLE_COLORS).find(k => vehicle.includes(k));
      const color = colorKey ? VEHICLE_COLORS[colorKey] : '#64748b';
      const vehicleEmoji = vehicle.includes('bici') ? '🚲' : (vehicle.includes('carro') || vehicle.includes('auto')) ? '🚗' : '🛵';

      const initials = driverName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const status = delivery.estado || delivery.status || 'en_camino';
      const product = (delivery.producto && (delivery.producto.nombre || delivery.producto)) || delivery.item || 'tu pedido';

      const statusMsgs = {
        confirmado: `¡Hola! Soy ${driverName}, acabo de confirmar tu pedido. Estaré recogiendo "${product}" pronto 📦`,
        preparando: `¡Hola! Tu pedido de "${product}" está siendo preparado. En cuanto esté listo salgo 🏃`,
        en_camino:  `¡En camino con tu pedido de "${product}"! ETA: 10-15 minutos ${vehicleEmoji}`,
        entregado:  `¡Entregué tu pedido de "${product}" exitosamente! Que lo disfrutes 🎉`,
      };

      drivers.push({
        id: `driver_${driverName.replace(/\s+/g,'_')}`,
        name: driverName,
        role: `Repartidor · ${vehicleEmoji} ${typeof driver === 'object' ? (driver.vehiculo || driver.vehicle || 'Moto') : 'Moto'}`,
        isDriver: true, isSeller: false,
        online: status !== 'entregado',
        color, initials,
        distance: '~10 min',
        delivery, deliveryStatus: status, vehicleEmoji,
        msgs: [{from:'them', text: statusMsgs[status] || statusMsgs.en_camino, time: nowTime()}],
      });
    });
    return drivers;
  } catch { return []; }
}

/* ── STORAGE ── */
function loadStorage() {
  const drivers = loadDeliveryDriverContacts();
  CONTACTS = [...BASE_CONTACTS, ...drivers];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      chatData  = parsed.chatData  || {};
      unreadMap = parsed.unreadMap || {...INITIAL_UNREAD};
    } else {
      unreadMap = {...INITIAL_UNREAD};
    }
  } catch { unreadMap = {...INITIAL_UNREAD}; }

  CONTACTS.forEach((c, idx) => {
    if (!chatData[c.id]) {
      chatData[c.id] = c.msgs.map((m, i) => ({
        ...m, id:`${c.id}_${i}`, type: m.type||'text', reactions:{}, replyTo:null,
        read: !(unreadMap[c.id] && i >= c.msgs.length - (unreadMap[c.id]||0)),
      }));
      if (c.isDriver && c.msgs.length) unreadMap[c.id] = 1;
    }
    // lastMsgAt: usa timestamp real si el último msg tiene id numérico,
    // si no asigna un valor decreciente para mantener el orden original.
    const msgs = chatData[c.id];
    if (msgs?.length) {
      const lastId = msgs[msgs.length - 1].id;
      lastMsgAt[c.id] = typeof lastId === 'number' ? lastId : (Date.now() - (idx + 1) * 10000);
    } else {
      lastMsgAt[c.id] = Date.now() - (idx + 1) * 10000;
    }
  });
}

function saveStorage() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({chatData, unreadMap})); } catch {}
}

/* ── DELIVERY TRACKER ── */
const DT_STEPS = [{key:'confirmado',label:'Confirmado'},{key:'preparando',label:'Preparando'},{key:'en_camino',label:'En camino'},{key:'entregado',label:'Entregado'}];

function renderDeliveryTracker(contact) {
  const bar = document.getElementById('delivery-tracker-bar');
  if (!contact?.isDriver) { bar.style.display = 'none'; return; }
  bar.style.display = '';

  const status = contact.deliveryStatus || 'en_camino';
  const stepIdx = DT_STEPS.findIndex(s => s.key === status);

  document.getElementById('dt-icon').textContent = contact.vehicleEmoji || '🛵';
  const titles = {confirmado:'Pedido confirmado',preparando:'Preparando tu pedido',en_camino:'En camino 🛵',entregado:'Pedido entregado ✓'};
  document.getElementById('dt-title').textContent = titles[status] || 'Pedido en camino';

  document.getElementById('dt-steps').innerHTML = DT_STEPS.map((s,i) => {
    const cls = i < stepIdx ? 'done' : i === stepIdx ? 'active' : '';
    return `<span class="dt-step ${cls}">${s.label}</span>`;
  }).join('');

  const etas = {confirmado:'~25 min',preparando:'~15 min',en_camino:'~8 min',entregado:'¡Listo!'};
  document.getElementById('dt-eta').textContent = etas[status] || '~10 min';
}

/* ── QUICK REPLIES ── */
function renderQuickReplies(contact) {
  const chips = !contact ? [] :
    contact.isDriver   ? ['¿Dónde estás?','¿Cuánto tardas?','¡Ya te veo!','Estoy en casa','Gracias 👍'] :
    contact.isSeller   ? ['¿Tienen disponible?','¿Cuál es el precio?','¿Hacen entregas?','¿Cuál es el horario?','Quiero hacer un pedido 🛒'] :
                         ['¡Hola!','¿Cómo estás?','¿Qué recomendarías?','¡Hasta luego! 👋'];

  const qr = document.getElementById('quick-replies');
  qr.innerHTML = chips.map(c =>
    `<button class="qr-chip" data-text="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join('');
  qr.querySelectorAll('.qr-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('msg-input').value = btn.dataset.text;
      document.getElementById('msg-input').focus();
    });
  });
}

/* ── CONTACTS LIST ── */
function filteredContacts() {
  const search = document.getElementById('contacts-search').value.toLowerCase();
  return CONTACTS.filter(c => {
    if (activeFilter === 'unread'   && !unreadMap[c.id]) return false;
    if (activeFilter === 'sellers'  && !c.isSeller)      return false;
    if (activeFilter === 'drivers'  && !c.isDriver)      return false;
    if (search && !c.name.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => (lastMsgAt[b.id] || 0) - (lastMsgAt[a.id] || 0));
}

function lastMessage(c) {
  const msgs = chatData[c.id];
  if (!msgs?.length) return {text:'',time:''};
  const last = msgs[msgs.length-1];
  const preview = {audio:'🎵 Audio',image:'📷 Imagen',location:'📍 Ubicación',product:'🛒 Producto',poll:'📊 Encuesta',scheduled:'⏰ Programado'}[last.type] || last.text || '';
  return {text: preview, time: last.time};
}

function renderContacts() {
  const list = document.getElementById('contacts-list');
  const contacts = filteredContacts();
  if (!contacts.length) {
    list.innerHTML = `<div style="padding:32px 16px;text-align:center;color:#9ca3af;font-size:.82rem">Sin resultados</div>`;
    return;
  }
  list.innerHTML = contacts.map(c => {
    const {text,time} = lastMessage(c);
    const unread = unreadMap[c.id] || 0;
    const tag = c.isDriver  ? `<span class="driver-tag">${c.vehicleEmoji||'🛵'} Repartidor</span>`
              : c.isSeller  ? `<span class="seller-tag">Vendedor</span>` : '';
    return `<div class="contact-item${activeContact?.id===c.id?' active':''}" data-cid="${c.id}">
      <div class="contact-avatar">
        <div class="avatar-circle" style="background:${c.color};width:46px;height:46px;font-size:.88rem">${c.initials}</div>
        ${c.online?'<div class="online-dot"></div>':''}
      </div>
      <div class="contact-info">
        <div class="contact-top">
          <div class="contact-name">${escapeHtml(c.name)}</div>
          <div class="contact-time">${escapeHtml(time)}</div>
        </div>
        <div class="contact-bottom">
          <div class="contact-preview">${escapeHtml(text)}</div>
          ${unread ? `<div class="unread-badge">${unread}</div>` : tag}
        </div>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('.contact-item').forEach(el =>
    el.addEventListener('click', () => openChat(el.dataset.cid))
  );
}

/* ── MESSAGE RENDERING ── */
function audioWaveBars(msgId) {
  const id = String(msgId);
  return Array.from({length:18}, (_,i) => {
    const seed = (id.charCodeAt(i % id.length) * 13 + i * 7) % 24;
    const h = 4 + seed;
    return `<div class="audio-wave-bar" style="height:${h}px"></div>`;
  }).join('');
}

function renderMsgActions(mid) {
  return `<div class="msg-actions">
    <button class="msg-action-btn" data-mid="${mid}" data-action="react" title="Reaccionar">😊</button>
    <button class="msg-action-btn" data-mid="${mid}" data-action="reply" title="Responder">↩</button>
  </div>`;
}

function renderReactions(msg) {
  const entries = Object.entries(msg.reactions || {});
  if (!entries.length) return '';
  return `<div class="msg-reactions">${entries.map(([e,count]) =>
    `<span class="reaction-item${msg.myReaction===e?' mine':''}" data-mid="${msg.id}" data-emoji="${e}">${e}<span>${count}</span></span>`
  ).join('')}</div>`;
}

function renderQuote(replyTo) {
  if (!replyTo) return '';
  const from = replyTo.from === 'me' ? 'Tú' : (activeContact?.name||'');
  const preview = {audio:'🎵 Audio',image:'📷 Imagen',location:'📍 Ubicación',product:'🛒 Producto',poll:'📊 Encuesta'}[replyTo.type] || escapeHtml(replyTo.text||'');
  return `<div class="msg-quote"><strong>${escapeHtml(from)}</strong><br>${preview}</div>`;
}

function renderSingleMsg(m) {
  const isSent = m.from === 'me';
  const isHour = /^\d{2}:\d{2}$/.test(m.time);
  const quote  = renderQuote(m.replyTo);
  const check  = isSent ? `<span class="msg-check${m.read?' read':''}">${m.read?'✓✓':'✓'}</span>` : '';
  const avatar = isSent ? '' : `<div class="msg-avatar-mini" style="background:${activeContact.color}">${activeContact.initials}</div>`;

  let bubble = '';
  switch (m.type) {
    case 'audio':
      bubble = `<div class="msg-bubble audio-bubble">
        ${quote}
        <button class="audio-play-btn" data-url="${escapeHtml(m.audioUrl||'')}">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </button>
        <div class="audio-wave">${audioWaveBars(m.id)}</div>
        <span class="audio-duration">${m.audioDuration||'0:00'}</span>
        ${renderMsgActions(m.id)}
      </div>`; break;

    case 'image':
      bubble = `<div class="msg-bubble msg-img-bubble" data-src="${escapeHtml(m.imgSrc||'')}">
        ${quote}<img src="${escapeHtml(m.imgSrc||'')}" alt="Imagen" loading="lazy">
        ${renderMsgActions(m.id)}
      </div>`; break;

    case 'location':
      bubble = `<div class="msg-bubble location-bubble">
        ${quote}
        <div class="location-map"><div class="location-map-grid"></div><div class="location-pin-icon">📍</div></div>
        <div class="location-info">
          <div class="location-label">${escapeHtml(m.locationLabel||'Mi ubicación')}</div>
          <div class="location-address">${escapeHtml(m.locationAddress||'')}</div>
        </div>
        ${renderMsgActions(m.id)}
      </div>`; break;

    case 'product':
      bubble = `<div class="msg-bubble product-share-bubble">
        ${quote}
        <div class="ppi-img" style="font-size:2.4rem;display:grid;place-items:center;height:80px;background:#f1f5f9">${m.product?.emoji||'🛒'}</div>
        <div class="product-share-body">
          <div class="product-share-name">${escapeHtml(m.product?.name||'Producto')}</div>
          <div class="product-share-price">${escapeHtml(m.product?.price||'')}</div>
          <button class="product-share-cta" onclick="window.location.href='market.html'">Ver en Marketplace →</button>
        </div>
        ${renderMsgActions(m.id)}
      </div>`; break;

    case 'poll': {
      const poll = m.poll || {};
      const total = poll.totalVotes || 0;
      const opts = (poll.options||[]).map((opt,idx) => {
        const pct = total > 0 ? Math.round((opt.votes||0)/total*100) : 0;
        return `<button class="poll-option${poll.userVote===idx?' voted':''}" data-mid="${m.id}" data-optidx="${idx}">
          <div class="poll-bar" style="width:${pct}%"></div>
          <span class="poll-opt-text">${escapeHtml(opt.text)}</span>
          <span class="poll-opt-count">${pct}%</span>
        </button>`;
      }).join('');
      bubble = `<div class="msg-bubble poll-bubble">
        ${quote}<div class="poll-question">📊 ${escapeHtml(poll.question||'Encuesta')}</div>
        ${opts}<div class="poll-total">${total} voto${total!==1?'s':''}</div>
        ${renderMsgActions(m.id)}
      </div>`; break;
    }

    case 'scheduled':
      bubble = `<div class="msg-bubble">
        ${quote}${escapeHtml(m.text||'')}
        <div class="scheduled-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Programado: ${escapeHtml(m.scheduledTime||'')}
        </div>
        ${renderMsgActions(m.id)}
      </div>`; break;

    default:
      bubble = `<div class="msg-bubble">${quote}${escapeHtml(m.text||'')}${renderMsgActions(m.id)}</div>`;
  }

  return `<div class="msg-row ${isSent?'sent':'recv'}" data-mid="${m.id}">
    ${avatar}
    <div class="msg-bubble-wrap">
      ${bubble}
      <div class="msg-meta"><span>${isHour?m.time:''}</span>${check}</div>
      ${renderReactions(m)}
    </div>
  </div>`;
}

function renderMessages() {
  const area = document.getElementById('messages-area');
  const msgs = chatData[activeContact?.id] || [];
  if (!msgs.length) {
    area.innerHTML = `<div style="text-align:center;color:#9ca3af;font-size:.82rem;margin-top:40px">No hay mensajes aún. ¡Di hola! 👋</div>`;
    return;
  }
  let html = '', prevDate = '';
  msgs.forEach(m => {
    const isHour = /^\d{2}:\d{2}$/.test(m.time);
    const lbl = isHour ? 'Hoy' : m.time;
    if (lbl !== prevDate) { html += `<div class="date-sep">${escapeHtml(lbl)}</div>`; prevDate = lbl; }
    html += renderSingleMsg(m);
  });
  area.innerHTML = html;
  area.scrollTop = area.scrollHeight;
  wireMessageEvents(area);
}

function wireMessageEvents(area) {
  area.querySelectorAll('.audio-play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (!url) { showToast('Audio no disponible en esta sesión'); return; }
      const audio = new Audio(url);
      audio.play().catch(() => showToast('No se puede reproducir el audio'));
      const wave = btn.nextElementSibling;
      if (wave) {
        wave.querySelectorAll('.audio-wave-bar').forEach(bar => bar.classList.add('active'));
        audio.addEventListener('ended', () =>
          wave.querySelectorAll('.audio-wave-bar').forEach(bar => bar.classList.remove('active'))
        );
      }
    });
  });

  area.querySelectorAll('.msg-img-bubble').forEach(b =>
    b.addEventListener('click', () => openLightbox(b.dataset.src))
  );

  area.querySelectorAll('.location-bubble').forEach(b =>
    b.addEventListener('click', () => showToast('📍 Ubicación (función demo – abrir en Maps)'))
  );

  area.querySelectorAll('.poll-option').forEach(btn =>
    btn.addEventListener('click', () => votePoll(btn.dataset.mid, parseInt(btn.dataset.optidx)))
  );

  area.querySelectorAll('.reaction-item').forEach(item =>
    item.addEventListener('click', () => toggleReaction(item.dataset.mid, item.dataset.emoji))
  );

  area.querySelectorAll('[data-action="react"]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); showReactionPicker(btn.dataset.mid, btn); })
  );

  area.querySelectorAll('[data-action="reply"]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); const m = findMsg(btn.dataset.mid); if (m) setReplyTo(m); })
  );
}

/* ── OPEN CHAT ── */
function openChat(cid) {
  activeContact = CONTACTS.find(c => c.id === cid);
  if (!activeContact) return;

  if (unreadMap[cid]) {
    chatData[cid]?.forEach(m => m.read = true);
    unreadMap[cid] = 0;
    saveStorage();
  }

  document.getElementById('chat-empty').style.display = 'none';
  document.getElementById('chat-window').classList.add('visible');

  const slot = document.getElementById('ch-avatar-slot');
  slot.innerHTML = '';
  slot.appendChild(makeAvatar(activeContact, 40));
  document.getElementById('ch-name').textContent = activeContact.name;

  // Role badge
  const roleEl = document.getElementById('ch-role');
  if (roleEl) {
    if (activeContact.isDriver) {
      roleEl.textContent = `${activeContact.vehicleEmoji || '🛵'} Repartidor`;
      roleEl.className = 'ch-role driver';
      roleEl.style.display = '';
    } else if (activeContact.isSeller) {
      roleEl.textContent = '🏪 Vendedor';
      roleEl.className = 'ch-role seller';
      roleEl.style.display = '';
    } else {
      roleEl.textContent = '👤 Usuario';
      roleEl.className = 'ch-role user';
      roleEl.style.display = '';
    }
  }

  const statusEl = document.getElementById('ch-status');
  if (activeContact.online) {
    statusEl.innerHTML = '<span class="ch-status-dot"></span> En línea';
    statusEl.className = 'ch-status online';
  } else {
    statusEl.textContent = 'Desconectado';
    statusEl.className = 'ch-status';
  }

  renderDeliveryTracker(activeContact);
  renderQuickReplies(activeContact);
  renderMessages();
  renderContacts();
  renderInfoPanel();
  closeReplyPreview();
  if (actionPanelOpen) toggleActionPanel();

  if (window.innerWidth <= 760) document.getElementById('contacts-sidebar').classList.add('hidden');
}

/* ── SEND TEXT MESSAGE ── */
function sendMessage() {
  const input = document.getElementById('msg-input');
  const text  = input.value.trim();
  if (!text || !activeContact) return;

  pushMsg({type:'text', text});
  input.value = '';
  input.style.height = 'auto';
  simulateReply(text);
}

function simulateReply(userText) {
  if (!activeContact) return;
  const cid = activeContact.id;
  const typingEl = document.getElementById('typing-indicator');
  document.getElementById('typing-label').textContent = activeContact.name;
  const delay = 800 + Math.random() * 1500;
  typingEl.classList.add('visible');
  document.getElementById('messages-area').scrollTop = 99999;

  setTimeout(() => {
    typingEl.classList.remove('visible');
    if (activeContact?.id !== cid) return;
    const msg = {id:Date.now(), from:'them', type:'text', text: getAutoReply(userText, activeContact.isDriver),
      time: nowTime(), read:true, reactions:{}, replyTo:null};
    chatData[cid].push(msg);
    lastMsgAt[cid] = msg.id;
    const msgs = chatData[cid];
    for (let i = msgs.length-2; i >= 0; i--) { if (msgs[i].from==='me') { msgs[i].read=true; break; } }
    saveStorage(); renderMessages(); renderContacts();
  }, delay);
}

/* ── PUSH ANY MESSAGE TYPE ── */
function pushMsg(extra) {
  if (!activeContact) { showToast('Selecciona un contacto primero'); return null; }
  const msg = {
    id: Date.now(), from:'me', read:false, reactions:{}, time: nowTime(),
    replyTo: replyingTo ? {from:replyingTo.from, text:replyingTo.text, type:replyingTo.type} : null,
    ...extra,
  };
  chatData[activeContact.id].push(msg);
  lastMsgAt[activeContact.id] = msg.id;   // msg.id = Date.now()
  saveStorage();
  closeReplyPreview();
  renderMessages();
  renderContacts();
  return msg.id;
}

/* ── VOICE RECORDING ── */
function startRecording() {
  if (isRecording) return;
  navigator.mediaDevices?.getUserMedia({audio:true}).then(stream => {
    isRecording = true; recChunks = []; recSeconds = 0;
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    mediaRecorder = new MediaRecorder(stream, {mimeType: mime});
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (!recChunks.length || recSeconds < 1) return;
      const blob = new Blob(recChunks, {type: mime});
      const duration = formatTimer(recSeconds);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        const sizeKB = Math.round(base64.length / 1024);
        if (sizeKB > 800) {
          showToast(`⚠️ Audio (${sizeKB}KB) muy largo, usando enlace temporal`);
          pushMsg({type:'audio', audioUrl: URL.createObjectURL(blob), audioDuration: duration, text:''});
        } else {
          pushMsg({type:'audio', audioUrl: base64, audioDuration: duration, text:''});
        }
      };
      reader.onerror = () => pushMsg({type:'audio', audioUrl: URL.createObjectURL(blob), audioDuration: duration, text:''});
      reader.readAsDataURL(blob);
    };
    mediaRecorder.start();
    document.getElementById('recording-bar').style.display = '';
    document.getElementById('voice-btn').classList.add('recording');
    recTimer = setInterval(() => {
      recSeconds++;
      document.getElementById('rec-timer').textContent = formatTimer(recSeconds);
    }, 1000);
  }).catch(() => showToast('❌ Permiso de micrófono denegado'));
}

function stopRecording(cancel = false) {
  if (!isRecording) return;
  isRecording = false;
  clearInterval(recTimer);
  document.getElementById('recording-bar').style.display = 'none';
  document.getElementById('voice-btn').classList.remove('recording');
  if (cancel) { recChunks = []; mediaRecorder = null; return; }
  if (mediaRecorder?.state !== 'inactive') mediaRecorder.stop();
}

/* ── IMAGE UPLOAD ── */
function handleImageUpload(file) {
  if (!file || !activeContact) return;
  const reader = new FileReader();
  reader.onload = e => pushMsg({type:'image', imgSrc: e.target.result, text:''});
  reader.readAsDataURL(file);
}

/* ── LOCATION ── */
function sendLocation() {
  if (!activeContact) return;
  const addresses = ['Calle 23 #45-67, Barrio Centro','Av. Principal #12-34','Carrera 5 #78-90, LocalMarket Zone'];
  pushMsg({type:'location', locationLabel:'Mi ubicación actual',
    locationAddress: addresses[Math.floor(Math.random()*addresses.length)], text:''});
  showToast('📍 Ubicación enviada');
}

/* ── POLL ── */
function openPollModal() {
  if (!activeContact) { showToast('Selecciona un contacto primero'); return; }
  document.getElementById('poll-question').value = '';
  document.getElementById('poll-options-wrap').innerHTML = `
    <input class="modal-input poll-opt-input" placeholder="Opción 1">
    <input class="modal-input poll-opt-input" placeholder="Opción 2">`;
  document.getElementById('poll-modal').style.display = '';
}

function sendPoll() {
  const question = document.getElementById('poll-question').value.trim();
  if (!question) { showToast('Escribe una pregunta'); return; }
  const options = [...document.querySelectorAll('.poll-opt-input')].map(i => i.value.trim()).filter(Boolean);
  if (options.length < 2) { showToast('Añade al menos 2 opciones'); return; }
  pushMsg({type:'poll', text:'', poll:{question, options: options.map(t => ({text:t, votes:0})), totalVotes:0, userVote:null}});
  document.getElementById('poll-modal').style.display = 'none';
  showToast('📊 Encuesta enviada');
}

function votePoll(msgId, optIdx) {
  const msg = findMsg(msgId);
  if (!msg?.poll) return;
  if (msg.poll.userVote !== null) { showToast('Ya votaste en esta encuesta'); return; }
  msg.poll.options[optIdx].votes++;
  msg.poll.totalVotes++;
  msg.poll.userVote = optIdx;
  saveStorage(); renderMessages();
}

/* ── PRODUCT ── */
function openProductModal() {
  if (!activeContact) { showToast('Selecciona un contacto primero'); return; }
  let products = SAMPLE_PRODUCTS;
  if (typeof LM_CATALOG !== 'undefined') {
    products = LM_CATALOG.map(p => ({id:p.id, name:p.name, price:'$'+p.price.toFixed(2), emoji:p.emoji, seller:p.seller}));
  } else {
    try {
      const stored = localStorage.getItem('lm_products') || localStorage.getItem('localmarket_products');
      if (stored) products = JSON.parse(stored);
    } catch {}
  }
  const picker = document.getElementById('product-picker');
  picker.innerHTML = products.map(p =>
    `<div class="product-picker-item" data-pid="${p.id}">
      <div class="ppi-img">${p.emoji||'🛒'}</div>
      <div class="ppi-info"><div class="ppi-name">${escapeHtml(p.name)}</div><div class="ppi-price">${escapeHtml(p.price)}</div></div>
    </div>`
  ).join('');
  picker.querySelectorAll('.product-picker-item').forEach(el => {
    el.addEventListener('click', () => {
      const p = products.find(x => String(x.id) === el.dataset.pid) || products[0];
      pushMsg({type:'product', text:'', product: p});
      document.getElementById('product-modal').style.display = 'none';
      showToast('🛒 Producto compartido');
    });
  });
  document.getElementById('product-modal').style.display = '';
}

/* ── SCHEDULE ── */
function openScheduleModal() {
  if (!activeContact) { showToast('Selecciona un contacto primero'); return; }
  const d = new Date(); d.setMinutes(d.getMinutes()+30);
  document.getElementById('schedule-time').value = d.toISOString().slice(0,16);
  document.getElementById('schedule-text').value = '';
  document.getElementById('schedule-modal').style.display = '';
}

function sendScheduled() {
  const text = document.getElementById('schedule-text').value.trim();
  const time = document.getElementById('schedule-time').value;
  if (!text) { showToast('Escribe un mensaje'); return; }
  if (!time) { showToast('Selecciona una fecha'); return; }
  const dt = new Date(time);
  const delayMs = dt.getTime() - Date.now();
  if (delayMs <= 0) { showToast('La hora debe ser en el futuro'); return; }
  const label = dt.toLocaleString('es',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const cid = activeContact.id;
  const msgId = pushMsg({type:'scheduled', text, scheduledTime: label});
  document.getElementById('schedule-modal').style.display = 'none';
  showToast('⏰ Mensaje programado para ' + label);

  if (msgId) {
    scheduledTimers[msgId] = setTimeout(() => {
      const msgs = chatData[cid];
      if (!msgs) return;
      const idx = msgs.findIndex(m => m.id === msgId);
      if (idx === -1) return;
      msgs[idx] = { ...msgs[idx], type:'text', scheduledTime: null, time: nowTime() };
      saveStorage();
      if (activeContact?.id === cid) renderMessages();
      showToast('📨 Mensaje programado enviado');
    }, delayMs);
  }
}

/* ── REACTIONS ── */
function showReactionPicker(msgId, anchorEl) {
  reactionTargetId = msgId;
  const picker = document.getElementById('reaction-picker');
  picker.style.display = '';
  const rect = anchorEl.getBoundingClientRect();
  picker.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  picker.style.top  = (rect.top - 60) + 'px';
  setTimeout(() => {
    const dismiss = e => {
      if (!e.target.closest('#reaction-picker')) {
        picker.style.display = 'none';
        document.removeEventListener('click', dismiss);
      }
    };
    document.addEventListener('click', dismiss);
  }, 0);
}

function toggleReaction(msgId, emoji) {
  const msg = findMsg(msgId);
  if (!msg) return;
  msg.reactions = msg.reactions || {};
  if (msg.myReaction === emoji) {
    msg.reactions[emoji] = Math.max(0, (msg.reactions[emoji]||1) - 1);
    if (!msg.reactions[emoji]) delete msg.reactions[emoji];
    msg.myReaction = null;
  } else {
    if (msg.myReaction) {
      msg.reactions[msg.myReaction] = Math.max(0, (msg.reactions[msg.myReaction]||1) - 1);
      if (!msg.reactions[msg.myReaction]) delete msg.reactions[msg.myReaction];
    }
    msg.reactions[emoji] = (msg.reactions[emoji]||0) + 1;
    msg.myReaction = emoji;
  }
  saveStorage(); renderMessages();
}

/* ── REPLY TO ── */
function setReplyTo(msg) {
  replyingTo = msg;
  document.getElementById('reply-preview-bar').style.display = '';
  document.getElementById('rp-name').textContent = msg.from === 'me' ? 'Tú' : (activeContact?.name||'');
  document.getElementById('rp-text').textContent =
    {audio:'🎵 Audio',image:'📷 Imagen',location:'📍 Ubicación',product:'🛒 Producto',poll:'📊 Encuesta'}[msg.type] || msg.text || '';
  document.getElementById('msg-input').focus();
}

function closeReplyPreview() {
  replyingTo = null;
  document.getElementById('reply-preview-bar').style.display = 'none';
}

/* ── LIGHTBOX ── */
function openLightbox(src) {
  if (!src) return;
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').style.display = '';
}
function closeLightbox() {
  document.getElementById('lightbox').style.display = 'none';
  document.getElementById('lightbox-img').src = '';
}

/* ── ACTION PANEL ── */
function toggleActionPanel() {
  actionPanelOpen = !actionPanelOpen;
  document.getElementById('action-panel').style.display = actionPanelOpen ? '' : 'none';
  document.getElementById('plus-btn').classList.toggle('open', actionPanelOpen);
}

/* ── INFO PANEL ── */
function renderInfoPanel() {
  if (!activeContact) return;
  const c = activeContact;
  const wrap = document.getElementById('info-avatar-wrap');
  wrap.innerHTML = '';
  wrap.appendChild(makeAvatar(c, 72));
  document.getElementById('info-name-panel').textContent = c.name;
  document.getElementById('info-role-panel').textContent = c.role;

  const imgs = (chatData[c.id]||[]).filter(m => m.type==='image' && m.imgSrc);
  const grid = document.getElementById('shared-grid');
  if (imgs.length) {
    grid.innerHTML = imgs.slice(0,6).map(m =>
      `<div class="shared-thumb" onclick="openLightbox('${escapeHtml(m.imgSrc||'')}')">
        <img src="${escapeHtml(m.imgSrc||'')}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px">
      </div>`
    ).join('');
  } else {
    grid.innerHTML = ['🥖','🥬','☕','🎨','🥐','📦'].map(e => `<div class="shared-thumb">${e}</div>`).join('');
  }

  let extra = '';
  if (c.isDriver && c.delivery) {
    const prod = (c.delivery.producto && (c.delivery.producto.nombre || c.delivery.producto)) || c.delivery.item || 'pedido';
    extra = `<div class="info-detail-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      Estado: ${escapeHtml(c.deliveryStatus||'en camino')}
    </div>
    <div class="info-detail-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
      Pedido: ${escapeHtml(String(prod))}
    </div>`;
  }

  document.getElementById('info-details-wrap').innerHTML = `
    <div class="info-detail-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      ${escapeHtml(c.distance)} de distancia
    </div>
    <div class="info-detail-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      ${c.online ? 'Activo ahora' : 'Última vez hace 2 horas'}
    </div>
    ${c.isSeller ? `<div class="info-detail-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      Vendedor verificado ✓
    </div>` : ''}
    ${extra}`;
}

function toggleInfoPanel() {
  infoVisible = !infoVisible;
  document.getElementById('info-panel').classList.toggle('visible', infoVisible);
}

/* ── VOICE CALL ── */
function startVoiceCall() {
  if (!activeContact) return;
  const overlay = document.getElementById('voice-overlay');
  document.getElementById('vc-avatar').style.background = activeContact.color;
  document.getElementById('vc-avatar').textContent = activeContact.initials;
  document.getElementById('vc-name').textContent = activeContact.name;
  document.getElementById('vc-status').textContent = 'Llamando...';
  document.getElementById('vc-timer').textContent = '';
  document.getElementById('vc-waves').classList.remove('active');
  vcMuted = vcSpeaker = false;
  document.getElementById('vc-mute').classList.remove('on');
  document.getElementById('vc-speaker').classList.remove('on');
  overlay.classList.add('open');
  setTimeout(() => {
    if (!overlay.classList.contains('open')) return;
    document.getElementById('vc-status').textContent = 'En llamada';
    document.getElementById('vc-waves').classList.add('active');
    callSeconds = 0; clearInterval(callTimer);
    callTimer = setInterval(() => { callSeconds++; document.getElementById('vc-timer').textContent = formatTimer(callSeconds); }, 1000);
  }, 2500);
}

function endVoiceCall() {
  clearInterval(callTimer);
  document.getElementById('voice-overlay').classList.remove('open');
}

/* ── VIDEO CALL ── */
function startVideoCall() {
  if (!activeContact) return;
  const overlay = document.getElementById('video-overlay');
  document.getElementById('video-contact-name').textContent = activeContact.name;
  document.getElementById('video-connecting-name').textContent = activeContact.name;
  document.getElementById('video-connecting-status').textContent = 'Conectando...';
  document.getElementById('video-timer').textContent = '';
  document.getElementById('video-status-overlay').classList.remove('hidden');
  document.getElementById('video-remote-name').textContent = '';
  vidMuted = vidCamOff = vidScreenOn = false;
  document.getElementById('vid-mute').classList.remove('off');
  document.getElementById('vid-cam').classList.remove('off');
  document.getElementById('vid-screen').classList.remove('off');
  document.getElementById('video-bg-anim').style.display = '';
  document.getElementById('video-cam-off').style.display = 'none';
  document.getElementById('video-local-anim').style.display = '';
  document.getElementById('video-local-off').style.display = 'none';
  overlay.classList.add('open');
  setTimeout(() => {
    if (!overlay.classList.contains('open')) return;
    document.getElementById('video-connecting-status').textContent = 'Llamada en curso';
    setTimeout(() => {
      if (!overlay.classList.contains('open')) return;
      document.getElementById('video-status-overlay').classList.add('hidden');
      document.getElementById('video-remote-name').textContent = activeContact.name;
      callSeconds = 0; clearInterval(callTimer);
      callTimer = setInterval(() => { callSeconds++; document.getElementById('video-timer').textContent = formatTimer(callSeconds); }, 1000);
    }, 800);
  }, 2000);
}

function endVideoCall() {
  clearInterval(callTimer);
  document.getElementById('video-overlay').classList.remove('open');
}

/* ── EMOJI PANEL ── */
function buildEmojiPanel() {
  const panel = document.getElementById('emoji-panel');
  panel.innerHTML = EMOJIS.map(e => `<button class="emoji-btn-item" data-emoji="${e}">${e}</button>`).join('');
  panel.querySelectorAll('.emoji-btn-item').forEach(btn =>
    btn.addEventListener('click', () => {
      document.getElementById('msg-input').value += btn.dataset.emoji;
      document.getElementById('msg-input').focus();
    })
  );
}

/* ── EVENTS ── */
window.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  buildEmojiPanel();
  renderContacts();

  document.getElementById('contacts-search').addEventListener('input', renderContacts);

  document.querySelectorAll('.ctab').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderContacts();
    })
  );

  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('msg-input').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  document.querySelectorAll('.ch-btn, .info-quick-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      if (btn.dataset.act === 'voice') startVoiceCall();
      else if (btn.dataset.act === 'video') startVideoCall();
      else if (btn.dataset.act === 'info') toggleInfoPanel();
    })
  );

  document.getElementById('ch-back').addEventListener('click', () => {
    document.getElementById('contacts-sidebar').classList.remove('hidden');
    document.getElementById('chat-window').classList.remove('visible');
    document.getElementById('chat-empty').style.display = '';
    activeContact = null; renderContacts();
  });

  document.getElementById('emoji-toggle').addEventListener('click', () =>
    document.getElementById('emoji-panel').classList.toggle('open')
  );

  document.getElementById('plus-btn').addEventListener('click', e => { e.stopPropagation(); toggleActionPanel(); });

  document.getElementById('act-image').addEventListener('click',    () => { document.getElementById('img-input').click(); toggleActionPanel(); });
  document.getElementById('act-location').addEventListener('click', () => { sendLocation(); toggleActionPanel(); });
  document.getElementById('act-poll').addEventListener('click',     () => { openPollModal(); toggleActionPanel(); });
  document.getElementById('act-product').addEventListener('click',  () => { openProductModal(); toggleActionPanel(); });
  document.getElementById('act-schedule').addEventListener('click', () => { openScheduleModal(); toggleActionPanel(); });
  document.getElementById('act-file').addEventListener('click',     () => { document.getElementById('file-input').click(); toggleActionPanel(); });

  document.getElementById('img-input').addEventListener('change', e => {
    if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('file-input').addEventListener('change', e => {
    if (e.target.files?.[0]) showToast(`📎 Archivo: ${e.target.files[0].name} (demo)`);
    e.target.value = '';
  });

  document.getElementById('voice-btn').addEventListener('click', () =>
    isRecording ? stopRecording() : startRecording()
  );
  document.getElementById('rec-cancel').addEventListener('click', () => stopRecording(true));

  document.getElementById('rp-close').addEventListener('click', closeReplyPreview);

  document.getElementById('new-chat-btn').addEventListener('click', () =>
    showToast('Selecciona un contacto para iniciar un chat 💬')
  );

  document.getElementById('vc-mute').addEventListener('click', () => {
    vcMuted = !vcMuted;
    document.getElementById('vc-mute').classList.toggle('on', vcMuted);
    showToast(vcMuted ? '🎤 Micrófono silenciado' : '🎤 Micrófono activado');
  });
  document.getElementById('vc-speaker').addEventListener('click', () => {
    vcSpeaker = !vcSpeaker;
    document.getElementById('vc-speaker').classList.toggle('on', vcSpeaker);
    showToast(vcSpeaker ? '🔊 Altavoz activado' : '🔊 Altavoz desactivado');
  });
  document.getElementById('vc-end').addEventListener('click', endVoiceCall);

  document.getElementById('vid-mute').addEventListener('click', () => {
    vidMuted = !vidMuted;
    document.getElementById('vid-mute').classList.toggle('off', vidMuted);
    showToast(vidMuted ? '🎤 Micro silenciado' : '🎤 Micro activado');
  });
  document.getElementById('vid-cam').addEventListener('click', () => {
    vidCamOff = !vidCamOff;
    document.getElementById('vid-cam').classList.toggle('off', vidCamOff);
    document.getElementById('video-local-anim').style.display = vidCamOff ? 'none' : '';
    document.getElementById('video-local-off').style.display  = vidCamOff ? '' : 'none';
    showToast(vidCamOff ? '📷 Cámara desactivada' : '📷 Cámara activada');
  });
  document.getElementById('vid-screen').addEventListener('click', () => {
    vidScreenOn = !vidScreenOn;
    document.getElementById('vid-screen').classList.toggle('off', vidScreenOn);
    showToast(vidScreenOn ? '🖥️ Compartiendo pantalla' : '🖥️ Pantalla dejó de compartirse');
  });
  document.getElementById('vid-end').addEventListener('click', endVideoCall);
  document.getElementById('video-close').addEventListener('click', endVideoCall);

  document.getElementById('dt-expand').addEventListener('click', () => {
    const status = activeContact?.deliveryStatus || 'en_camino';
    const msgs = {confirmado:'Pedido confirmado. El repartidor lo recogerá pronto.',preparando:'El establecimiento está preparando tu pedido.',en_camino:'Tu pedido está en camino hacia tu dirección.',entregado:'Pedido entregado exitosamente. ¡Disfrútalo!'};
    showToast(msgs[status] || 'Estado del pedido');
  });

  document.getElementById('poll-close').addEventListener('click', () => document.getElementById('poll-modal').style.display = 'none');
  document.getElementById('poll-modal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.style.display = 'none'; });
  document.getElementById('poll-add-opt').addEventListener('click', () => {
    const wrap = document.getElementById('poll-options-wrap');
    const n = wrap.querySelectorAll('.poll-opt-input').length + 1;
    if (n > 6) { showToast('Máximo 6 opciones'); return; }
    const inp = document.createElement('input');
    inp.className = 'modal-input poll-opt-input';
    inp.placeholder = `Opción ${n}`;
    wrap.appendChild(inp);
  });
  document.getElementById('poll-send').addEventListener('click', sendPoll);

  document.getElementById('schedule-close').addEventListener('click', () => document.getElementById('schedule-modal').style.display = 'none');
  document.getElementById('schedule-modal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.style.display = 'none'; });
  document.getElementById('schedule-send').addEventListener('click', sendScheduled);

  document.getElementById('product-close').addEventListener('click', () => document.getElementById('product-modal').style.display = 'none');
  document.getElementById('product-modal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.style.display = 'none'; });

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-bg').addEventListener('click', closeLightbox);

  document.getElementById('reaction-picker').querySelectorAll('button').forEach(btn =>
    btn.addEventListener('click', () => {
      if (reactionTargetId) {
        toggleReaction(reactionTargetId, btn.dataset.emoji);
        document.getElementById('reaction-picker').style.display = 'none';
      }
    })
  );

  document.addEventListener('click', e => {
    if (!e.target.closest('#emoji-toggle') && !e.target.closest('#emoji-panel'))
      document.getElementById('emoji-panel').classList.remove('open');
    if (!e.target.closest('#plus-btn') && !e.target.closest('#action-panel') && actionPanelOpen)
      toggleActionPanel();
  });

  // Refresh driver contacts when deliveries change in another tab
  window.addEventListener('storage', e => {
    if (e.key !== 'localmarket_deliveries') return;
    const newDrivers = loadDeliveryDriverContacts();
    CONTACTS = [...BASE_CONTACTS, ...newDrivers];
    newDrivers.forEach(c => {
      if (!chatData[c.id]) {
        chatData[c.id] = c.msgs.map((m, i) => ({
          ...m, id:`${c.id}_init_${i}`, type: m.type||'text', reactions:{}, replyTo:null, read:false,
        }));
        unreadMap[c.id] = 1;
      }
    });
    renderContacts();
  });

  // Abrir chat pre-seleccionado (desde Entregas o Marketplace)
  const preselect = sessionStorage.getItem('lm_open_chat_seller');
  const preselectFilter = sessionStorage.getItem('lm_open_chat_filter');
  if (preselect) {
    sessionStorage.removeItem('lm_open_chat_seller');
    sessionStorage.removeItem('lm_open_chat_filter');

    // Activar el filtro de pestaña si viene uno (drivers / sellers)
    if (preselectFilter) {
      const filterBtn = document.querySelector(`.ctab[data-filter="${preselectFilter}"]`);
      if (filterBtn) {
        document.querySelectorAll('.ctab').forEach(b => b.classList.remove('active'));
        filterBtn.classList.add('active');
        activeFilter = preselectFilter;
      }
    }

    renderContacts();   // re-renderiza con el filtro activo

    const match = CONTACTS.find(c =>
      c.name.toLowerCase() === preselect.toLowerCase() ||
      c.name.toLowerCase().includes(preselect.toLowerCase())
    );
    if (match) setTimeout(() => openChat(match.id), 150);
  }
});
