import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package, ChatCircleDots, Megaphone, Gear, Trash } from "@phosphor-icons/react";
import { notificacionesApi } from "../lib/api";
import type { Notificacion } from "../lib/types";
import { relativeTime } from "../lib/format";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { BackButton } from "../components/ui/BackButton";

const ICONS: Record<Notificacion["tipo"], typeof Package> = {
  pedido: Package,
  chat: ChatCircleDots,
  sistema: Gear,
  promocion: Megaphone,
};

export function Notifications() {
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const navigate = useNavigate();

  const cargar = () => {
    notificacionesApi.listar().then((r) => setItems(r.notificaciones)).catch(() => setItems([]));
  };

  useEffect(() => {
    // Cargamos primero (para poder seguir mostrando cuáles llegaron sin leer durante
    // esta visita) y marcamos todas leídas en el servidor sin volver a pedir la lista,
    // así el usuario alcanza a ver el resaltado de "nueva" antes de que desaparezca.
    notificacionesApi
      .listar()
      .then((r) => {
        setItems(r.notificaciones);
        if (r.notificaciones.some((n) => !n.leida)) notificacionesApi.marcarTodasLeidas().catch(() => {});
      })
      .catch(() => setItems([]));
  }, []);

  const marcarLeida = async (n: Notificacion) => {
    if (n.tipo === "pedido" && n.referencia_id) navigate(`/pedidos/${n.referencia_id}`);
  };

  const eliminar = async (id: number) => {
    await notificacionesApi.eliminar(id);
    cargar();
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 22 }}>Notificaciones</h1>
      </div>

      {items === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell size={24} />} title="No tienes notificaciones" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((n) => {
            const Icon = ICONS[n.tipo] ?? Bell;
            return (
              <div
                key={n.id}
                style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: "var(--radius-md)", background: n.leida ? "var(--surface-1)" : "var(--cyan-bg)", border: "1px solid var(--border)", cursor: "pointer" }}
                onClick={() => marcarLeida(n)}
              >
                <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)", flexShrink: 0 }}>
                  <Icon size={17} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.leida ? 500 : 700, fontSize: 13.5 }}>{n.titulo}</div>
                  {n.cuerpo && <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>{n.cuerpo}</div>}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{relativeTime(n.created_at)}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminar(n.id);
                  }}
                  aria-label="Eliminar notificación"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  <Trash size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
