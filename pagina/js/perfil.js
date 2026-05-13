/* LocalMarket · perfil.js */

let editingPersonal = false;

const ROLE_LABELS = {
  buyer:        '🛒 Comprador',
  seller:       '🏪 Vendedor',
  driver:       '🛵 Repartidor',
  admin:        '⚙️ Administrador',
  master_admin: '🔑 Master Admin',
};

/* Intenta traer el perfil real del backend y fusionarlo con localStorage */
async function syncProfileFromBackend() {
  const token = localStorage.getItem('lm_access_token');
  if (!token || typeof LM_API === 'undefined') return;
  try {
    const res = await fetch(LM_API + '/users/me', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) return;
    const data = await res.json();
    const u = data.data || data;
    lmSaveUser({
      id:     u.id,
      name:   u.name    || u.full_name || '',
      email:  u.email   || '',
      role:   u.role    || 'buyer',
      status: u.status  || 'verified',
      avatar: u.avatar  || u.avatar_url || null,
    });
  } catch { /* backend no disponible — ok */ }
}

function loadProfile() {
  const user = lmGetUser();
  const orders = lmGetOrders();
  const deliveries = (() => { try { return JSON.parse(localStorage.getItem(LM_KEYS.deliveries)||'[]'); } catch { return []; } })();

  // Hero
  const av = document.getElementById('perfil-avatar');
  if (user.avatar) {
    const img = document.createElement('img');
    img.src = user.avatar; img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover';
    av.innerHTML = ''; av.appendChild(img);
  } else {
    av.textContent = user.name ? user.name[0].toUpperCase() : '👤';
  }

  document.getElementById('hero-name').textContent = user.name || 'Mi perfil';
  document.getElementById('hero-role').textContent = ROLE_LABELS[user.role] || ROLE_LABELS.buyer;

  if (user.joinedAt) {
    const d = new Date(user.joinedAt);
    document.getElementById('hero-joined').textContent =
      'Miembro desde ' + d.toLocaleDateString('es', { month: 'long', year: 'numeric' });
  }

  const spent = orders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById('stat-orders').textContent = orders.length;
  document.getElementById('stat-spent').textContent = '$' + Math.round(spent);
  document.getElementById('stat-deliveries').textContent = deliveries.length;

  // Form fields
  document.getElementById('inp-name').value    = user.name    || '';
  document.getElementById('inp-email').value   = user.email   || '';
  document.getElementById('inp-phone').value   = user.phone   || '';
  document.getElementById('inp-address').value = user.address || '';
  document.getElementById('inp-bio').value     = user.bio     || '';

  // Role cards
  document.querySelectorAll('.role-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.role === (user.role||'buyer'));
  });
}

function setEditMode(on) {
  editingPersonal = on;
  const fields = document.querySelectorAll('#personal-form .perfil-input');
  fields.forEach(f => f.disabled = !on);
  document.getElementById('save-personal-btn').disabled = !on;
  const btn = document.getElementById('edit-personal-btn');
  btn.textContent = on ? '✕ Cancelar' : '✏️ Editar';
  btn.classList.toggle('active', on);
  if (!on) loadProfile(); // revert
}

window.addEventListener('DOMContentLoaded', () => {
  _lmSyncToggleIcons();
  loadProfile(); // carga inmediata desde localStorage

  // Edit toggle
  document.getElementById('edit-personal-btn').addEventListener('click', () => setEditMode(!editingPersonal));

  // Save form
  document.getElementById('personal-form').addEventListener('submit', e => {
    e.preventDefault();
    lmSaveUser({
      name:    document.getElementById('inp-name').value.trim(),
      email:   document.getElementById('inp-email').value.trim(),
      phone:   document.getElementById('inp-phone').value.trim(),
      address: document.getElementById('inp-address').value.trim(),
      bio:     document.getElementById('inp-bio').value.trim(),
    });
    setEditMode(false);
    loadProfile();
    lmToast('✅ Perfil guardado');
  });

  // Avatar change
  document.getElementById('avatar-change-btn').addEventListener('click', () =>
    document.getElementById('avatar-input').click()
  );
  document.getElementById('avatar-input').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      lmSaveUser({ avatar: ev.target.result });
      loadProfile();
      lmToast('✅ Foto actualizada');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // Role cards — el usuario NO puede cambiar su propio rol (solo admin puede hacerlo)
  const currentRole = lmGetUser().role;
  document.querySelectorAll('.role-card').forEach(card => {
    const isOwn = card.dataset.role === currentRole;
    card.classList.toggle('selected', isOwn);
    card.style.cursor = 'default';
    card.style.opacity = isOwn ? '1' : '0.5';
    card.title = isOwn ? 'Tu rol actual' : 'Solo un administrador puede cambiar tu rol';
  });

  // Danger zone
  document.getElementById('clear-orders-btn').addEventListener('click', () => {
    if (!confirm('¿Borrar todo el historial de pedidos?')) return;
    localStorage.removeItem(LM_KEYS.orders);
    loadProfile();
    lmToast('Historial borrado');
  });

  document.getElementById('clear-data-btn').addEventListener('click', () => {
    if (!confirm('¿Borrar TODOS tus datos de LocalMarket? Esta acción no se puede deshacer.')) return;
    [LM_KEYS.user, LM_KEYS.orders, LM_KEYS.chat, LM_KEYS.reels, LM_KEYS.checkout].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    localStorage.removeItem('lm_access_token');
    localStorage.removeItem('lm_refresh_token');
    lmToast('Datos borrados. Redirigiendo...');
    setTimeout(() => window.location.href = '../html/login.html', 1500);
  });

  // Botón de logout (si existe en el HTML)
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof LM_Guard !== 'undefined') {
        LM_Guard.logout();
      } else {
        localStorage.removeItem('lm_access_token');
        localStorage.removeItem('lm_refresh_token');
        lmLogout();
      }
    });
  }

  // Cargar datos del backend en segundo plano
  syncProfileFromBackend().then(loadProfile);
});
