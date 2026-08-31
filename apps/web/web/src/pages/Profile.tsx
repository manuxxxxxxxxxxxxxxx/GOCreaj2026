import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CaretRight, MapPinLine, Handshake, Headset, MapTrifold, ShieldCheck, SignOut, Storefront, Wallet as WalletIcon } from "@phosphor-icons/react";
import { authApi, productosApi, ApiError } from "../lib/api";
import type { Municipio } from "../lib/types";
import { fileToBase64 } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar } from "../components/ui/Avatar";
import { Input } from "../components/ui/Input";
import { PhoneInput } from "../components/ui/PhoneInput";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

export function Profile() {
  const { usuario, actualizarUsuarioLocal, cambiarRol, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[] | null>(null);
  const [municipio, setMunicipio] = useState(usuario?.municipio ?? "");
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false);

  useEffect(() => {
    authApi.misRoles().then((r) => setRoles(r.roles)).catch(() => {});
    productosApi.municipiosCatalogo().then((r) => setMunicipios(r.municipios)).catch(() => setMunicipios([]));
  }, []);

  const municipiosPorDepto = useMemo(() => {
    if (!municipios) return [];
    const grupos = new Map<string, Municipio[]>();
    for (const m of municipios) {
      if (!grupos.has(m.departamento)) grupos.set(m.departamento, []);
      grupos.get(m.departamento)!.push(m);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [municipios]);

  const guardarUbicacion = async (valor: string) => {
    setMunicipio(valor);
    setGuardandoUbicacion(true);
    try {
      const r = await authApi.actualizarUbicacion({ municipio: valor });
      actualizarUsuarioLocal(r.usuario);
      toast.show(valor ? "Ubicación actualizada" : "Ubicación quitada — verás resultados de todo el país", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar tu ubicación.", "error");
    } finally {
      setGuardandoUbicacion(false);
    }
  };

  if (!usuario) return null;

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await authApi.actualizarPerfil({ nombre, email, telefono });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Perfil actualizado", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    } finally {
      setGuardando(false);
    }
  };

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
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative" }}>
          <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={72} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Cambiar foto"
            style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%", background: "var(--cyan)", color: "var(--cyan-ink)", border: "2px solid var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Camera size={13} weight="bold" />
          </button>
        </div>
        <div>
          <h1 style={{ fontSize: 20 }}>{usuario.nombre}</h1>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", textTransform: "capitalize" }}>{usuario.rol} · {usuario.municipio ?? "Sin ubicación"}</p>
        </div>
      </div>

      {roles.length > 1 && (
        <Card>
          <h2 style={{ fontSize: 13.5, marginBottom: 10 }}>Cambiar de rol</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => cambiarRol(r as "comprador" | "vendedor" | "repartidor")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: `1px solid ${usuario.rol === r ? "var(--cyan)" : "var(--border)"}`,
                  background: usuario.rol === r ? "var(--cyan-bg)" : "var(--surface-1)",
                  color: usuario.rol === r ? "var(--cyan)" : "var(--text-secondary)",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 style={{ fontSize: 13.5, marginBottom: 4 }}>Ubicación</h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          Filtra lo que ves en Inicio y Reels por tu municipio. Déjalo en blanco para ver resultados de todo el país.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MapPinLine size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <select
            value={municipio}
            onChange={(e) => guardarUbicacion(e.target.value)}
            disabled={guardandoUbicacion}
            style={{ flex: 1, height: 40, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)", padding: "0 10px", fontSize: 13 }}
          >
            <option value="">Todo el país (sin filtrar)</option>
            {municipiosPorDepto.map(([depto, ms]) => (
              <optgroup key={depto} label={depto}>
                {ms.map((m) => (
                  <option key={m.id} value={m.nombre}>
                    {m.nombre}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <h2 style={{ fontSize: 13.5, marginBottom: 14 }}>Información personal</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PhoneInput value={telefono} onChange={setTelefono} />
          <Button onClick={guardar} loading={guardando} style={{ alignSelf: "flex-start" }}>
            Guardar cambios
          </Button>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <NavRow icon={<MapPinLine size={18} />} label="Direcciones" onClick={() => navigate("/direcciones")} />
        <NavRow icon={<WalletIcon size={18} />} label="Billetera" onClick={() => navigate("/wallet")} />
        <NavRow icon={<MapTrifold size={18} />} label="Mis pedidos" onClick={() => navigate("/pedidos")} />
        {usuario.rol === "comprador" && <NavRow icon={<Handshake size={18} />} label="Convertirse en socio" onClick={() => navigate("/convertirse")} />}
        {usuario.rol === "vendedor" && <NavRow icon={<Storefront size={18} />} label="Panel de vendedor" onClick={() => navigate("/vendedor")} />}
        <NavRow icon={<ShieldCheck size={18} />} label="Sesiones activas" onClick={() => navigate("/perfil/seguridad")} />
        <NavRow icon={<Headset size={18} />} label="Soporte" onClick={() => navigate("/soporte")} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
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
        <Button variant="danger" fullWidth onClick={() => setConfirmandoEliminar(true)}>
          Eliminar cuenta
        </Button>
      </div>

      <ConfirmDialog
        open={confirmandoEliminar}
        title="¿Eliminar tu cuenta?"
        description="Esta acción desactiva tu cuenta de inmediato. Contacta a soporte si cambias de opinión."
        confirmLabel="Eliminar cuenta"
        danger
        onCancel={() => setConfirmandoEliminar(false)}
        onConfirm={async () => {
          try {
            await authApi.eliminarCuenta();
            logout();
            navigate("/login");
          } catch (err) {
            toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar la cuenta.", "error");
          }
        }}
      />
    </div>
  );
}

function NavRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 4px", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", textAlign: "left", color: "var(--text-primary)" }}
    >
      <span style={{ color: "var(--cyan)" }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{label}</span>
      <CaretRight size={14} color="var(--text-muted)" />
    </button>
  );
}
