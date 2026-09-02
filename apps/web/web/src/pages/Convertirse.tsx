import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bicycle, CheckCircle, Clock, Storefront, UploadSimple } from "@phosphor-icons/react";
import { solicitudesApi, ApiError } from "../lib/api";
import type { SolicitudRol } from "../lib/types";
import { fileToBase64 } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { BackButton } from "../components/ui/BackButton";

const ROLE_META = {
  vendedor: { accent: "violet" as const, icon: <Storefront size={28} weight="duotone" /> },
  repartidor: { accent: "coral" as const, icon: <Bicycle size={28} weight="duotone" /> },
};

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -24 : 24 }),
};

function Step({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11.5,
          fontWeight: 700,
          background: done || active ? "var(--cyan)" : "var(--surface-2)",
          color: done || active ? "var(--cyan-ink)" : "var(--text-muted)",
          transition: "background var(--dur-base)",
        }}
      >
        {done ? <CheckCircle size={14} weight="fill" /> : n}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

export function Convertirse() {
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[] | null>(null);
  const [rol, setRol] = useState<"vendedor" | "repartidor" | null>(null);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    solicitudesApi.misSolicitudes().then((r) => setSolicitudes(r.solicitudes)).catch(() => setSolicitudes([]));
  }, []);

  if (solicitudes === null) return <Skeleton height={140} />;

  const pendiente = solicitudes.find((s) => s.estado === "pendiente");
  const step = pendiente ? 3 : rol ? 2 : 1;

  const elegirRol = (r: "vendedor" | "repartidor") => {
    setDir(1);
    setRol(r);
  };
  const volver = () => {
    setDir(-1);
    setRol(null);
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 22 }}>Convertirse en socio</h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "2px 2px" }}>
        <Step n={1} active={step === 1} done={step > 1} label="Elegir rol" />
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <Step n={2} active={step === 2} done={step > 2} label="Tus datos" />
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <Step n={3} active={step === 3} done={false} label="Enviado" />
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        {pendiente ? (
          <motion.div key="pendiente" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
            <EstadoPendiente rol={pendiente.rol_solicitado} />
          </motion.div>
        ) : !rol ? (
          <motion.div key="elegir" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
            <ElegirRol onElegir={elegirRol} huboRechazo={solicitudes.some((s) => s.estado === "rechazado")} />
          </motion.div>
        ) : (
          <motion.div key="form" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
            <SolicitudForm rol={rol} onBack={volver} onSent={() => solicitudesApi.misSolicitudes().then((r) => setSolicitudes(r.solicitudes))} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EstadoPendiente({ rol }: { rol: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "36px 20px" }}>
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--warn-bg)", color: "var(--warn)", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Clock size={30} weight="duotone" />
      </motion.div>
      <h2 style={{ fontSize: 18 }}>Solicitud en revisión</h2>
      <p style={{ fontSize: 13.5, color: "var(--text-secondary)", maxWidth: 380 }}>
        Tu solicitud para ser <strong style={{ textTransform: "capitalize" }}>{rol}</strong> está siendo revisada por nuestro equipo. Te avisaremos por chat y notificación.
      </p>
    </div>
  );
}

function ElegirRol({ onElegir, huboRechazo }: { onElegir: (r: "vendedor" | "repartidor") => void; huboRechazo: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 20 }}>Elige cómo quieres unirte a SV[Go].</p>
      <div style={{ display: "flex", gap: 14 }}>
        <RoleCard rolKey="vendedor" title="Vendedor" description="Abre tu tienda y vende productos." onClick={() => onElegir("vendedor")} />
        <RoleCard rolKey="repartidor" title="Repartidor" description="Entrega pedidos y gana por cada viaje." onClick={() => onElegir("repartidor")} />
      </div>
      {huboRechazo && <p style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 16 }}>Una solicitud anterior fue rechazada. Puedes volver a intentarlo con información actualizada.</p>}
    </div>
  );
}

function RoleCard({ rolKey, title, description, onClick }: { rolKey: "vendedor" | "repartidor"; title: string; description: string; onClick: () => void }) {
  const meta = ROLE_META[rolKey];
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3, borderColor: `var(--${meta.accent})` }}
      whileTap={{ scale: 0.97 }}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "26px 20px",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        background: "var(--surface-1)",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: `var(--${meta.accent}-bg)`,
          color: `var(--${meta.accent})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {meta.icon}
      </span>
      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
      <span style={{ fontSize: 12.5, color: "var(--text-secondary)", textAlign: "center" }}>{description}</span>
    </motion.button>
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
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "36px 20px" }}
      >
        <span style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--ok-bg)", color: "var(--ok)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle size={32} weight="fill" />
        </span>
        <h2 style={{ fontSize: 18 }}>Solicitud enviada</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>Te avisaremos apenas nuestro equipo la revise.</p>
      </motion.div>
    );
  }

  const meta = ROLE_META[rol];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--text-secondary)" }}>
        ← Cambiar rol
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: `var(--${meta.accent}-bg)`, color: `var(--${meta.accent})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {meta.icon}
        </span>
        <h2 style={{ fontSize: 18 }}>
          Solicitud de <span style={{ textTransform: "capitalize" }}>{rol}</span>
        </h2>
      </div>

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
