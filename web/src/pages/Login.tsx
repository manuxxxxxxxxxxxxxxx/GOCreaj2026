import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import '../../css/auth.css';
import '../../css/dark.css';

export default function Login() {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('tab') === 'register');
  const [role, setRole] = useState(searchParams.get('role') || 'buyer');
  const navigate = useNavigate();

  // State for validation errors
  const [errors, setErrors] = useState({
    loginEmail: '',
    loginPassword: '',
    regName: '',
    regEmail: '',
    regPassword: '',
    regRole: '',
    regTerms: '',
    general: ''
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors = { ...errors, loginEmail: '', loginPassword: '', general: '' };

    const emailInput = (e.target as any).elements['login-email'].value;
    const passwordInput = (e.target as any).elements['login-password'].value;

    if (!emailInput || !emailInput.includes('@')) {
      newErrors.loginEmail = 'Ingresa un correo válido.';
      hasError = true;
    }
    if (!passwordInput) {
      newErrors.loginPassword = 'Ingresa tu contraseña.';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // Dynamic redirection: If email contains "admin", log them in as Administrator immediately
    if (emailInput.toLowerCase().includes('admin')) {
      navigate('/admin/dashboard');
      return;
    }

    // Redirect based on selected role
    if (role === 'seller') {
      navigate('/dashboard-vendedor');
    } else if (role === 'driver') {
      navigate('/dashboard-repartidor');
    } else {
      navigate('/');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors = { ...errors, regName: '', regEmail: '', regPassword: '', regRole: '', regTerms: '', general: '' };

    const nameInput = (e.target as any).elements['reg-name'].value;
    const emailInput = (e.target as any).elements['reg-email'].value;
    const passwordInput = (e.target as any).elements['reg-password'].value;
    const termsInput = (e.target as any).elements['reg-terms'].checked;

    if (!nameInput) {
      newErrors.regName = 'Ingresa tu nombre.';
      hasError = true;
    }
    if (!emailInput || !emailInput.includes('@')) {
      newErrors.regEmail = 'Ingresa un correo válido.';
      hasError = true;
    }
    if (!passwordInput || passwordInput.length < 6) {
      newErrors.regPassword = 'La contraseña debe tener al menos 6 caracteres.';
      hasError = true;
    }
    if (!role) {
      newErrors.regRole = 'Selecciona un tipo de cuenta.';
      hasError = true;
    }
    if (!termsInput) {
      newErrors.regTerms = 'Debes aceptar los términos y condiciones.';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    // Dynamic redirection: If email contains "admin", register & escalate to admin immediately
    if (emailInput.toLowerCase().includes('admin')) {
      navigate('/admin/dashboard');
      return;
    }

    // Redirect based on selected role
    if (role === 'seller') {
      navigate('/dashboard-vendedor');
    } else if (role === 'driver') {
      navigate('/dashboard-repartidor');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="auth-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative' }}>
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        {/* Logo matching SVGO style */}
        <div className="auth-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <div className="auth-logo-icon" style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#4A6D8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(74, 109, 140, 0.2)' }}>
            SV
          </div>
          <div>
            <div className="auth-logo-name" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111111', lineHeight: '1' }}>GO</div>
            <span className="auth-logo-tagline" style={{ fontSize: '0.75rem', color: '#5e697a', fontWeight: '600' }}>Envíos y Mercado Express</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs" role="tablist">
          <button 
            className={`auth-tab ${!isRegister ? 'active' : ''}`} 
            onClick={() => setIsRegister(false)}
            id="tab-login"
          >
            Iniciar Sesión
          </button>
          <button 
            className={`auth-tab ${isRegister ? 'active' : ''}`} 
            onClick={() => setIsRegister(true)}
            id="tab-register"
          >
            Registrarse
          </button>
        </div>

        {/* Interactive Role Selection Grid - 3 Roles: Comprador, Vendedor, Repartidor */}
        <div className="field-group" style={{ marginBottom: '24px' }}>
          <div className="role-selector-label" style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text)' }}>
            Selecciona tu perfil de usuario:
          </div>
          <div className="role-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div className={`role-card ${role === 'buyer' ? 'selected' : ''}`} onClick={() => setRole('buyer')} style={{ padding: '10px 4px' }}>
              <span className="role-card-emoji" style={{ fontSize: '1.4rem' }}>🛒</span>
              <span className="role-card-label" style={{ fontSize: '0.65rem' }}>Comprador</span>
            </div>
            <div className={`role-card ${role === 'seller' ? 'selected' : ''}`} onClick={() => setRole('seller')} style={{ padding: '10px 4px' }}>
              <span className="role-card-emoji" style={{ fontSize: '1.4rem' }}>🏪</span>
              <span className="role-card-label" style={{ fontSize: '0.65rem' }}>Vendedor</span>
            </div>
            <div className={`role-card ${role === 'driver' ? 'selected' : ''}`} onClick={() => setRole('driver')} style={{ padding: '10px 4px' }}>
              <span className="role-card-emoji" style={{ fontSize: '1.4rem' }}>🛵</span>
              <span className="role-card-label" style={{ fontSize: '0.65rem' }}>Repartidor</span>
            </div>
          </div>
        </div>

        {/* LOGIN FORM */}
        {!isRegister && (
          <form className="auth-form" id="login-form" onSubmit={handleLogin} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="login-email">Correo electrónico</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
                </span>
                <input
                  className="auth-input"
                  id="login-email"
                  name="login-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              {errors.loginEmail && <span className="field-error show">{errors.loginEmail}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="login-password">Contraseña</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  className="auth-input"
                  id="login-password"
                  name="login-password"
                  type="password"
                  placeholder="Tu contraseña"
                />
              </div>
              {errors.loginPassword && <span className="field-error show">{errors.loginPassword}</span>}
            </div>

            <span className="auth-forgot">¿Olvidaste tu contraseña?</span>

            <button className="auth-btn" type="submit" style={{ background: 'var(--blue)', border: 'none', borderRadius: '12px', height: '48px', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(74, 109, 140, 0.3)' }}>
              Acceder como {role === 'buyer' ? 'Comprador' : role === 'seller' ? 'Vendedor' : 'Repartidor'}
            </button>

            <div className="auth-divider">o continúa con</div>

            <button className="social-btn" type="button">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {isRegister && (
          <form className="auth-form" id="register-form" onSubmit={handleRegister} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="reg-name">Nombre completo</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input
                  className="auth-input"
                  id="reg-name"
                  name="reg-name"
                  type="text"
                  placeholder="Tu nombre completo"
                />
              </div>
              {errors.regName && <span className="field-error show">{errors.regName}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="reg-email">Correo electrónico</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
                </span>
                <input
                  className="auth-input"
                  id="reg-email"
                  name="reg-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              {errors.regEmail && <span className="field-error show">{errors.regEmail}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="reg-password">Contraseña</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  className="auth-input"
                  id="reg-password"
                  name="reg-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {errors.regPassword && <span className="field-error show">{errors.regPassword}</span>}
            </div>

            <div className="field-group">
              <label className="terms-label">
                <input type="checkbox" id="reg-terms" name="reg-terms" className="terms-checkbox" />
                <span>Acepto los Términos y Condiciones</span>
              </label>
              {errors.regTerms && <span className="field-error show">{errors.regTerms}</span>}
            </div>

            <button className="auth-btn" type="submit" style={{ background: 'var(--blue)', border: 'none', borderRadius: '12px', height: '48px', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(74, 109, 140, 0.3)' }}>
              Registrar {role === 'buyer' ? 'Comprador' : role === 'seller' ? 'Vendedor' : 'Repartidor'}
            </button>

            <div className="auth-divider">o regístrate con</div>

            <button className="social-btn" type="button">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            <p className="auth-link-row" style={{ marginTop: '20px', textAlign: 'center' }}>
              ¿Ya tienes cuenta?
              <button type="button" className="auth-link" onClick={() => setIsRegister(false)} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontWeight: '600', marginLeft: '5px' }}>Inicia sesión</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
