import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvelopeSimple, LockKey, User } from "@phosphor-icons/react";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { GoogleAuthButton } from "../../components/ui/GoogleAuthButton";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !email.trim() || password.length < 6) {
      setError("Completa tu nombre, tu correo, y una contraseña de al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await register({ nombre: nombre.trim(), email: email.trim(), password });
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Crea tu cuenta" subtitle="Pide en minutos o vende desde hoy.">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input label="Nombre completo" icon={<User size={18} />} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" placeholder="María López" />
        <Input label="Correo" type="email" icon={<EnvelopeSimple size={18} />} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="ejemplo@dominio.com" />
        <Input
          label="Contraseña"
          type="password"
          icon={<LockKey size={18} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          error={error ?? undefined}
        />
        <Button type="submit" fullWidth loading={loading} size="lg">
          Crear cuenta
        </Button>
      </form>
      <div className="auth-divider">o continúa con</div>
      <GoogleAuthButton />
      <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginTop: 20 }}>
        ¿Ya tienes cuenta? <Link to="/login" style={{ color: "var(--cyan)", fontWeight: 600 }}>Ingresar</Link>
      </p>
    </AuthLayout>
  );
}
