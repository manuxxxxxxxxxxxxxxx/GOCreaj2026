import { useEffect, useState } from "react";
import { CheckCircle, Handshake, X } from "@phosphor-icons/react";
import { adminApi, ApiError } from "../../lib/api";
import type { SolicitudRol } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

export function AdminSolicitudes() {
  const [tab, setTab] = useState<"pendiente" | "aprobado" | "rechazado">("pendiente");
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[] | null>(null);
  const toast = useToast();

  const cargar = () => {
    adminApi.solicitudes(tab).then((r) => setSolicitudes(r.solicitudes)).catch(() => setSolicitudes([]));
  };

  useEffect(cargar, [tab]);

  const resolver = async (s: SolicitudRol, decision: "aprobado" | "rechazado") => {
    try {
      await adminApi.resolver(s.id, decision);
      toast.show(decision === "aprobado" ? "Solicitud aprobada" : "Solicitud rechazada", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo resolver.", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
      <h1 style={{ fontSize: 20 }}>Solicitudes de rol</h1>
      <div style={{ display: "flex", gap: 6, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)", width: "fit-content" }}>
        {(["pendiente", "aprobado", "rechazado"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, textTransform: "capitalize", background: tab === t ? "var(--surface-1)" : "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-secondary)" }}>
            {t}
          </button>
        ))}
      </div>

      {solicitudes === null ? (
        <Skeleton height={200} />
      ) : solicitudes.length === 0 ? (
        <EmptyState icon={<Handshake size={24} />} title="Nada por aquí" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {solicitudes.map((s) => (
            <Card key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {s.nombre_completo} <span style={{ color: "var(--cyan)", textTransform: "capitalize" }}>· {s.rol_solicitado}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {s.usuario_nombre} · {s.email} · {formatDate(s.created_at)}
                  </div>
                </div>
                {tab === "pendiente" && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Button size="sm" onClick={() => resolver(s, "aprobado")}>
                      <CheckCircle size={14} /> Aprobar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => resolver(s, "rechazado")}>
                      <X size={14} /> Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
