import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import { api } from '../api';

declare global {
  interface Window { google?: any; }
}

function decodeJwt(token: string): any {
  const payload = token.split('.')[1];
  const json = decodeURIComponent(
    atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  );
  return JSON.parse(json);
}

/**
 * Botón "Continuar con Google". Usa Google Identity Services si hay un
 * VITE_GOOGLE_CLIENT_ID configurado; si no, informa claramente que falta
 * configuración en vez de simular un login que no puede ser real.
 */
export default function GoogleAuthButton({ onError }: { onError: (msg: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { login } = useGlobal();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) return;
    const scriptId = 'google-identity-script';

    const init = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential: string }) => {
          try {
            const payload = decodeJwt(resp.credential);
            const res = await api.post('/auth.php?action=social', {
              provider: 'google',
              provider_uid: payload.sub,
              email: payload.email,
              nombre: payload.name || payload.email.split('@')[0],
            });
            if (res.data.ok) {
              localStorage.setItem('lm_token_v1', res.data.token);
              login({ name: res.data.usuario.nombre, email: res.data.usuario.email, role: res.data.usuario.rol, ...res.data.usuario });
              navigate('/');
            } else {
              onError(res.data.error || 'No se pudo iniciar sesión con Google');
            }
          } catch {
            onError('Error al procesar el inicio de sesión con Google');
          }
        },
      });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
    };

    if (!document.getElementById(scriptId)) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.id = scriptId;
      s.onload = init;
      document.body.appendChild(s);
    } else {
      init();
    }
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!clientId) {
    return (
      <button
        type="button"
        onClick={() => onError('Google Sign-In no está configurado en este entorno (falta VITE_GOOGLE_CLIENT_ID).')}
        style={{
          width: '100%', height: 50, borderRadius: 14, border: '1.5px solid #E2DCEF',
          background: '#fff', color: '#111', fontWeight: 700, fontSize: '0.92rem',
          cursor: 'pointer', marginTop: 14, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10,
        }}
      >
        <GoogleG />
        Continuar con Google
      </button>
    );
  }

  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }} />;
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
