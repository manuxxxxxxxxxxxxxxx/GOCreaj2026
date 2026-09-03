import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EnvelopeSimple, LockKey } from "@phosphor-icons/react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { GoogleAuthButton } from "../../components/ui/GoogleAuthButton";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identificador.trim() || !password) {
      setError("Completa usuario y contraseña.");
      return;
    }
    setLoading(true);
    try {
      const res = await login(identificador.trim(), password);
      // Un admin siempre entra por el resumen, nunca por un "from" que haya quedado
      // pegado de un intento anterior de ver una ruta protegida (ej. /soporte, si
      // justo se le venció la sesión mientras tenía abierto un ticket) -- si de
      // verdad quiere ir a otra sección del panel, la navega él mismo ya adentro.
      navigate(res.usuario.rol === "admin" ? "/admin" : from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Bienvenido de nuevo" subtitle="Pide, vende o reparte en SV[Go].">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input
          label="Usuario, correo o teléfono"
          icon={<EnvelopeSimple size={18} />}
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          autoComplete="username"
          placeholder="ejemplo@dominio.com"
        />
        <Input
          label="Contraseña"
          type="password"
          icon={<LockKey size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          error={error ?? undefined}
        />
        <Link to="/recuperar" style={{ fontSize: 12.5, color: "var(--cyan)", alignSelf: "flex-end", marginTop: -8 }}>
          ¿Olvidaste tu contraseña?
        </Link>
        <Button type="submit" fullWidth loading={loading} size="lg">
          Ingresar
        </Button>
      </form>
      <div className="auth-divider">o continúa con</div>
      <GoogleAuthButton />
      <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginTop: 20 }}>
        ¿No tienes cuenta? <Link to="/register" style={{ color: "var(--cyan)", fontWeight: 600 }}>Crear cuenta</Link>
      </p>
    </AuthLayout>
  );
}
