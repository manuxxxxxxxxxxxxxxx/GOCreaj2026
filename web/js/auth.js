/* ═══════════════════════════════════════════════════════════
   LocalMarket · auth.js
   Login / registro de usuarios.
   Carga DESPUÉS de shared.js (necesita LM_API, lmGetUser, etc.)

   Estrategia:
     - Intenta llamar al backend (LM_API).
     - Si el backend no responde (offline / demo), cae al modo
       localStorage demo para que la UI siempre funcione.
   ═══════════════════════════════════════════════════════════ */

/* ── SEED: usuarios demo ── */
var AUTH_DEMO_SEED = [
  { id:'u1', name:'Ana García',         email:'ana@demo.com',    role:'buyer',        status:'verified', joinedAt: Date.now()-86400000*30  },
  { id:'u2', name:'Panadería Don José', email:'jose@demo.com',   role:'seller',       status:'verified', joinedAt: Date.now()-86400000*90  },
  { id:'u3', name:'Carlos Martínez',   email:'carlos@demo.com', role:'driver',       status:'verified', joinedAt: Date.now()-86400000*15  },
  { id:'u4', name:'María López',        email:'maria@demo.com',  role:'driver',       status:'pending',  joinedAt: Date.now()-86400000*2   },
  { id:'u5', name:'Huerto Verde',       email:'huerto@demo.com', role:'seller',       status:'verified', joinedAt: Date.now()-86400000*60  },
  { id:'u6', name:'Café del Barrio',    email:'cafe@demo.com',   role:'seller',       status:'verified', joinedAt: Date.now()-86400000*45  },
  { id:'u7', name:'Luis Torres',        email:'luis@demo.com',   role:'buyer',        status:'verified', joinedAt: Date.now()-86400000*5   },
  { id:'u8', name:'José Hernández',     email:'jhern@demo.com',  role:'driver',       status:'pending',  joinedAt: Date.now()-86400000*1   },
  { id:'u9', name:'Admin LocalMarket',  email:'admin@demo.com',  role:'admin',        status:'verified', joinedAt: Date.now()-86400000*365 },
  { id:'u10',name:'Master Admin',       email:'master@demo.com', role:'master_admin', status:'verified', joinedAt: Date.now()-86400000*365 },
];

/* ── STATE ── */
var selectedRole = 'buyer';

/* ── HELPERS ── */
function authRedirect() {
  var dashUrl = lmDashboardUrl();
  window.location.href = dashUrl || '../html/index.html';
}

function showError(id, msg) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || '';
  if (msg) el.classList.add('visible');
  else      el.classList.remove('visible');
}

function clearErrors(ids) {
  ids.forEach(function (id) { showError(id, ''); });
}

function setInputError(inputId, errId, msg) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  if (msg) { inp.classList.add('error');    showError(errId, msg); }
  else      { inp.classList.remove('error'); showError(errId, ''); }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/* ── DEMO STORE ── */
function authSeedDemoUsers() {
  try {
    if (!localStorage.getItem('lm_all_users_v1')) {
      localStorage.setItem('lm_all_users_v1', JSON.stringify(AUTH_DEMO_SEED));
    }
  } catch (e) {}
}

function authGetAllUsers() {
  try {
    var raw = localStorage.getItem('lm_all_users_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return AUTH_DEMO_SEED;
}

function authSaveAllUsers(list) {
  try { localStorage.setItem('lm_all_users_v1', JSON.stringify(list)); } catch (e) {}
}

function authFindUser(email) {
  var users = authGetAllUsers();
  var lc    = email.trim().toLowerCase();
  for (var i = 0; i < users.length; i++) {
    if (users[i].email && users[i].email.toLowerCase() === lc) return users[i];
  }
  return null;
}

/* ── JWT STORAGE ── */
function authStoreTokens(accessToken, refreshToken) {
  localStorage.setItem('lm_access_token',  accessToken);
  localStorage.setItem('lm_refresh_token', refreshToken);
}

/* ── API CALL WRAPPER ── */
/* Returns parsed JSON or null on network/server error */
function authApiPost(path, body) {
  return fetch(LM_API + path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  .then(function (res) {
    return res.json().then(function (data) {
      return { ok: res.ok, status: res.status, data: data };
    });
  })
  .catch(function () { return null; }); /* network error → null */
}

/* ── TAB SWITCHING ── */
function initTabs() {
  var tabLogin    = document.getElementById('tab-login');
  var tabRegister = document.getElementById('tab-register');
  var formLogin   = document.getElementById('login-form');
  var formReg     = document.getElementById('register-form');

  function showLogin() {
    tabLogin.classList.add('active');
    tabLogin.setAttribute('aria-selected', 'true');
    tabRegister.classList.remove('active');
    tabRegister.setAttribute('aria-selected', 'false');
    formLogin.classList.remove('hidden');
    formReg.classList.add('hidden');
  }

  function showRegister() {
    tabRegister.classList.add('active');
    tabRegister.setAttribute('aria-selected', 'true');
    tabLogin.classList.remove('active');
    tabLogin.setAttribute('aria-selected', 'false');
    formReg.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }

  tabLogin.addEventListener('click', showLogin);
  tabRegister.addEventListener('click', showRegister);

  var goLoginLink = document.getElementById('go-login-link');
  if (goLoginLink) goLoginLink.addEventListener('click', showLogin);

  /* Auto-switch to register if URL has ?register=1 */
  if (window.location.search.includes('register=1')) showRegister();

  /* Show success message if redirected after email verify */
  if (window.location.search.includes('verified=true')) {
    showError('login-general-err', '');
    var verifyMsg = document.getElementById('login-verify-msg');
    if (verifyMsg) {
      verifyMsg.textContent = '¡Correo verificado! Ya puedes iniciar sesión.';
      verifyMsg.style.display = 'block';
    } else {
      lmToast('¡Correo verificado! Ya puedes iniciar sesión.');
    }
  }
}

/* ── ROLE SELECTOR ── */
function initRoleSelector() {
  var grid = document.getElementById('role-grid');
  if (!grid) return;

  selectedRole = 'buyer';

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.role-card');
    if (!card) return;
    grid.querySelectorAll('.role-card').forEach(function (c) {
      c.classList.remove('selected');
    });
    card.classList.add('selected');
    selectedRole = card.dataset.role || 'buyer';
  });
}

/* ── FORGOT PASSWORD ── */
function initForgot() {
  var link = document.getElementById('forgot-link');
  if (!link) return;
  link.addEventListener('click', function () {
    var email = document.getElementById('login-email').value.trim();
    if (!email || !isValidEmail(email)) {
      lmToast('Ingresa tu correo primero.');
      return;
    }
    authApiPost('/auth/forgot-password', { email: email })
      .then(function (res) {
        if (res) {
          lmToast('Si el correo existe, recibirás instrucciones.');
        } else {
          lmToast('Revisaremos tu solicitud. (modo demo)');
        }
      });
  });
}

/* ── LOGIN SUBMIT ── */
function initLoginForm() {
  var form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var emailVal = document.getElementById('login-email').value.trim();
    var passVal  = document.getElementById('login-password').value;

    clearErrors(['login-email-err','login-password-err','login-general-err']);

    var valid = true;
    if (!emailVal || !isValidEmail(emailVal)) {
      setInputError('login-email', 'login-email-err', 'Ingresa un correo válido.');
      valid = false;
    }
    if (!passVal) {
      setInputError('login-password', 'login-password-err', 'Ingresa tu contraseña.');
      valid = false;
    }
    if (!valid) return;

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Iniciando…'; }

    function restoreBtn() {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Iniciar Sesión'; }
    }

    /* ── API attempt ── */
    authApiPost('/auth/login', { email: emailVal, password: passVal })
      .then(function (res) {
        if (res === null) {
          /* Backend not available → demo mode */
          return loginDemo(emailVal, passVal);
        }

        if (!res.ok) {
          restoreBtn();
          if (res.status === 403 && res.data && res.data.code === 'EMAIL_NOT_VERIFIED') {
            showError('login-general-err', 'Verifica tu correo antes de iniciar sesión.');
          } else {
            showError('login-general-err', (res.data && res.data.error) || 'Credenciales incorrectas.');
          }
          return;
        }

        /* Success */
        var d = res.data;
        authStoreTokens(d.accessToken, d.refreshToken);
        lmSaveUser({
          id:     d.user.id,
          name:   d.user.name   || emailVal.split('@')[0],
          email:  d.user.email,
          role:   d.user.role,
          status: d.user.status,
        });
        lmToast('¡Bienvenido de nuevo!');
        setTimeout(authRedirect, 700);
      });
  });

  function loginDemo(emailVal) {
    var found = authFindUser(emailVal);
    if (!found) {
      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Iniciar Sesión'; }
      showError('login-general-err', 'Correo no registrado. Crea una cuenta primero.');
      return;
    }
    lmSaveUser({
      name:     found.name,
      email:    found.email,
      role:     found.role,
      status:   found.status || 'verified',
      joinedAt: found.joinedAt || Date.now(),
    });
    lmToast('¡Bienvenido, ' + found.name + '! (modo demo)');
    setTimeout(authRedirect, 800);
  }
}

/* ── REGISTER SUBMIT ── */
function initRegisterForm() {
  var form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var nameVal  = document.getElementById('reg-name').value.trim();
    var emailVal = document.getElementById('reg-email').value.trim();
    var passVal  = document.getElementById('reg-password').value;
    var termsEl  = document.getElementById('reg-terms');
    var termsOk  = termsEl ? termsEl.checked : true;

    clearErrors(['reg-name-err','reg-email-err','reg-password-err','reg-terms-err','reg-general-err']);

    var valid = true;
    if (!nameVal) {
      setInputError('reg-name', 'reg-name-err', 'Ingresa tu nombre.');
      valid = false;
    }
    if (!emailVal || !isValidEmail(emailVal)) {
      setInputError('reg-email', 'reg-email-err', 'Ingresa un correo válido.');
      valid = false;
    }
    if (!passVal || passVal.length < 6) {
      setInputError('reg-password', 'reg-password-err', 'La contraseña debe tener al menos 6 caracteres.');
      valid = false;
    }
    if (!termsOk) {
      showError('reg-terms-err', 'Debes aceptar los Términos y Condiciones.');
      valid = false;
    }
    if (!valid) return;

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creando cuenta…'; }

    function restoreBtn() {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Crear cuenta'; }
    }

    /* ── API attempt ── */
    authApiPost('/auth/register', {
      name:          nameVal,
      email:         emailVal,
      password:      passVal,
      role:          selectedRole,
      termsAccepted: 'true',
    }).then(function (res) {
      if (res === null) {
        /* Backend not available → demo mode */
        return registerDemo(nameVal, emailVal, passVal);
      }

      restoreBtn();

      if (!res.ok) {
        var msg = (res.data && res.data.error) || 'Error al crear la cuenta.';
        if (res.status === 409) {
          setInputError('reg-email', 'reg-email-err', 'Este correo ya está registrado.');
        } else {
          showError('reg-general-err', msg);
        }
        return;
      }

      /* Success: backend will send verification email */
      lmToast('¡Cuenta creada! Revisa tu correo para verificarla.');
      /* Switch to login tab after delay */
      setTimeout(function () {
        var tabLogin = document.getElementById('tab-login');
        if (tabLogin) tabLogin.click();
      }, 2000);
    });
  });

  function registerDemo(nameVal, emailVal) {
    var existing = authFindUser(emailVal);
    if (existing) {
      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Crear cuenta'; }
      setInputError('reg-email', 'reg-email-err', 'Este correo ya está registrado. Inicia sesión.');
      return;
    }

    var now     = Date.now();
    var newUser = {
      id:       'u' + now,
      name:     nameVal,
      email:    emailVal,
      role:     selectedRole,
      status:   'verified', /* demo: skip email verification */
      joinedAt: now,
    };

    var allUsers = authGetAllUsers();
    allUsers.push(newUser);
    authSaveAllUsers(allUsers);

    lmSaveUser({ name: nameVal, email: emailVal, role: selectedRole, status: 'verified', joinedAt: now });
    lmToast('¡Cuenta creada! (modo demo)');
    setTimeout(authRedirect, 1000);
  }
}

/* ── GOOGLE OAUTH ── */
function initGoogleButtons() {
  var btnLogin = document.getElementById('google-login-btn');
  var btnReg   = document.getElementById('google-reg-btn');

  function handleGoogle(e) {
    e.preventDefault();

    /* Real OAuth: redirect to backend */
    var apiBase = (typeof LM_API !== 'undefined') ? LM_API : '';
    if (apiBase) {
      window.location.href = apiBase + '/auth/google';
      return;
    }

    /* Demo fallback */
    var now = Date.now();
    lmSaveUser({ name:'Usuario Google', email:'google@user.com', role:'buyer', status:'verified', joinedAt: now });
    var allUsers = authGetAllUsers();
    if (!allUsers.find(function (u) { return u.email === 'google@user.com'; })) {
      allUsers.push({ id:'google_u', name:'Usuario Google', email:'google@user.com', role:'buyer', status:'verified', joinedAt: now });
      authSaveAllUsers(allUsers);
    }
    lmToast('Sesión iniciada con Google (demo)');
    setTimeout(authRedirect, 900);
  }

  if (btnLogin) btnLogin.addEventListener('click', handleGoogle);
  if (btnReg)   btnReg.addEventListener('click', handleGoogle);
}

/* ── HANDLE GOOGLE CALLBACK ── */
/* Page: /auth/callback?token=...&refresh=... */
function handleOAuthCallback() {
  var params  = new URLSearchParams(window.location.search);
  var token   = params.get('token');
  var refresh = params.get('refresh');
  if (!token) return;

  authStoreTokens(token, refresh || '');

  /* Decode minimal info from token to populate lm_user_v1 */
  try {
    var parts   = token.split('.');
    var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    lmSaveUser({
      id:     payload.userId || payload.sub,
      email:  payload.email  || '',
      role:   payload.role   || 'buyer',
      status: payload.status || 'verified',
      name:   payload.name   || '',
    });
  } catch (e) {}

  window.location.replace(lmDashboardUrl() || '../html/index.html');
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', function () {
  /* Handle Google OAuth callback page */
  if (window.location.pathname.includes('callback')) {
    handleOAuthCallback();
    return;
  }

  /* Seed demo users */
  authSeedDemoUsers();

  /* If already logged in (JWT or demo), redirect immediately */
  var hasJwt  = !!localStorage.getItem('lm_access_token');
  var hasDemo = (function () {
    try {
      var raw = localStorage.getItem('lm_user_v1');
      if (!raw) return false;
      var u = JSON.parse(raw);
      return !!(u.email && u.name && u.name !== 'Mi perfil');
    } catch (e) { return false; }
  })();

  if (hasJwt || hasDemo) {
    authRedirect();
    return;
  }

  initTabs();
  initRoleSelector();
  initForgot();
  initLoginForm();
  initRegisterForm();
  initGoogleButtons();
});
