import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  At,
  Camera,
  CreditCard,
  Eye,
  EyeSlash,
  Globe,
  Handshake,
  Headset,
  MapPinLine,
  Monitor,
  Moon,
  PencilSimple,
  Plus,
  Prohibit,
  ShieldCheck,
  SignOut,
  Sun,
  Trash,
  Wallet as WalletIcon,
  X,
} from "@phosphor-icons/react";
import { authApi, carritoApi, ApiError } from "../lib/api";
import type { MetodoPago } from "../lib/types";
import { formatDateTime, fileToBase64 } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { PhoneInput } from "../components/ui/PhoneInput";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { BackButton } from "../components/ui/BackButton";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function ConfiguracionAvanzada() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!usuario) return null;

  const subirFoto = async (file: File) => {
    const b64 = await fileToBase64(file);
    try {
      const r = await authApi.actualizarPerfil({ foto_perfil: b64 });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Foto actualizada", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo subir la foto.", "error");
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <BackButton to="/perfil" />
        <div style={{ position: "relative", flexShrink: 0 }}>
          <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={64} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Cambiar foto"
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--cyan)",
              color: "var(--cyan-ink)",
              border: "2px solid var(--bg-page)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Camera size={11} weight="bold" />
          </button>
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nombre}</h1>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.email}</p>
        </div>
      </div>

      <AccesosRapidos />

      {/* El idioma va primero dentro de la grilla: es lo primero que se ve al entrar. */}
      <div className="settings-grid">
        <PreferenciasSection />
        <InformacionPersonalSection />
        <CuentaSection />
        <PagosSection />
        <PrivacidadSection />
        <SeguridadSection />
        <RolSection />
        <SoporteSection />
      </div>

      <ZonaRiesgoSection />
    </div>
  );
}

// ─── Accesos rápidos, estilo tarjetas de Google Account ────────────────────
function AccesosRapidos() {
  const navigate = useNavigate();
  const items = [
    { icon: <MapPinLine size={15} />, label: "Direcciones", to: "/direcciones" },
    { icon: <WalletIcon size={15} />, label: "Billetera", to: "/wallet" },
    { icon: <ShieldCheck size={15} />, label: "Seguridad", to: "/perfil/seguridad" },
  ];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((it) => (
        <button
          key={it.label}
          onClick={() => navigate(it.to)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            background: "var(--surface-1)",
            color: "var(--text-secondary)",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {it.icon} {it.label}
        </button>
      ))}
    </div>
  );
}

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <div id={id}>
      <Card>
        <h2 style={{ fontSize: 14 }}>{title}</h2>
        {description && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, marginBottom: 14 }}>{description}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: description ? 0 : 14 }}>{children}</div>
      </Card>
    </div>
  );
}

// ─── Información personal: nombre, email, teléfono ─────────────────────────
// Nombre y correo comparten un cooldown de 14 días (datos_changed_at) y el correo
// nunca se aplica directo: requiere confirmar un código de 6 dígitos primero.
function diasRestantesCooldown(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  return dias < 14 ? 14 - dias : null;
}

function InformacionPersonalSection() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  if (!usuario) return null;

  const cooldown = diasRestantesCooldown(usuario.datos_changed_at);
  const bloqueadoNombreEmail = cooldown !== null;

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await authApi.actualizarPerfil({ nombre, email, telefono });
      actualizarUsuarioLocal(r.usuario);
      if (r.email_verificacion_enviado) {
        toast.show(`Te enviamos un código a ${email}. Confírmalo abajo para completar el cambio. (${r.codigo_dev ? `simulado: ${r.codigo_dev}` : "revisa tu correo"})`, "info");
      } else {
        toast.show("Perfil actualizado", "success");
      }
      setEditando(false);
    } catch (err) {
      if (err instanceof ApiError && err.payload?.error === "cooldown_datos") {
        toast.show(`Solo puedes cambiar tu nombre o correo cada 14 días. Podrás hacerlo de nuevo en ${err.payload.dias_restantes} día(s).`, "error");
      } else if (err instanceof ApiError && err.payload?.error === "email_en_uso") {
        toast.show("Ese correo ya está en uso por otra cuenta.", "error");
      } else {
        toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCodigo = async () => {
    if (!codigo.trim()) return;
    setConfirmando(true);
    try {
      const r = await authApi.emailVerificar(codigo.trim());
      actualizarUsuarioLocal(r.usuario);
      toast.show("Correo confirmado", "success");
      setCodigo("");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setConfirmando(false);
    }
  };

  const reenviarCodigo = async () => {
    setReenviando(true);
    try {
      const r = await authApi.emailReenviarCodigo();
      toast.show(`Nuevo código enviado (simulado: ${r.codigo_dev})`, "info");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo reenviar.", "error");
    } finally {
      setReenviando(false);
    }
  };

  const cancelarCambioEmail = async () => {
    try {
      await authApi.emailCancelar();
      actualizarUsuarioLocal({ ...usuario, email_pendiente: null });
      toast.show("Cambio de correo cancelado", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cancelar.", "error");
    }
  };

  const cancelar = () => {
    setNombre(usuario.nombre);
    setEmail(usuario.email ?? "");
    setTelefono(usuario.telefono ?? "");
    setEditando(false);
  };

  return (
    <Section title="Información personal" description={bloqueadoNombreEmail ? `Nombre y correo se pueden volver a cambiar en ${cooldown} día(s).` : undefined}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            style={{ alignSelf: "flex-end", display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--cyan)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}
          >
            <PencilSimple size={13} weight="bold" /> Editar
          </button>
        )}

        {editando ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={bloqueadoNombreEmail} hint={bloqueadoNombreEmail ? `Disponible en ${cooldown} día(s)` : undefined} />
            <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={bloqueadoNombreEmail} hint={bloqueadoNombreEmail ? `Disponible en ${cooldown} día(s)` : "Te enviaremos un código para confirmar el cambio."} />
            <PhoneInput value={telefono} onChange={setTelefono} />
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" onClick={guardar} loading={guardando}>
                Guardar cambios
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelar} disabled={guardando}>
                <X size={15} /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <InfoRow label="Nombre" value={usuario.nombre} />
            <InfoRow label="Correo" value={usuario.email ?? "Sin registrar"} last={!usuario.email_pendiente} />
            {!usuario.email_pendiente && <InfoRow label="Teléfono" value={usuario.telefono || "Sin registrar"} last />}
            {usuario.email_pendiente && (
              <div style={{ padding: "12px 2px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12.5, color: "var(--warn)", fontWeight: 600, marginBottom: 8 }}>Confirma tu nuevo correo: {usuario.email_pendiente}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input label="Código de 6 dígitos" value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ flex: 1 }} />
                  <Button size="sm" onClick={confirmarCodigo} loading={confirmando} style={{ alignSelf: "flex-end" }}>
                    Confirmar
                  </Button>
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                  <button onClick={reenviarCodigo} disabled={reenviando} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Reenviar código
                  </button>
                  <button onClick={cancelarCambioEmail} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    Cancelar cambio
                  </button>
                </div>
                <InfoRow label="Teléfono" value={usuario.telefono || "Sin registrar"} last />
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 2px", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{value}</span>
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 42,
        height: 24,
        borderRadius: "var(--radius-pill)",
        background: on ? "var(--cyan)" : "var(--surface-3)",
        border: "none",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background var(--dur-base)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "var(--shadow-sm)",
          transition: "left var(--dur-base) var(--ease-out)",
        }}
      />
    </button>
  );
}

// ─── Cuenta: nombre de usuario (la contraseña vive en Seguridad) ───────────
function CuentaSection() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [editUsername, setEditUsername] = useState(false);
  const [username, setUsername] = useState(usuario?.username ?? "");
  const [guardandoUsername, setGuardandoUsername] = useState(false);

  if (!usuario) return null;

  const guardarUsername = async () => {
    setGuardandoUsername(true);
    try {
      const r = await authApi.actualizarPerfil({ username });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Nombre de usuario actualizado", "success");
      setEditUsername(false);
    } catch (err) {
      if (err instanceof ApiError && err.payload?.error === "cooldown_username") {
        toast.show(`Podrás cambiarlo de nuevo en ${err.payload.dias_restantes} día(s).`, "error");
      } else if (err instanceof ApiError && err.payload?.error === "username_taken") {
        toast.show("Ese nombre de usuario ya está en uso.", "error");
      } else {
        toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
      }
    } finally {
      setGuardandoUsername(false);
    }
  };

  return (
    <Section title="Cuenta">
      <div>
        <Row icon={<At size={16} />} label="Nombre de usuario" value={usuario.username ? `@${usuario.username}` : "Sin definir"} onEdit={() => setEditUsername((v) => !v)} editing={editUsername} />
        {editUsername && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <Input label="Nombre de usuario" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mi_usuario" hint="Solo puedes cambiarlo una vez cada 14 días." />
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" onClick={guardarUsername} loading={guardandoUsername}>
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditUsername(false)} disabled={guardandoUsername}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

function Row({ icon, label, value, onEdit, editing }: { icon: React.ReactNode; label: string; value: string; onEdit: () => void; editing: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      </div>
      <button onClick={onEdit} style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
        {editing ? "Cerrar" : "Editar"}
      </button>
    </div>
  );
}

// ─── Privacidad: perfil público + bloqueados ───────────────────────────────
function PrivacidadSection() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [bloqueados, setBloqueados] = useState<{ id: number; bloqueado_id: number; created_at: string; nombre: string; username: string | null; foto_perfil: string | null }[] | null>(null);

  useEffect(() => {
    authApi.usuariosBloqueados().then((r) => setBloqueados(r.bloqueados)).catch(() => setBloqueados([]));
  }, []);

  if (!usuario) return null;

  const togglePublico = async () => {
    const nuevo = !usuario.perfil_publico;
    actualizarUsuarioLocal({ ...usuario, perfil_publico: nuevo ? 1 : 0 });
    try {
      await authApi.actualizarVisibilidad(nuevo);
    } catch (err) {
      actualizarUsuarioLocal(usuario);
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  const desbloquear = async (bloqueadoId: number) => {
    setBloqueados((prev) => prev?.filter((b) => b.bloqueado_id !== bloqueadoId) ?? null);
    try {
      await authApi.desbloquearUsuario(bloqueadoId);
      toast.show("Usuario desbloqueado", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo desbloquear.", "error");
    }
  };

  return (
    <Section title="Privacidad">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {usuario.perfil_publico ? <Eye size={16} color="var(--text-muted)" /> : <EyeSlash size={16} color="var(--text-muted)" />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Perfil público</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Otros usuarios pueden ver tu perfil y reseñas.</div>
        </div>
        <Switch on={!!usuario.perfil_publico} onToggle={togglePublico} />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: bloqueados?.length ? 10 : 0 }}>
          <Prohibit size={16} color="var(--text-muted)" />
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Usuarios bloqueados {bloqueados ? `(${bloqueados.length})` : ""}</div>
        </div>
        {bloqueados === null ? (
          <Skeleton height={40} />
        ) : bloqueados.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)", paddingLeft: 26 }}>No has bloqueado a nadie.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bloqueados.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar nombre={b.nombre} foto={b.foto_perfil} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.nombre}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Bloqueado el {formatDateTime(b.created_at)}</div>
                </div>
                <button onClick={() => desbloquear(b.bloqueado_id)} style={{ fontSize: 12, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }}>
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Seguridad: verificar teléfono + sesiones activas ──────────────────────
function SeguridadSection() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  if (!usuario) return null;

  return (
    <Section title="Seguridad" description="Verificación de teléfono, contraseña y sesiones activas.">
      <Button variant="secondary" fullWidth onClick={() => navigate("/perfil/seguridad")}>
        <ShieldCheck size={16} /> Ver seguridad
      </Button>
    </Section>
  );
}

// ─── Preferencias: idioma + apariencia ─────────────────────────────────────
const IDIOMAS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
] as const;

function PreferenciasSection() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  if (!usuario) return null;

  const cambiarIdioma = async (idioma: "es" | "en" | "fr") => {
    actualizarUsuarioLocal({ ...usuario, idioma });
    try {
      await authApi.actualizarIdioma(idioma);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  return (
    <Section title="Preferencias">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Globe size={16} color="var(--text-muted)" />
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Idioma</div>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10, paddingLeft: 26 }}>Se usará para futuras comunicaciones de tu cuenta.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {IDIOMAS.map((i) => (
            <Chip key={i.value} active={(usuario.idioma ?? "es") === i.value} onClick={() => cambiarIdioma(i.value)}>
              {i.label}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Sun size={16} color="var(--text-muted)" />
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Apariencia</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Chip active={theme === "light"} onClick={() => setTheme("light")}>
            <Sun size={13} /> Claro
          </Chip>
          <Chip active={theme === "dark"} onClick={() => setTheme("dark")}>
            <Moon size={13} /> Oscuro
          </Chip>
          <Chip active={theme === "system"} onClick={() => setTheme("system")}>
            <Monitor size={13} /> Sistema
          </Chip>
        </div>
      </div>
    </Section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
        background: active ? "var(--cyan-bg)" : "var(--surface-1)",
        color: active ? "var(--cyan)" : "var(--text-secondary)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Métodos de pago ────────────────────────────────────────────────────────
function PagosSection() {
  const toast = useToast();
  const [metodos, setMetodos] = useState<MetodoPago[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const cargar = () => {
    carritoApi.metodosListar().then((r) => setMetodos(r.metodos)).catch(() => setMetodos([]));
  };
  useEffect(cargar, []);

  const agregar = async () => {
    if (numero.replace(/\D/g, "").length < 12 || !exp || cvv.length < 3) return toast.show("Completa los datos de la tarjeta.", "warning");
    setGuardando(true);
    try {
      await carritoApi.metodosGuardar({ tarjeta_numero: numero.replace(/\D/g, ""), tarjeta_exp: exp, tarjeta_cvv: cvv, predeterminado: !metodos?.length });
      toast.show("Tarjeta agregada", "success");
      setNumero("");
      setExp("");
      setCvv("");
      setFormOpen(false);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo agregar la tarjeta.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Section title="Métodos de pago">
      {metodos === null ? (
        <Skeleton height={50} />
      ) : metodos.length === 0 && !formOpen ? (
        <EmptyState icon={<CreditCard size={22} />} title="Sin tarjetas guardadas" description="Agrega una tarjeta para pagar más rápido." actionLabel="Agregar tarjeta" onAction={() => setFormOpen(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {metodos.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CreditCard size={18} color="var(--text-muted)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, textTransform: "capitalize" }}>
                  {m.marca} •••• {m.ultimos4}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  Vence {String(m.exp_mes).padStart(2, "0")}/{m.exp_anio}
                  {!!m.predeterminado && " · Predeterminada"}
                </div>
              </div>
              {!m.predeterminado && (
                <button
                  onClick={() => carritoApi.metodosPredeterminado(m.id).then(cargar)}
                  style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer" }}
                >
                  Usar
                </button>
              )}
              <button onClick={() => setEliminando(m.id)} aria-label="Eliminar tarjeta" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
                <Trash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {formOpen ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: metodos?.length ? 4 : 0 }}>
          <Input label="Número de tarjeta" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="4111 1111 1111 1111" />
          <div style={{ display: "flex", gap: 10 }}>
            <Input label="MM/AA" value={exp} onChange={(e) => setExp(e.target.value)} placeholder="12/28" style={{ flex: 1 }} />
            <Input label="CVV" value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" style={{ flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" onClick={agregar} loading={guardando}>
              Guardar tarjeta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFormOpen(false)} disabled={guardando}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        metodos !== null &&
        metodos.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setFormOpen(true)} style={{ alignSelf: "flex-start" }}>
            <Plus size={14} /> Agregar tarjeta
          </Button>
        )
      )}

      <ConfirmDialog
        open={eliminando !== null}
        title="¿Eliminar esta tarjeta?"
        description="No podrás deshacer esta acción."
        danger
        confirmLabel="Eliminar"
        onCancel={() => setEliminando(null)}
        onConfirm={async () => {
          if (eliminando === null) return;
          try {
            await carritoApi.metodosEliminar(eliminando);
            setEliminando(null);
            cargar();
          } catch (err) {
            toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar.", "error");
          }
        }}
      />
    </Section>
  );
}

// ─── Convertirse en socio ────────────────────────────────────────────────
// El rol activo solo cambia cuando un admin aprueba una solicitud — por eso no
// hay selector de "cambiar de rol" aquí, solo la puerta de entrada para pedirlo.
// Vendedores y repartidores ya son socios, así que la sección no aplica para ellos.
function RolSection() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  if (!usuario || usuario.rol !== "comprador") return null;

  return (
    <Section title="Convertirse en socio" description="Abre tu tienda o entrega pedidos y gana con SV[Go].">
      <Button variant="secondary" fullWidth onClick={() => navigate("/convertirse")}>
        <Handshake size={16} /> Ver opciones
      </Button>
    </Section>
  );
}

function NavRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px", cursor: "pointer", textAlign: "left", color: "var(--text-primary)" }}
    >
      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

// ─── Soporte ─────────────────────────────────────────────────────────────
function SoporteSection() {
  const navigate = useNavigate();
  return (
    <Section title="Soporte">
      <NavRow icon={<Headset size={17} />} label="Contactar soporte" onClick={() => navigate("/soporte")} />
    </Section>
  );
}

function ZonaRiesgoSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 400, width: "100%", margin: "0 auto", paddingTop: 4 }}>
      <Button
        variant="secondary"
        fullWidth
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        <SignOut size={16} /> Cerrar sesión
      </Button>
    </div>
  );
}
