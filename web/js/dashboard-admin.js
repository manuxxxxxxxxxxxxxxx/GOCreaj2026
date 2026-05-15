/* ═══════════════════════════════════════════════════════════
   LocalMarket · Dashboard Admin
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {
  /* Guard: admin only */
  if (typeof lmRequireRole === 'function') {
    if (!lmRequireRole('admin', 'master_admin')) return;
  }

  const user = typeof lmGetUser === 'function' ? lmGetUser() : {};
  const nameSub = document.getElementById('admin-name-sub');
  if (nameSub) nameSub.textContent = (user.name || user.email || 'Admin') + ' · Administrador';

  /* ── Storage keys ── */
  const USERS_KEY  = 'lm_all_users_v1';
  const ORDERS_KEY = 'lm_orders_v1';

  /* ── Data helpers ── */
  function getUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return seedUsers();
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : seedUsers();
    } catch { return seedUsers(); }
  }

  function saveUsers(list) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch {}
  }

  function seedUsers() {
    const seed = [
      { id: 'u1', email: 'ana.garcia@example.com',  name: 'Ana García',     role: 'seller', status: 'verified',  createdAt: '2026-01-15T10:00:00Z' },
      { id: 'u2', email: 'pedro.r@example.com',     name: 'Pedro Ramírez',  role: 'driver', status: 'pending',   createdAt: '2026-02-03T14:30:00Z' },
      { id: 'u3', email: 'maria.l@example.com',     name: 'María López',    role: 'buyer',  status: 'verified',  createdAt: '2026-02-20T09:15:00Z' },
      { id: 'u4', email: 'carlos.m@example.com',    name: 'Carlos Martínez',role: 'seller', status: 'pending',   createdAt: '2026-03-01T11:45:00Z' },
      { id: 'u5', email: 'lucia.f@example.com',     name: 'Lucía Fernández',role: 'buyer',  status: 'verified',  createdAt: '2026-03-10T16:20:00Z' },
    ];
    saveUsers(seed);
    return seed;
  }

  function getOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  /* ── Helpers ── */
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

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
  }

  /* ── Stats ── */
  function renderStats() {
    const users  = getUsers();
    const orders = getOrders();

    const revenue = orders
      .filter(o => o.status === 'entregado')
      .reduce((s, o) => s + (Number(o.total) || 0), 0);

    const pending = users.filter(u => u.status === 'pending').length;

    document.getElementById('stat-revenue').textContent = '$' + revenue.toFixed(2);
    document.getElementById('stat-users').textContent = users.length;
    document.getElementById('stat-transactions').textContent = orders.length;
    document.getElementById('stat-pending').textContent = pending;
  }

  /* ── Recent activity ── */
  function renderActivity() {
    const orders = getOrders().slice(0, 6);
    const el = document.getElementById('recent-activity');
    if (!el) return;

    if (!orders.length) {
      el.innerHTML = '<p style="color:#9ca3af;font-size:.85rem;text-align:center;padding:20px">Sin actividad reciente</p>';
      return;
    }

    const STATUS_CLASS = {
      confirmado: 'status-confirmado',
      preparando: 'status-preparando',
      en_camino:  'status-en_camino',
      entregado:  'status-entregado',
      listo:      'status-listo',
    };
    const STATUS_LABEL = {
      confirmado: 'Confirmado',
      preparando: 'Preparando',
      en_camino:  'En camino',
      entregado:  'Entregado',
      listo:      'Listo',
    };

    el.innerHTML = orders.map(o => {
      const status   = o.status || 'confirmado';
      const initials = (o.id || 'LM').slice(0, 2).toUpperCase();
      return `
        <div class="activity-row">
          <div class="activity-avatar">${initials}</div>
          <div class="activity-info">
            <div class="activity-id">${escHtml(o.id || '—')}</div>
            <div class="activity-sub">${escHtml(o.customerName || o.email || 'Cliente')} · ${fmtDate(o.savedAt)}</div>
          </div>
          <span class="order-status ${STATUS_CLASS[status] || 'status-confirmado'}">
            ${STATUS_LABEL[status] || status}
          </span>
          <div class="activity-amount">$${Number(o.total || 0).toFixed(2)}</div>
        </div>
      `;
    }).join('');
  }

  /* ── Role breakdown ── */
  function renderRoleBreakdown() {
    const users = getUsers();
    const el = document.getElementById('role-breakdown');
    if (!el) return;

    const ROLES = [
      { key: 'buyer',  label: 'Compradores',  icon: '🛍️' },
      { key: 'seller', label: 'Vendedores',    icon: '🏪' },
      { key: 'driver', label: 'Repartidores',  icon: '🚴' },
      { key: 'admin',  label: 'Admins',        icon: '🔑' },
    ];

    el.innerHTML = ROLES.map(r => {
      const count = users.filter(u => u.role === r.key).length;
      return `
        <div class="role-row">
          <span class="role-label">${r.icon} ${r.label}</span>
          <span class="role-count">${count}</span>
        </div>
      `;
    }).join('');
  }

  /* ── Users table ── */
  let searchTerm  = '';
  let filterRole  = '';
  let filterStatus = '';

  function renderUsersTable() {
    let users = getUsers();

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      users = users.filter(u =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.name  || '').toLowerCase().includes(q)
      );
    }
    if (filterRole)   users = users.filter(u => u.role   === filterRole);
    if (filterStatus) users = users.filter(u => u.status === filterStatus);

    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Sin usuarios que coincidan</td></tr>';
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div style="font-weight:600">${escHtml(u.name || '—')}</div>
          <div style="font-size:.75rem;color:#64748b">${escHtml(u.email)}</div>
        </td>
        <td><span class="role-pill ${escHtml(u.role)}">${escHtml(u.role)}</span></td>
        <td><span class="status-pill ${escHtml(u.status)}">${escHtml(u.status)}</span></td>
        <td style="font-size:.8rem;color:#64748b">${fmtDate(u.createdAt)}</td>
        <td>
          <div class="action-btns">
            ${u.status === 'pending' ? `
            <button class="btn-icon success" data-verify="${escHtml(u.id)}" title="Verificar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>` : ''}
            ${u.status !== 'suspended' && u.status !== 'banned' ? `
            <button class="btn-icon" data-suspend="${escHtml(u.id)}" title="Suspender">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </button>` : `
            <button class="btn-icon success" data-unsuspend="${escHtml(u.id)}" title="Restaurar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.49"/></svg>
            </button>`}
            <button class="btn-icon danger" data-ban="${escHtml(u.id)}" title="Banear">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    /* Wire action buttons */
    tbody.querySelectorAll('[data-verify]').forEach(btn => {
      btn.addEventListener('click', function () {
        updateUserStatus(this.dataset.verify, 'verified');
        toast('✅ Usuario verificado');
      });
    });
    tbody.querySelectorAll('[data-suspend]').forEach(btn => {
      btn.addEventListener('click', function () {
        updateUserStatus(this.dataset.suspend, 'suspended');
        toast('⏸ Usuario suspendido');
      });
    });
    tbody.querySelectorAll('[data-unsuspend]').forEach(btn => {
      btn.addEventListener('click', function () {
        updateUserStatus(this.dataset.unsuspend, 'verified');
        toast('✅ Usuario restaurado');
      });
    });
    tbody.querySelectorAll('[data-ban]').forEach(btn => {
      btn.addEventListener('click', function () {
        if (!confirm('¿Banear permanentemente a este usuario?')) return;
        updateUserStatus(this.dataset.ban, 'banned');
        toast('🚫 Usuario baneado');
      });
    });
  }

  function updateUserStatus(uid, status) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === uid);
    if (idx === -1) return;
    users[idx].status = status;
    saveUsers(users);
    renderStats();
    renderUsersTable();
    renderRoleBreakdown();
  }

  /* ── Filters ── */
  function bindFilters() {
    const searchInput  = document.getElementById('search-users');
    const roleSelect   = document.getElementById('filter-role');
    const statusSelect = document.getElementById('filter-status');

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchTerm = this.value.trim();
        renderUsersTable();
      });
    }
    if (roleSelect) {
      roleSelect.addEventListener('change', function () {
        filterRole = this.value;
        renderUsersTable();
      });
    }
    if (statusSelect) {
      statusSelect.addEventListener('change', function () {
        filterStatus = this.value;
        renderUsersTable();
      });
    }
  }

  /* ── Init ── */
  renderStats();
  renderActivity();
  renderRoleBreakdown();
  renderUsersTable();
  bindFilters();
});
