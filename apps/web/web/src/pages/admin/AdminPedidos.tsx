import { useEffect, useState } from "react";
import { adminApi, ApiError } from "../../lib/api";
import type { EstadoPedido, Pedido } from "../../lib/types";
import { money, formatDateTime } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { StatusPill } from "../../components/ui/StatusPill";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Package } from "@phosphor-icons/react";

const ESTADOS: (EstadoPedido | "")[] = ["", "pendiente_confirmacion", "preparacion", "en_camino", "entregado", "cancelado", "rechazado_repartidor"];

export function AdminPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [estado, setEstado] = useState<EstadoPedido | "">("");
  const toast = useToast();

  const cargar = () => {
    adminApi.pedidos(estado || undefined).then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  };

  useEffect(cargar, [estado]);

  const actualizar = async (p: Pedido, nuevo: EstadoPedido) => {
    try {
      await adminApi.actualizarPedido(p.id, nuevo);
      toast.show("Pedido actualizado", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20 }}>Pedidos</h1>
        <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoPedido | "")} style={{ height: 38, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 10px", fontSize: 13, background: "var(--surface-1)" }}>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e || "Todos"}
            </option>
          ))}
        </select>
      </div>

      {pedidos === null ? (
        <Skeleton height={300} />
      ) : pedidos.length === 0 ? (
        <EmptyState icon={<Package size={24} />} title="Sin pedidos" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pedidos.map((p) => (
            <Card key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>#SV-{p.id}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {p.comprador_nombre} → {p.vendedor_nombre} {p.repartidor_nombre ? `· ${p.repartidor_nombre}` : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{formatDateTime(p.created_at)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <StatusPill estado={p.estado} />
                  <div className="tabular" style={{ fontWeight: 700, marginTop: 6 }}>{money(p.total)}</div>
                </div>
              </div>
              <select
                value={p.estado}
                onChange={(e) => actualizar(p, e.target.value as EstadoPedido)}
                style={{ marginTop: 10, fontSize: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 8px", background: "var(--surface-2)" }}
              >
                {ESTADOS.filter((e) => e).map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
