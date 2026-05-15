/* ═══════════════════════════════════════════════════════════
   LocalMarket · auth-guard.js
   Frontend auth middleware for protected pages.
   Load AFTER shared.js, BEFORE any page-specific scripts.

   Behaviour (synchronous, runs immediately):
     1. Decode JWT from localStorage → check expiry
     2. Fallback to demo session (lm_user_v1)
     3. If neither → redirect to /login
     4. If page requires specific role and user lacks it → redirect
   On DOMContentLoaded:
     5. Rebuild #main-nav-links with only items allowed for user's role
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── JWT DECODE ─────────────────────────────────────────── */
  function decodeJwt(token) {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return null;
      /* base64url → base64 */
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      var pad = b64.length % 4;
      if (pad) b64 += '===='.slice(pad);
      var data = JSON.parse(atob(b64));
      if (data.exp && Date.now() / 1000 > data.exp) return null;
      return data;
    } catch (e) { return null; }
  }

  /* ── PAGE ROLE REQUIREMENTS ─────────────────────────────── */
  /* Pages not listed here allow any authenticated user */
  var PAGE_ROLES = {
    'dashboard-admin.html':      ['admin', 'master_admin'],
    'dashboard-vendedor.html':   ['seller', 'admin', 'master_admin'],
    'dashboard-repartidor.html': ['driver', 'admin', 'master_admin'],
  };

  var pageName = window.location.pathname.split('/').pop() || 'index.html';

  /* ── SESSION RESOLUTION ─────────────────────────────────── */
  var currentUser = null;
  var sessionMode = 'none'; /* 'jwt' | 'demo' | 'none' */

  /* 1. JWT path */
  var token = localStorage.getItem('lm_access_token');
  if (token) {
    var payload = decodeJwt(token);
    if (payload) {
      currentUser = {
        id:     payload.userId || payload.sub || '',
        role:   payload.role   || 'buyer',
        status: payload.status || 'verified',
        email:  payload.email  || '',
        name:   payload.name   || '',
      };
      sessionMode = 'jwt';
    }
  }

  /* 2. Demo/localStorage fallback */
  if (!currentUser) {
    try {
      var raw = localStorage.getItem('lm_user_v1');
      if (raw) {
        var demo = JSON.parse(raw);
        if (demo && demo.email && demo.name && demo.name !== 'Mi perfil') {
          currentUser = demo;
          sessionMode = 'demo';
        }
      }
    } catch (e) {}
  }

  /* ── REDIRECT: NOT LOGGED IN ────────────────────────────── */
  if (!currentUser) {
    window.location.replace('../html/login.html');
    /* Throw stops further script execution while redirect loads */
    throw new Error('[LM Guard] Not authenticated – redirecting to login');
  }

  /* ── REDIRECT: INSUFFICIENT ROLE ────────────────────────── */
  var requiredRoles = PAGE_ROLES[pageName];
  if (requiredRoles && !requiredRoles.includes(currentUser.role)) {
    var fallback = '../html/index.html';
    var r = currentUser.role;
    if (r === 'seller')                        fallback = '../html/dashboard-vendedor.html';
    else if (r === 'driver')                   fallback = '../html/dashboard-repartidor.html';
    else if (r === 'admin' || r === 'master_admin') fallback = '../html/dashboard-admin.html';
    window.location.replace(fallback);
    throw new Error('[LM Guard] Insufficient role – redirecting');
  }

  /* ── EXPOSE GLOBALS ─────────────────────────────────────── */
  window.LM_CURRENT_USER = currentUser;
  window.LM_SESSION_MODE = sessionMode;
  window.LM_Guard = {
    user:  currentUser,
    mode:  sessionMode,
    isJwt: sessionMode === 'jwt',
    logout: function () {
      localStorage.removeItem('lm_access_token');
      localStorage.removeItem('lm_refresh_token');
      /* clear demo session too */
      localStorage.removeItem('lm_user_v1');
      window.location.href = '../html/login.html';
    },
  };

  /* ── NAV ITEM DEFINITIONS ───────────────────────────────── */
  /* roles: null = visible to ALL authenticated users */
  var NAV_ITEMS = [
    {
      label: 'Inicio',
      href:  '../html/index.html',
      roles: null,
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    },
    {
      label: 'Marketplace',
      href:  '../html/market.html',
      roles: null,
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    },
    {
      label: 'Entregas',
      href:  '../html/Entregas.html',
      roles: null,
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    },
    {
      label: 'Reels',
      href:  '../html/Reels.html',
      roles: null,
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="8" cy="12" r="2"/><path d="M16 8l-4 4 4 4"/></svg>',
    },
    {
      label: 'Chat',
      href:  '../html/Chat.html',
      roles: null,
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    },
    {
      label: 'Historial',
      href:  '../html/historial.html',
      /* Drivers have their own earnings view, not order history */
      roles: ['buyer', 'seller', 'admin', 'master_admin'],
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>',
    },
    {
      label: 'Mis Ventas',
      href:  '../html/dashboard-vendedor.html',
      roles: ['seller', 'admin', 'master_admin'],
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>',
    },
    {
      label: 'Mis Rutas',
      href:  '../html/dashboard-repartidor.html',
      roles: ['driver', 'admin', 'master_admin'],
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    },
    {
      label: 'Administración',
      href:  '../html/dashboard-admin.html',
      roles: ['admin', 'master_admin'],
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    },
    {
      label: 'Perfil',
      href:  '../html/perfil.html',
      roles: null,
      icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    },
  ];

  /* ── REBUILD NAV ON DOM READY ───────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    var ul = document.getElementById('main-nav-links');
    if (!ul) return;

    var role        = currentUser.role;
    var currentPath = window.location.pathname;

    var items = NAV_ITEMS.filter(function (item) {
      return !item.roles || item.roles.includes(role);
    });

    ul.innerHTML = items.map(function (item) {
      /* Detect active page by comparing the end of the path */
      var target  = item.href.split('/').pop();
      var isActive = currentPath.endsWith('/' + target) || currentPath.endsWith('\\' + target);
      var cls = isActive ? ' class="active"' : '';
      return '<li><a href="' + item.href + '"' + cls + '>' + item.icon + ' ' + item.label + '</a></li>';
    }).join('');

    /* Personalise the profile/user button text if present */
    var rolesBtn = document.querySelector('.roles-btn, .nav-user-btn');
    if (rolesBtn && currentUser.name) {
      var firstName = currentUser.name.split(' ')[0];
      rolesBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">' +
        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ' +
        firstName;
    }
  });

})();
