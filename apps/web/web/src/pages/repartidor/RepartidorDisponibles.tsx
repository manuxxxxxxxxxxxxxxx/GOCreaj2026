import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bicycle, LockSimple, MapPin, Package, Power, Star } from "@phosphor-icons/react";
import { repartidorApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

export function RepartidorDisponibles() {
  const navigate = useNavigate();
  const [enLinea, setEnLinea] = useState(false);
  const [pedidos, setPedidos] = useState<(Pedido & { distancia_km?: number; ganancia_repartidor: number })[] | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [stats, setStats] = useState<{ hoy: number; semana: number; entregas_hoy: number } | null>(null);
  const [perfil, setPerfil] = useState<{ repartidor_calificacion_promedio: number; entregas_completadas: number } | null>(null);
  const toast = useToast();

  const cargar = () => {
    repartidorApi.disponibles().then((r) => {
      setEnLinea(r.en_linea);
      setPedidos(r.pedidos);
      setBloqueado(!!r.bloqueado_por_entrega_activa);
    });
  };

  useEffect(() => {
    cargar();
    const t = window.setInterval(cargar, 9000);
    return () => window.clearInterval(t);
  }, []);

  // Antes solo vivían en Billetera/Perfil -- esta pantalla "home" del repartidor no daba
  // ningún vistazo rápido a cómo va el día, a diferencia del Resumen del vendedor.
  useEffect(() => {
    repartidorApi.wallet().then((r) => setStats(r.stats)).catch(() => {});
    repartidorApi.miPerfil().then((r) => setPerfil(r.perfil)).catch(() => {});
  }, []);

  const toggle = async () => {
    const nuevo = !enLinea;
    try {
      await repartidorApi.toggleEnLinea(nuevo);
      setEnLinea(nuevo);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cambiar el estado.", "error");
    }
  };

  const aceptar = async (p: Pedido) => {
    try {
      await repartidorApi.aceptar(p.id);
      toast.show("Pedido aceptado. Dirígete a la tienda.", "success");
      navigate("/repartidor/entregas");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo aceptar.", "error");
      cargar();
    }
  };

  const rechazar = async (p: Pedido) => {
    await repartidorApi.rechazar(p.id);
    cargar();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20 }}>Pedidos disponibles</h1>
        <button
          onClick={toggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: "var(--radius-pill)",
            border: `1px solid ${enLinea ? "var(--ok)" : "var(--border)"}`,
            background: enLinea ? "var(--ok-bg)" : "var(--surface-2)",
            color: enLinea ? "var(--ok-ink)" : "var(--text-secondary)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <Power size={15} weight="bold" />
          {enLinea ? "En línea" : "Desconectado"}
        </button>
      </div>

      {(stats || perfil) && (
        <div style={{ display: "flex", gap: 10 }}>
          <StatTile icon={<Package size={14} color="var(--cyan)" />} label="Hoy" value={stats ? money(stats.hoy) : "—"} />
          <StatTile icon={<Bicycle size={14} color="var(--cyan)" />} label="Entregas hoy" value={stats ? String(stats.entregas_hoy) : "—"} />
          <StatTile icon={<Package size={14} color="var(--cyan)" />} label="Esta semana" value={stats ? money(stats.semana) : "—"} />
          <StatTile
            icon={<Star size={14} weight="fill" color="var(--warn)" />}
            label="Calificación"
            value={perfil?.repartidor_calificacion_promedio ? perfil.repartidor_calificacion_promedio.toFixed(1) : "Nuevo"}
          />
        </div>
      )}

      {!enLinea ? (
        <EmptyState icon={<Power size={26} />} title="Estás desconectado" description="Conéctate para empezar a recibir pedidos disponibles cerca de ti." actionLabel="Conectarme" onAction={toggle} />
      ) : bloqueado ? (
        <EmptyState icon={<LockSimple size={26} />} title="Ya tienes una entrega en curso" description="Solo puedes traer un pedido a la vez. Complétalo para volver a ver solicitudes disponibles." actionLabel="Ver mi pedido actual" onAction={() => navigate("/repartidor/entregas")} />
      ) : pedidos === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={110} radius="var(--radius-md)" />
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <EmptyState icon={<Bicycle size={24} />} title="Sin pedidos disponibles ahora" description="Te avisaremos apenas haya uno cerca." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pedidos.map((p) => (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.tienda_nombre}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <MapPin size={12} /> {p.tienda_direccion ?? p.municipio_entrega}
                    {p.distancia_km !== undefined && <span className="tabular"> · {p.distancia_km} km</span>}
                  </div>
                </div>
                <div className="tabular" style={{ fontWeight: 800, fontSize: 15, color: "var(--ok)" }}>
                  +{money(p.ganancia_repartidor)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>{p.items.length} producto{p.items.length !== 1 ? "s" : ""} · Total {money(p.total)}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="sm" fullWidth onClick={() => aceptar(p)}>
                  Aceptar
                </Button>
                <Button size="sm" variant="secondary" fullWidth onClick={() => rechazar(p)}>
                  Rechazar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 4px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-1)" }}>
      {icon}
      <span className="tabular" style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4 }}>
        {value}
      </span>
      <span style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>{label}</span>
    </div>
  );
}
