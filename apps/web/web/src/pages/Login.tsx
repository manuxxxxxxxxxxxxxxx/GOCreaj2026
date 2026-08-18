import { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useGlobal } from '../context/GlobalContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

import '../../css/auth.css';
import '../../css/dark.css';

export default function Login() {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('tab') === 'register');
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from;
  const { login } = useGlobal();
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    loginEmail: '',
    loginPassword: '',
    regName: '',
    regEmail: '',
    regPassword: '',
    regPasswordConfirm: '',
    regTerms: '',
    general: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors = { ...errors, loginEmail: '', loginPassword: '', general: '' };

    const emailInput = (e.target as any).elements['login-email'].value;
    const passwordInput = (e.target as any).elements['login-password'].value;

    if (!emailInput) {
      newErrors.loginEmail = 'Ingresa tu correo, usuario o teléfono.';
      hasError = true;
    }
    if (!passwordInput) {
      newErrors.loginPassword = 'Ingresa tu contraseña.';
      hasError = true;
    }
    if (hasError) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth.php?action=login', {
        identificador: emailInput,
        password: passwordInput,
      });

      if (res.data.ok) {
        localStorage.setItem('lm_token_v1', res.data.token);
        // Guardamos TODOS los campos del usuario para que rol, foto_perfil, etc. estén disponibles
        login({
          name: res.data.usuario.nombre,
          email: res.data.usuario.email,
          role: res.data.usuario.rol,
          ...res.data.usuario,
        });

        const userRole = res.data.usuario.rol;
        if (redirectTo) navigate(redirectTo);
        else if (userRole === 'admin' || userRole === 'master_admin') navigate('/admin');
        else if (userRole === 'vendedor' || userRole === 'seller') navigate('/dashboard-vendedor');
        else if (userRole === 'repartidor' || userRole === 'driver') navigate('/dashboard-repartidor');
        else navigate('/');
      } else {
        const errCode = res.data.error;
        const errMsg = errCode === 'cuenta_suspendida'
          ? (res.data.mensaje || 'Tu cuenta ha sido suspendida.')
          : (res.data.error || 'Credenciales incorrectas');
        setErrors({ ...newErrors, general: errMsg });
      }
    } catch (err: any) {
      const errData = err.response?.data;
      const msg = errData?.error === 'cuenta_suspendida'
        ? (errData?.mensaje || 'Tu cuenta ha sido suspendida.')
        : (errData?.error || 'No se pudo conectar. Verifica que XAMPP esté activo.');
      setErrors({ ...newErrors, general: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors = { ...errors, regName: '', regEmail: '', regPassword: '', regPasswordConfirm: '', regTerms: '', general: '' };

    const nameInput = (e.target as any).elements['reg-name'].value;
    const emailInput = (e.target as any).elements['reg-email'].value;
    const passwordInput = (e.target as any).elements['reg-password'].value;
    const passwordConfirmInput = (e.target as any).elements['reg-password-confirm'].value;
    const termsInput = (e.target as any).elements['reg-terms'].checked;

    if (!nameInput) { newErrors.regName = 'Ingresa tu nombre.'; hasError = true; }
    if (!emailInput || !emailInput.includes('@')) { newErrors.regEmail = 'Ingresa un correo válido.'; hasError = true; }
    if (!passwordInput || passwordInput.length < 6) { newErrors.regPassword = 'La contraseña debe tener al menos 6 caracteres.'; hasError = true; }
    if (passwordConfirmInput !== passwordInput) { newErrors.regPasswordConfirm = 'Las contraseñas no coinciden.'; hasError = true; }
    if (!termsInput) { newErrors.regTerms = 'Debes aceptar los términos y condiciones.'; hasError = true; }
    if (hasError) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth.php?action=register', {
        nombre: nameInput,
        email: emailInput,
        password: passwordInput,
        rol: 'comprador',
      });
      if (res.data.ok) {
        localStorage.setItem('lm_token_v1', res.data.token);
        login({ name: res.data.usuario.nombre, email: res.data.usuario.email, role: res.data.usuario.rol, ...res.data.usuario });
        navigate(redirectTo || '/');
      } else {
        setErrors({ ...newErrors, general: res.data.error || 'Error al registrar' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'No se pudo conectar. Verifica que XAMPP esté activo.';
      setErrors({ ...newErrors, general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative' }}>
      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,0.9)', border: '1px solid #E2DCEF', borderRadius: '12px',
          padding: '9px 16px', fontWeight: 700, fontSize: '0.85rem', color: '#334155', cursor: 'pointer',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Volver
      </button>
      <div className="auth-card" style={{ maxWidth: '480px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(15,23,42,0.10)' }}>
        <div
          className="auth-logo"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
        >
          <div className="auth-logo-icon" style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #1D5FD1, #123F94)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '1.1rem', boxShadow: '0 6px 18px rgba(29,95,209,0.30)' }}>
            SV
          </div>
          <div>
            <div className="auth-logo-name" style={{ fontSize: '1.6rem', fontWeight: '900', color: '#000000', lineHeight: '1', letterSpacing: '-0.5px' }}>GO</div>
            <span className="auth-logo-tagline" style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>Envíos y Mercado Express</span>
          </div>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(false)}
            id="tab-login"
            type="button"
          >Iniciar Sesión</button>
          <button
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(true)}
            id="tab-register"
            type="button"
          >Registrarse</button>
        </div>

        {!isRegister && (
          <form className="auth-form" id="login-form" onSubmit={handleLogin} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="login-email">Correo, usuario o teléfono</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input
                  className="auth-input"
                  id="login-email"
                  name="login-email"
                  type="text"
                  placeholder="correo@ejemplo.com / @usuario / teléfono"
                  autoCapitalize="none"
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

            {errors.general && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', padding: '10px 14px', color: '#DC2626', fontSize: '0.875rem', fontWeight: '600', marginBottom: '4px' }}>
                {errors.general}
              </div>
            )}

            <button
              className="auth-btn"
              type="submit"
              disabled={loading}
              style={{ background: 'linear-gradient(135deg, #1D5FD1, #123F94)', border: 'none', borderRadius: '14px', height: '50px', color: '#fff', fontWeight: '800', fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer', boxShadow: '0 6px 18px rgba(29,95,209,0.30)', opacity: loading ? 0.75 : 1, transition: 'transform .15s, box-shadow .15s' }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <GoogleAuthButton onError={(msg) => setErrors(prev => ({ ...prev, general: msg }))} />
          </form>
        )}

        {isRegister && (
          <form className="auth-form" id="register-form" onSubmit={handleRegister} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="reg-name">Nombre completo</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input className="auth-input" id="reg-name" name="reg-name" type="text" placeholder="Tu nombre completo" />
              </div>
              {errors.regName && <span className="field-error show">{errors.regName}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="reg-email">Correo electrónico</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
                </span>
                <input className="auth-input" id="reg-email" name="reg-email" type="email" placeholder="correo@ejemplo.com" />
              </div>
              {errors.regEmail && <span className="field-error show">{errors.regEmail}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="reg-password">Contraseña</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input className="auth-input" id="reg-password" name="reg-password" type="password" placeholder="Mínimo 6 caracteres" />
              </div>
              {errors.regPassword && <span className="field-error show">{errors.regPassword}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="reg-password-confirm">Confirmar contraseña</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input className="auth-input" id="reg-password-confirm" name="reg-password-confirm" type="password" placeholder="Repite tu contraseña" />
              </div>
              {errors.regPasswordConfirm && <span className="field-error show">{errors.regPasswordConfirm}</span>}
            </div>

            <div className="field-group">
              <label className="terms-label">
                <input type="checkbox" id="reg-terms" name="reg-terms" className="terms-checkbox" />
                <span>Acepto los Términos y Condiciones</span>
              </label>
              {errors.regTerms && <span className="field-error show">{errors.regTerms}</span>}
            </div>

            {errors.general && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', padding: '10px 14px', color: '#DC2626', fontSize: '0.875rem', fontWeight: '600', marginBottom: '4px' }}>
                {errors.general}
              </div>
            )}

            <button
              className="auth-btn"
              type="submit"
              disabled={loading}
              style={{ background: 'linear-gradient(135deg, #1D5FD1, #123F94)', border: 'none', borderRadius: '14px', height: '50px', color: '#fff', fontWeight: '800', fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer', boxShadow: '0 6px 18px rgba(29,95,209,0.30)', opacity: loading ? 0.75 : 1, transition: 'transform .15s, box-shadow .15s' }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <GoogleAuthButton onError={(msg) => setErrors(prev => ({ ...prev, general: msg }))} />

            <p className="auth-link-row" style={{ marginTop: '20px', textAlign: 'center' }}>
              ¿Ya tienes cuenta?
              <button
                type="button"
                className="auth-link"
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: '#1D5FD1', cursor: 'pointer', fontWeight: '700', marginLeft: '5px' }}
              >Inicia sesión</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
