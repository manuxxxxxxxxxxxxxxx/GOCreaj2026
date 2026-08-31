import { useEffect, useState } from "react";
import { Bicycle, CheckCircle, Clock, Storefront, UploadSimple } from "@phosphor-icons/react";
import { solicitudesApi, ApiError } from "../lib/api";
import type { SolicitudRol } from "../lib/types";
import { fileToBase64 } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";

export function Convertirse() {
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[] | null>(null);
  const [rol, setRol] = useState<"vendedor" | "repartidor" | null>(null);

  useEffect(() => {
    solicitudesApi.misSolicitudes().then((r) => setSolicitudes(r.solicitudes)).catch(() => setSolicitudes([]));
  }, []);

  if (solicitudes === null) return <Skeleton height={140} />;

  const pendiente = solicitudes.find((s) => s.estado === "pendiente");

  if (pendiente) {
    return (
      <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "40px 0" }}>
        <Clock size={36} color="var(--warn)" />
        <h1 style={{ fontSize: 18 }}>Solicitud en revisión</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
          Tu solicitud para ser <strong style={{ textTransform: "capitalize" }}>{pendiente.rol_solicitado}</strong> está siendo revisada por nuestro equipo. Te avisaremos por chat y notificación.
        </p>
      </div>
    );
  }

  if (!rol) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Convertirse en socio</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 24 }}>Elige cómo quieres unirte a SV[Go].</p>
        <div style={{ display: "flex", gap: 14 }}>
          <RoleCard icon={<Storefront size={26} />} title="Vendedor" description="Abre tu tienda y vende productos." onClick={() => setRol("vendedor")} />
          <RoleCard icon={<Bicycle size={26} />} title="Repartidor" description="Entrega pedidos y gana por cada viaje." onClick={() => setRol("repartidor")} />
        </div>
        {solicitudes.some((s) => s.estado === "rechazado") && (
          <p style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 16 }}>Una solicitud anterior fue rechazada. Puedes volver a intentarlo con información actualizada.</p>
        )}
      </div>
    );
  }

  return <SolicitudForm rol={rol} onBack={() => setRol(null)} onSent={() => solicitudesApi.misSolicitudes().then((r) => setSolicitudes(r.solicitudes))} />;
}

function RoleCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 24, borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", background: "var(--surface-1)", cursor: "pointer", color: "var(--cyan)" }}
    >
      {icon}
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
      <span style={{ fontSize: 12.5, color: "var(--text-secondary)", textAlign: "center" }}>{description}</span>
    </button>
  );
}

function FileField({ label, onFile, value }: { label: string; onFile: (b64: string) => void; value: string | null }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{label}</label>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 44,
          borderRadius: "var(--radius-sm)",
          border: "1px dashed var(--border-strong)",
          padding: "0 14px",
          cursor: "pointer",
          fontSize: 13,
          color: value ? "var(--ok)" : "var(--text-muted)",
        }}
      >
        {value ? <CheckCircle size={17} weight="fill" /> : <UploadSimple size={17} />}
        {value ? "Foto lista" : "Subir foto"}
        <input type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && onFile(await fileToBase64(e.target.files[0]))} />
      </label>
    </div>
  );
}

function SolicitudForm({ rol, onBack, onSent }: { rol: "vendedor" | "repartidor"; onBack: () => void; onSent: () => void }) {
  const toast = useToast();
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [duiNumero, setDuiNumero] = useState("");
  const [duiFrente, setDuiFrente] = useState<string | null>(null);
  const [duiReverso, setDuiReverso] = useState<string | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [fotoNegocio, setFotoNegocio] = useState<string | null>(null);
  const [tipoVehiculo, setTipoVehiculo] = useState("moto");
  const [licenciaFrente, setLicenciaFrente] = useState<string | null>(null);
  const [licenciaReverso, setLicenciaReverso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    if (!nombreCompleto.trim() || !duiNumero.trim() || !duiFrente || !duiReverso) {
      return toast.show("Completa tu nombre, DUI y ambas fotos del DUI.", "warning");
    }
    setEnviando(true);
    try {
      await solicitudesApi.crear({
        rol_solicitado: rol,
        nombre_completo: nombreCompleto,
        municipio,
        dui_numero: duiNumero,
        dui_frente: duiFrente,
        dui_reverso: duiReverso,
        nombre_negocio: rol === "vendedor" ? nombreNegocio : undefined,
        foto_negocio: rol === "vendedor" && fotoNegocio ? fotoNegocio : undefined,
        licencia_frente: rol === "repartidor" && licenciaFrente ? licenciaFrente : undefined,
        licencia_reverso: rol === "repartidor" && licenciaReverso ? licenciaReverso : undefined,
        tipo_vehiculo: rol === "repartidor" ? tipoVehiculo : undefined,
      });
      setEnviado(true);
      onSent();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud.", "error");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12, padding: "40px 0" }}>
        <Clock size={36} color="var(--warn)" />
        <h1 style={{ fontSize: 18 }}>Solicitud enviada</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>Te avisaremos apenas nuestro equipo la revise.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--text-secondary)" }}>
        ← Cambiar rol
      </button>
      <h1 style={{ fontSize: 20, textTransform: "capitalize" }}>Solicitud de {rol}</h1>

      <Input label="Nombre completo" value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} />
      <Input label="Municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
      <Input label="Número de DUI" value={duiNumero} onChange={(e) => setDuiNumero(e.target.value)} placeholder="00000000-0" />
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <FileField label="DUI (frente)" value={duiFrente} onFile={setDuiFrente} />
        </div>
        <div style={{ flex: 1 }}>
          <FileField label="DUI (reverso)" value={duiReverso} onFile={setDuiReverso} />
        </div>
      </div>

      {rol === "vendedor" && (
        <>
          <Input label="Nombre del negocio" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} />
          <FileField label="Foto del negocio (opcional)" value={fotoNegocio} onFile={setFotoNegocio} />
        </>
      )}

      {rol === "repartidor" && (
        <>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Tipo de vehículo</label>
            <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} style={{ width: "100%", height: 44, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 12px", fontSize: 14, background: "var(--surface-1)" }}>
              <option value="moto">Moto</option>
              <option value="bicicleta">Bicicleta</option>
              <option value="carro">Carro</option>
              <option value="a_pie">A pie</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FileField label="Licencia (frente)" value={licenciaFrente} onFile={setLicenciaFrente} />
            </div>
            <div style={{ flex: 1 }}>
              <FileField label="Licencia (reverso)" value={licenciaReverso} onFile={setLicenciaReverso} />
            </div>
          </div>
        </>
      )}

      <Button size="lg" fullWidth onClick={enviar} loading={enviando}>
        Enviar solicitud
      </Button>
    </div>
  );
}
