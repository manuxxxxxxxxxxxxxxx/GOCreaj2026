/**
 * Login.tsx — CON GOOGLE REAL (Google Identity Services)
 *
 * Sin instalar ningún paquete npm nuevo.
 * Google GIS se carga en index.html via <script>.
 *
 * Configuración necesaria (Google Cloud Console):
 *  1. Crea un "ID de cliente OAuth 2.0" → tipo "Aplicación web"
 *  2. Orígenes JavaScript autorizados: http://localhost:5173
 *  3. Copia el Client ID en la constante GOOGLE_CLIENT_ID abajo
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useGlobal } from '../context/GlobalContext';

import '../../css/auth.css';
import '../../css/dark.css';

// ─── Pon aquí tu Web Client ID de Google Cloud Console ────────────────────────
// https://console.cloud.google.com/apis/credentials
// Tipo: "Aplicación web"  |  Origen: http://localhost:5173
const GOOGLE_CLIENT_ID = '487276445061-ac1fg465sgadpdcjvcmgmfhmchhoaspk.apps.googleusercontent.com';
// ─────────────────────────────────────────────────────────────────────────────

// Tipado mínimo para window.google (GIS)
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: string | number;
              text?: string;
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              locale?: string;
            }
          ) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

/** Decodifica el JWT que entrega Google GIS (sin librería externa) */
function decodeGoogleJWT(token: string): {
  sub: string; name: string; email: string; picture?: string;
} {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    throw new Error('No se pudo decodificar el token de Google');
  }
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('tab') === 'register');
  const navigate = useNavigate();
  const { login } = useGlobal();
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    loginEmail: '',
    loginPassword: '',
    regName: '',
    regEmail: '',
    regPassword: '',
    regTerms: '',
    general: ''
  });

  // Ref para el contenedor donde Google renderiza su botón
  const googleBtnLoginRef  = useRef<HTMLDivElement>(null);
  const googleBtnRegisterRef = useRef<HTMLDivElement>(null);

  // ── Inicializar Google GIS ─────────────────────────────────────────────────
  useEffect(() => {
    if (GOOGLE_CLIENT_ID === 'TU_WEB_CLIENT_ID.apps.googleusercontent.com') {
      // Client ID no configurado aún — los divs quedan vacíos, sin error
      return;
    }

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        cancel_on_tap_outside: true,
      });

      // Renderiza el botón en ambos contenedores (login y registro)
      const renderOpts = {
        theme: 'outline' as const,
        size: 'large' as const,
        width: '100%',
        locale: 'es',
        logo_alignment: 'center' as const,
      };

      if (googleBtnLoginRef.current) {
        googleBtnLoginRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnLoginRef.current, renderOpts);
      }
      if (googleBtnRegisterRef.current) {
        googleBtnRegisterRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRegisterRef.current, renderOpts);
      }
    };

    // El script de GIS puede ya estar cargado o cargarse después
    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogle();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isRegister]); // Re-renderiza cuando cambia entre login/registro
  // ─────────────────────────────────────────────────────────────────────────

  const handleGoogleCredential = async (response: { credential: string }) => {
    setLoading(true);
    const clearErrors = { loginEmail: '', loginPassword: '', regName: '', regEmail: '', regPassword: '', regTerms: '', general: '' };

    try {
      const perfil = decodeGoogleJWT(response.credential);

      const res = await api.post('/auth.php?action=social', {
        provider: 'google',
        provider_uid: perfil.sub,   // ID único de Google
        nombre: perfil.name,
        email: perfil.email,
      });

      if (res.data.ok) {
        localStorage.setItem('lm_token_v1', res.data.token);

        // Guarda también el usuario completo del backend
        const u = res.data.usuario;
        login({
          id: u.id,
          name: u.nombre,
          email: u.email,
          role: u.rol,
        });

        // Redirección según rol (igual que el login normal)
        if (u.rol === 'admin' || u.rol === 'master_admin') {
          navigate('/admin/dashboard');
        } else if (u.rol === 'vendedor' || u.rol === 'seller') {
          navigate('/dashboard-vendedor');
        } else if (u.rol === 'repartidor' || u.rol === 'driver') {
          navigate('/dashboard-repartidor');
        } else {
          navigate('/');
        }
      } else {
        setErrors({ ...clearErrors, general: res.data.error || 'Error al iniciar sesión con Google' });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Error al conectar con Google. Verifica que XAMPP esté activo.';
      setErrors({ ...clearErrors, general: msg });
    } finally {
      setLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors = { ...errors, loginEmail: '', loginPassword: '', general: '' };

    const emailInput = (e.target as HTMLFormElement).elements.namedItem('login-email') as HTMLInputElement;
    const passwordInput = (e.target as HTMLFormElement).elements.namedItem('login-password') as HTMLInputElement;

    if (!emailInput?.value) {
      newErrors.loginEmail = 'Ingresa tu correo, usuario o teléfono.';
      hasError = true;
    }
    if (!passwordInput?.value) {
      newErrors.loginPassword = 'Ingresa tu contraseña.';
      hasError = true;
    }

    if (hasError) { setErrors(newErrors); return; }

    setLoading(true);
    try {
      const res = await api.post('/auth.php?action=login', {
        identificador: emailInput.value,
        password: passwordInput.value
      });

      if (res.data.ok) {
        localStorage.setItem('lm_token_v1', res.data.token);
        login({ id: res.data.usuario.id, name: res.data.usuario.nombre, email: res.data.usuario.email, role: res.data.usuario.rol });

        const rol = res.data.usuario.rol;
        if (rol === 'admin' || rol === 'master_admin') navigate('/admin/dashboard');
        else if (rol === 'vendedor' || rol === 'seller') navigate('/dashboard-vendedor');
        else if (rol === 'repartidor' || rol === 'driver') navigate('/dashboard-repartidor');
        else navigate('/');
      } else {
        setErrors({ ...newErrors, general: res.data.error || 'Credenciales incorrectas' });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo conectar. Verifica que XAMPP esté activo.';
      setErrors({ ...newErrors, general: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors = { ...errors, regName: '', regEmail: '', regPassword: '', regTerms: '', general: '' };

    const form = e.target as HTMLFormElement;
    const nameInput    = (form.elements.namedItem('reg-name') as HTMLInputElement)?.value;
    const emailInput   = (form.elements.namedItem('reg-email') as HTMLInputElement)?.value;
    const passwordInput = (form.elements.namedItem('reg-password') as HTMLInputElement)?.value;
    const termsInput   = (form.elements.namedItem('reg-terms') as HTMLInputElement)?.checked;

    if (!nameInput)                         { newErrors.regName = 'Ingresa tu nombre.'; hasError = true; }
    if (!emailInput || !emailInput.includes('@')) { newErrors.regEmail = 'Ingresa un correo válido.'; hasError = true; }
    if (!passwordInput || passwordInput.length < 6) { newErrors.regPassword = 'La contraseña debe tener al menos 6 caracteres.'; hasError = true; }
    if (!termsInput)                        { newErrors.regTerms = 'Debes aceptar los términos y condiciones.'; hasError = true; }

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
        login({ id: res.data.usuario.id, name: res.data.usuario.nombre, email: res.data.usuario.email, role: res.data.usuario.rol });
        navigate('/');
      } else {
        setErrors({ ...newErrors, general: res.data.error || 'Error al registrar' });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo conectar. Verifica que XAMPP esté activo.';
      setErrors({ ...newErrors, general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative' }}>
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        {/* Logo */}
        <div className="auth-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <div className="auth-logo-icon" style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#4A6D8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#fff', fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(74, 109, 140, 0.2)' }}>
            SV
          </div>
          <div>
            <div className="auth-logo-name" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111111', lineHeight: '1' }}>GO</div>
            <span className="auth-logo-tagline" style={{ fontSize: '0.75rem', color: '#5e697a', fontWeight: '600' }}>Envíos y Mercado Express</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs" role="tablist">
          <button className={`auth-tab ${!isRegister ? 'active' : ''}`} onClick={() => setIsRegister(false)}>Iniciar Sesión</button>
          <button className={`auth-tab ${isRegister ? 'active' : ''}`}  onClick={() => setIsRegister(true)}>Registrarse</button>
        </div>

        {/* ── LOGIN ─────────────────────────────────────────────────────────── */}
        {!isRegister && (
          <form className="auth-form" id="login-form" onSubmit={handleLogin} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="login-email">Correo, usuario o teléfono</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input className="auth-input" id="login-email" name="login-email" type="text" placeholder="correo@ejemplo.com / @usuario / teléfono" autoCapitalize="none" />
              </div>
              {errors.loginEmail && <span className="field-error show">{errors.loginEmail}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="login-password">Contraseña</label>
              <div className="auth-input-wrap">
                <span className="field-icon">
                  <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input className="auth-input" id="login-password" name="login-password" type="password" placeholder="Tu contraseña" />
              </div>
              {errors.loginPassword && <span className="field-error show">{errors.loginPassword}</span>}
            </div>

            <span className="auth-forgot">¿Olvidaste tu contraseña?</span>

            {errors.general && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '0.875rem', fontWeight: '600', marginBottom: '4px' }}>
                {errors.general}
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={loading} style={{ background: 'var(--blue)', border: 'none', borderRadius: '12px', height: '48px', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(74, 109, 140, 0.3)', opacity: loading ? 0.75 : 1 }}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <div className="auth-divider">o continúa con</div>

            {/* Botón de Google renderizado por GIS (si el client ID está configurado) */}
            {GOOGLE_CLIENT_ID !== 'TU_WEB_CLIENT_ID.apps.googleusercontent.com' ? (
              <div ref={googleBtnLoginRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', fontSize: '0.8rem', color: '#888', border: '1px dashed #ccc', borderRadius: '10px' }}>
                Configura GOOGLE_CLIENT_ID en Login.tsx para habilitar Google Sign In
              </div>
            )}
          </form>
        )}

        {/* ── REGISTRO ──────────────────────────────────────────────────────── */}
        {isRegister && (
          <form className="auth-form" id="register-form" onSubmit={handleRegister} noValidate>
            <div className="field-group">
              <label className="field-label" htmlFor="reg-name">Nombre completo</label>
              <div className="auth-input-wrap">
                <span className="field-icon"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                <input className="auth-input" id="reg-name" name="reg-name" type="text" placeholder="Tu nombre completo" />
              </div>
              {errors.regName && <span className="field-error show">{errors.regName}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="reg-email">Correo electrónico</label>
              <div className="auth-input-wrap">
                <span className="field-icon"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg></span>
                <input className="auth-input" id="reg-email" name="reg-email" type="email" placeholder="correo@ejemplo.com" />
              </div>
              {errors.regEmail && <span className="field-error show">{errors.regEmail}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="reg-password">Contraseña</label>
              <div className="auth-input-wrap">
                <span className="field-icon"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                <input className="auth-input" id="reg-password" name="reg-password" type="password" placeholder="Mínimo 6 caracteres" />
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

            {errors.general && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', color: '#DC2626', fontSize: '0.875rem', fontWeight: '600', marginBottom: '4px' }}>
                {errors.general}
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={loading} style={{ background: 'var(--blue)', border: 'none', borderRadius: '12px', height: '48px', color: '#fff', fontWeight: '700', fontSize: '0.95rem', cursor: loading ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(74, 109, 140, 0.3)', opacity: loading ? 0.75 : 1 }}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <div className="auth-divider">o regístrate con</div>

            {GOOGLE_CLIENT_ID !== 'TU_WEB_CLIENT_ID.apps.googleusercontent.com' ? (
              <div ref={googleBtnRegisterRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', fontSize: '0.8rem', color: '#888', border: '1px dashed #ccc', borderRadius: '10px' }}>
                Configura GOOGLE_CLIENT_ID en Login.tsx para habilitar Google Sign In
              </div>
            )}

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
