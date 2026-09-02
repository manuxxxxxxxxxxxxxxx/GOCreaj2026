import { useEffect, useState } from "react";
import { DeviceMobile, Laptop, Trash } from "@phosphor-icons/react";
import { authApi, ApiError } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Skeleton } from "../ui/Skeleton";

interface Sesion {
  id: number;
  user_agent: string;
  ip: string;
  created_at: string;
  last_seen_at: string;
  es_actual: boolean;
}

interface Props {
  /** Si se pasa, muestra como máximo esta cantidad y ofrece "Ver todas" con el resto. */
  limit?: number;
  onVerTodas?: () => void;
}

/** Lista de sesiones activas, reutilizada en la tarjeta compacta de Seguridad y en la página completa de sesiones. */
export function SessionList({ limit, onVerTodas }: Props) {
  const toast = useToast();
  const [sesiones, setSesiones] = useState<Sesion[] | null>(null);
  const [cerrandoOtras, setCerrandoOtras] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const cargar = () => authApi.sesionesListar().then((r) => setSesiones(r.sesiones)).catch(() => setSesiones([]));
  useEffect(() => {
    cargar();
  }, []);

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
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar.", "error");
    } finally {
      setCerrandoOtras(false);
    }
  };

  if (sesiones === null) return <Skeleton height={60} />;

  const truncado = !!limit && !expandido && sesiones.length > limit;
  const visibles = truncado ? sesiones.slice(0, limit) : sesiones;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sesiones.length > 1 && (
        <button
          onClick={cerrarOtras}
          disabled={cerrandoOtras}
          style={{ alignSelf: "flex-end", fontSize: 12, fontWeight: 700, color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}
        >
          Cerrar las demás
        </button>
      )}
      {visibles.map((s) => (
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
      {truncado && (
        <button
          onClick={() => (onVerTodas ? onVerTodas() : setExpandido(true))}
          style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
        >
          Ver {onVerTodas ? "todas las sesiones" : "más"} ({sesiones.length})
        </button>
      )}
    </div>
  );
}
