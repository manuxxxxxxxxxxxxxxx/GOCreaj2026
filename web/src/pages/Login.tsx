import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import '../../css/auth.css';
import '../../css/dark.css';

export default function Login() {
  const { toggleTheme } = useGlobal();
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

    if (role === 'seller') navigate('/dashboard-vendedor');
    else if (role === 'driver') navigate('/dashboard-repartidor');
    else navigate('/market');
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

    navigate('/market');
  };

  return (
    <div className="auth-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4f6ef7 0%, #8b3cf7 100%)', padding: '24px 16px' }}>
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="auth-logo-icon" style={{color: '#fff'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="M9 22V12h6v10M2 9l10-7 10 7"/>
            </svg>
          </div>
          <div>
            <div className="auth-logo-name">LocalMarket</div>
            <span className="auth-logo-tagline">Tu mercado del barrio</span>
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

            <span className="auth-forgot">¿Olvidé mi contraseña?</span>

            <button className="auth-btn" type="submit">Iniciar Sesión</button>

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
              <div className="role-selector-label">Tipo de cuenta</div>
              <div className="role-grid">
                <div className={`role-card ${role === 'buyer' ? 'selected' : ''}`} onClick={() => setRole('buyer')}>
                  <span className="role-card-emoji">🛒</span>
                  <span className="role-card-label">Comprador</span>
                </div>
                <div className={`role-card ${role === 'seller' ? 'selected' : ''}`} onClick={() => setRole('seller')}>
                  <span className="role-card-emoji">🏪</span>
                  <span className="role-card-label">Vendedor</span>
                </div>
                <div className={`role-card ${role === 'driver' ? 'selected' : ''}`} onClick={() => setRole('driver')}>
                  <span className="role-card-emoji">🛵</span>
                  <span className="role-card-label">Repartidor</span>
                </div>
              </div>
              {errors.regRole && <span className="field-error show">{errors.regRole}</span>}
            </div>

            <div className="field-group">
              <label className="terms-label">
                <input type="checkbox" id="reg-terms" name="reg-terms" className="terms-checkbox" />
                <span>Acepto los Términos y Condiciones</span>
              </label>
              {errors.regTerms && <span className="field-error show">{errors.regTerms}</span>}
            </div>

            <button className="auth-btn" type="submit">Crear cuenta</button>

            <p className="auth-link-row" style={{marginTop: '20px', textAlign: 'center'}}>
              ¿Ya tienes cuenta?
              <button type="button" className="auth-link" onClick={() => setIsRegister(false)} style={{background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontWeight: '600', marginLeft: '5px'}}>Inicia sesión</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
