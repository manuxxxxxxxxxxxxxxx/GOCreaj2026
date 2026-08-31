import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { authApi, ApiError } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

export function ForgotPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [identificador, setIdentificador] = useState("");
  const [codigo, setCodigo] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [loading, setLoading] = useState(false);

  const solicitar = async () => {
    if (!identificador.trim()) return;
    setLoading(true);
    try {
      const r = await authApi.recuperarSolicitar(identificador.trim());
      if (r.codigo_dev) toast.show(`Código de prueba: ${r.codigo_dev}`, "info");
      setStep(2);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo solicitar el código.", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    if (!codigo.trim() || passwordNueva.length < 6) return toast.show("Completa el código y una contraseña de al menos 6 caracteres.", "warning");
    setLoading(true);
    try {
      await authApi.recuperarConfirmar({ identificador: identificador.trim(), codigo: codigo.trim(), password_nueva: passwordNueva });
      toast.show("Contraseña actualizada, ya puedes ingresar", "success");
      navigate("/login");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la contraseña.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Recuperar contraseña" subtitle={step === 1 ? "Te enviaremos un código a tu correo o teléfono." : "Ingresa el código y tu nueva contraseña."}>
      {step === 1 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Usuario, correo o teléfono" value={identificador} onChange={(e) => setIdentificador(e.target.value)} />
          <Button fullWidth size="lg" loading={loading} onClick={solicitar}>
            Enviar código
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Código de 6 dígitos" value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" />
          <Input label="Nueva contraseña" type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <Button fullWidth size="lg" loading={loading} onClick={confirmar}>
            Actualizar contraseña
          </Button>
        </div>
      )}
      <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginTop: 20 }}>
        <Link to="/login" style={{ color: "var(--cyan)", fontWeight: 600 }}>
          Volver a ingresar
        </Link>
      </p>
    </AuthLayout>
  );
}
