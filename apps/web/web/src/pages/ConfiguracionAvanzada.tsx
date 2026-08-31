import { useEffect, useState } from "react";
import {
  At,
  CreditCard,
  DeviceMobile,
  Eye,
  EyeSlash,
  Globe,
  Key,
  Laptop,
  Monitor,
  Moon,
  Plus,
  Prohibit,
  ShieldCheck,
  Sun,
  Trash,
} from "@phosphor-icons/react";
import { authApi, carritoApi, ApiError } from "../lib/api";
import type { MetodoPago } from "../lib/types";
import { formatDateTime, relativeTime } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function ConfiguracionAvanzada() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22 }}>Configuración avanzada</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>Cuenta, privacidad, seguridad y preferencias.</p>
      </div>

      <CuentaSection />
      <PrivacidadSection />
      <SeguridadSection />
      <PreferenciasSection />
      <PagosSection />
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 style={{ fontSize: 14 }}>{title}</h2>
      {description && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, marginBottom: 14 }}>{description}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: description ? 0 : 14 }}>{children}</div>
    </Card>
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

// ─── Cuenta: username + contraseña ─────────────────────────────────────────
function CuentaSection() {
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [editUsername, setEditUsername] = useState(false);
  const [username, setUsername] = useState(usuario?.username ?? "");
  const [guardandoUsername, setGuardandoUsername] = useState(false);

  const [editPassword, setEditPassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);

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

  const guardarPassword = async () => {
    if (passwordNueva.length < 6) return toast.show("La nueva contraseña debe tener al menos 6 caracteres.", "warning");
    if (passwordNueva !== passwordConfirmar) return toast.show("Las contraseñas no coinciden.", "warning");
    setGuardandoPassword(true);
    try {
      await authApi.actualizarPerfil({ password_actual: passwordActual, password_nueva: passwordNueva });
      toast.show("Contraseña actualizada", "success");
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
      setEditPassword(false);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la contraseña.", "error");
    } finally {
      setGuardandoPassword(false);
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

      {usuario.auth_provider === "local" && (
        <div>
          <Row icon={<Key size={16} />} label="Contraseña" value="••••••••" onEdit={() => setEditPassword((v) => !v)} editing={editPassword} />
          {editPassword && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              <Input label="Contraseña actual" type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} />
              <Input label="Contraseña nueva" type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} />
              <Input label="Confirmar contraseña nueva" type="password" value={passwordConfirmar} onChange={(e) => setPasswordConfirmar(e.target.value)} />
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" onClick={guardarPassword} loading={guardandoPassword}>
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditPassword(false)} disabled={guardandoPassword}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
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
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [enviandoSms, setEnviandoSms] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);

  const [sesiones, setSesiones] = useState<{ id: number; user_agent: string; ip: string; created_at: string; last_seen_at: string; es_actual: boolean }[] | null>(null);
  const [cerrandoOtras, setCerrandoOtras] = useState(false);

  const cargarSesiones = () => authApi.sesionesListar().then((r) => setSesiones(r.sesiones)).catch(() => setSesiones([]));
  useEffect(() => {
    cargarSesiones();
  }, []);

  if (!usuario) return null;

  const enviarSms = async () => {
    setEnviandoSms(true);
    try {
      const r = await authApi.enviarSms();
      setCodigoEnviado(r.codigo);
      toast.show(`Código de verificación: ${r.codigo} (simulado, no hay proveedor SMS real)`, "info");
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
      setCodigoEnviado(null);
      setCodigo("");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setVerificando(false);
    }
  };

  const cerrarSesion = async (id: number) => {
    setSesiones((prev) => prev?.filter((s) => s.id !== id) ?? null);
    try {
      await authApi.sesionesCerrar(id);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cerrar la sesión.", "error");
    }
  };

  const cerrarOtras = async () => {
    setCerrandoOtras(true);
    try {
      await authApi.sesionesCerrarOtras();
      toast.show("Se cerraron las demás sesiones", "success");
      cargarSesiones();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar.", "error");
    } finally {
      setCerrandoOtras(false);
    }
  };

  return (
    <Section title="Seguridad">
      {usuario.telefono && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DeviceMobile size={16} color="var(--text-muted)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{usuario.telefono}</div>
              <div style={{ fontSize: 12, color: usuario.telefono_verificado ? "var(--ok)" : "var(--text-secondary)" }}>
                {usuario.telefono_verificado ? "Verificado" : "Sin verificar"}
              </div>
            </div>
            {!usuario.telefono_verificado && (
              <Button size="sm" variant="secondary" onClick={enviarSms} loading={enviandoSms}>
                Verificar
              </Button>
            )}
          </div>
          {codigoEnviado && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Input label="Código de 6 dígitos" value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ flex: 1 }} />
              <Button size="sm" onClick={verificar} loading={verificando} style={{ alignSelf: "flex-end" }}>
                Confirmar
              </Button>
            </div>
          )}
        </div>
      )}

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <ShieldCheck size={16} color="var(--text-muted)" />
          <div style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>Sesiones activas</div>
          {!!sesiones?.length && sesiones.length > 1 && (
            <button onClick={cerrarOtras} disabled={cerrandoOtras} style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}>
              Cerrar las demás
            </button>
          )}
        </div>
        {sesiones === null ? (
          <Skeleton height={60} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sesiones.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/Mobi|Android|iPhone/i.test(s.user_agent) ? <DeviceMobile size={16} color="var(--text-muted)" /> : <Laptop size={16} color="var(--text-muted)" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    {s.ip}
                    {s.es_actual && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ok)", background: "var(--ok-bg)", padding: "1px 6px", borderRadius: "var(--radius-pill)" }}>Esta sesión</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Activo {relativeTime(s.last_seen_at)}</div>
                </div>
                {!s.es_actual && (
                  <button onClick={() => cerrarSesion(s.id)} aria-label="Cerrar sesión" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
                    <Trash size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
