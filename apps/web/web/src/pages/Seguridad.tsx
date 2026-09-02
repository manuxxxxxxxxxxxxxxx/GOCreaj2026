import { useState } from "react";
import { DeviceMobile, Key, ShieldCheck } from "@phosphor-icons/react";
import { authApi, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { BackButton } from "../components/ui/BackButton";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { SessionList } from "../components/domain/SessionList";

function SectionCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: description ? 4 : 14 }}>
        <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--cyan-bg)", color: "var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </span>
        <h2 style={{ fontSize: 15 }}>{title}</h2>
      </div>
      {description && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, paddingLeft: 42 }}>{description}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </Card>
  );
}

function TelefonoSection() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [enviandoSms, setEnviandoSms] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);

  if (!usuario?.telefono) return null;

  const enviarSms = async () => {
    setEnviandoSms(true);
    try {
      const r = await authApi.enviarSms();
      setCodigoEnviado(true);
      toast.show(r.enviado ? "Te enviamos un código por WhatsApp." : `Sin proveedor de WhatsApp configurado. Código simulado: ${r.codigo}`, "info");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el código.", "error");
    } finally {
      setEnviandoSms(false);
    }
  };

  const verificar = async () => {
    if (!codigo.trim()) return;
    setVerificando(true);
    try {
      const r = await authApi.verificarSms(codigo.trim());
      actualizarUsuarioLocal(r.usuario);
      toast.show("Teléfono verificado", "success");
      setCodigoEnviado(false);
      setCodigo("");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <SectionCard icon={<DeviceMobile size={16} />} title="Verificación de teléfono" description="Un teléfono verificado ayuda a proteger tu cuenta y agiliza el soporte.">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{usuario.telefono}</div>
          <div style={{ fontSize: 12, color: usuario.telefono_verificado ? "var(--ok)" : "var(--text-secondary)" }}>{usuario.telefono_verificado ? "Verificado" : "Sin verificar"}</div>
        </div>
        {!usuario.telefono_verificado && (
          <Button size="sm" variant="secondary" onClick={enviarSms} loading={enviandoSms}>
            Verificar
          </Button>
        )}
      </div>
      {codigoEnviado && (
        <div style={{ display: "flex", gap: 8 }}>
          <Input label="Código de 6 dígitos" value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ flex: 1 }} />
          <Button size="sm" onClick={verificar} loading={verificando} style={{ alignSelf: "flex-end" }}>
            Confirmar
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

function PasswordSection() {
  const { usuario } = useAuth();
  const toast = useToast();
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (usuario?.auth_provider !== "local") return null;

  const guardar = async () => {
    if (passwordNueva.length < 6) return toast.show("La nueva contraseña debe tener al menos 6 caracteres.", "warning");
    if (passwordNueva !== passwordConfirmar) return toast.show("Las contraseñas no coinciden.", "warning");
    setGuardando(true);
    try {
      await authApi.actualizarPerfil({ password_actual: passwordActual, password_nueva: passwordNueva });
      toast.show("Contraseña actualizada", "success");
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la contraseña.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SectionCard icon={<Key size={16} />} title="Contraseña" description="Usa una contraseña que no utilices en otros sitios.">
      <Input label="Contraseña actual" type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} />
      <Input label="Contraseña nueva" type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} />
      <Input label="Confirmar contraseña nueva" type="password" value={passwordConfirmar} onChange={(e) => setPasswordConfirmar(e.target.value)} />
      <Button size="sm" onClick={guardar} loading={guardando} style={{ alignSelf: "flex-start" }}>
        Actualizar contraseña
      </Button>
    </SectionCard>
  );
}

export function Seguridad() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BackButton to="/perfil/configuracion" />
        <h1 style={{ fontSize: 22 }}>Seguridad</h1>
      </div>

      <TelefonoSection />
      <PasswordSection />

      <SectionCard icon={<ShieldCheck size={16} />} title="Sesiones activas" description="Dispositivos donde tu cuenta ha iniciado sesión.">
        <SessionList limit={5} />
      </SectionCard>
    </div>
  );
}
