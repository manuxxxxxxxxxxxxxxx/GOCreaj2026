import { useEffect, useState } from "react";
import { Headset } from "@phosphor-icons/react";
import { adminApi, ApiError } from "../../lib/api";
import type { ReporteSoporte } from "../../lib/types";
import { formatDateTime } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

interface TicketAdmin extends ReporteSoporte {
  usuario_nombre: string;
  usuario_email: string;
}

export function AdminSoporte() {
  const [tickets, setTickets] = useState<TicketAdmin[] | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const toast = useToast();

  const cargar = () => {
    adminApi.soporte().then((r) => setTickets(r.reportes as TicketAdmin[])).catch(() => setTickets([]));
  };

  useEffect(cargar, []);

  const responder = async (t: TicketAdmin, estado: "resuelto" | "cerrado") => {
    const respuesta = respuestas[t.id]?.trim();
    if (!respuesta) return toast.show("Escribe una respuesta.", "warning");
    try {
      await adminApi.responderSoporte(t.id, respuesta, estado);
      toast.show("Respuesta enviada", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo responder.", "error");
    }
  };

  if (tickets === null) return <Skeleton height={300} />;
  if (tickets.length === 0) return <EmptyState icon={<Headset size={24} />} title="Sin tickets de soporte" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
      <h1 style={{ fontSize: 20 }}>Tickets de soporte</h1>
      {tickets.map((t) => (
        <Card key={t.id}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>{t.asunto}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginLeft: 8 }}>
                {t.usuario_nombre} · {t.usuario_email}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: t.estado === "resuelto" ? "var(--ok)" : t.estado === "cerrado" ? "var(--text-muted)" : "var(--warn)" }}>{t.estado}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.descripcion}</p>
          {t.adjunto && (
            <a href={t.adjunto} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 8, width: 100, height: 100 }}>
              <img src={t.adjunto} alt="Captura adjunta" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }} />
            </a>
          )}
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{formatDateTime(t.created_at)}</div>
          {t.respuesta_admin ? (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan)", marginBottom: 3 }}>Respuesta enviada</div>
              <p style={{ fontSize: 13 }}>{t.respuesta_admin}</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                value={respuestas[t.id] ?? ""}
                onChange={(e) => setRespuestas((r) => ({ ...r, [t.id]: e.target.value }))}
                placeholder="Escribe tu respuesta"
                style={{ flex: 1, height: 36, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 10px", fontSize: 12.5 }}
              />
              <Button size="sm" onClick={() => responder(t, "resuelto")}>
                Resolver
              </Button>
              <Button size="sm" variant="secondary" onClick={() => responder(t, "cerrado")}>
                Cerrar
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
