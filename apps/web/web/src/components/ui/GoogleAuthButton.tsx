import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { ApiError } from "../../lib/api";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function GoogleAuthButton() {
  const { loginSocial } = useAuth();
  const { resolvedTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // Igual que el login por correo/contraseña (Login.tsx): si llegamos aquí porque
  // una ruta protegida nos mandó a /login, vuelve ahí; si no, a inicio. Antes esta
  // función nunca navegaba -- loginSocial() dejaba la sesión iniciada pero el usuario
  // se quedaba viendo el formulario de login/registro.
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const onSuccess = async (cred: CredentialResponse) => {
    if (!cred.credential) return;
    setLoading(true);
    try {
      const res = await loginSocial({ provider: "google", id_token: cred.credential });
      if (res.es_nuevo) {
        navigate("/onboarding", { replace: true, state: { usernameSugerido: res.username_sugerido } });
      } else {
        // Ver Login.tsx: un admin siempre entra por el resumen, ignora un "from" viejo.
        navigate(res.usuario.rol === "admin" ? "/admin" : from, { replace: true });
      }
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo iniciar sesión con Google.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!CLIENT_ID) {
    return (
      <button
        type="button"
        className="google-btn"
        onClick={() =>
          toast.show("Configura VITE_GOOGLE_CLIENT_ID en tu archivo .env para habilitar el acceso con Google.", "info")
        }
      >
        <GoogleMark />
        Continuar con Google
      </button>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        width: "100%",
        opacity: loading ? 0.6 : 1,
        pointerEvents: loading ? "none" : "auto",
      }}
    >
      <button type="button" className="google-btn" style={{ pointerEvents: "none", width: "100%", maxWidth: 336 }}>
        <GoogleMark />
        Continuar con Google
      </button>
      <div style={{ position: "absolute", inset: 0, opacity: 0, overflow: "hidden" }}>
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => toast.show("No se pudo iniciar sesión con Google.", "error")}
          theme={resolvedTheme === "dark" ? "filled_black" : "outline"}
          size="large"
          width="336"
          text="continue_with"
        />
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="currentColor" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="currentColor" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="currentColor" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
      <path fill="currentColor" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}
