import { useEffect, useState } from "react";
import { CheckCircle, Clock, Headset } from "@phosphor-icons/react";
import { soporteApi, ApiError } from "../lib/api";
import type { ReporteSoporte } from "../lib/types";
import { formatDateTime } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Card } from "../components/ui/Card";

export function Soporte() {
  const [tickets, setTickets] = useState<ReporteSoporte[] | null>(null);
  const [asunto, setAsunto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const cargar = () => {
    soporteApi.misTickets().then((r) => setTickets(r.reportes)).catch(() => setTickets([]));
  };

  useEffect(cargar, []);

  const enviar = async () => {
    if (!asunto.trim() || !descripcion.trim()) return toast.show("Completa el asunto y la descripción.", "warning");
    setEnviando(true);
    try {
      await soporteApi.crear(asunto.trim(), descripcion.trim());
      setAsunto("");
      setDescripcion("");
      toast.show("Ticket enviado", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el ticket.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: 22 }}>Soporte</h1>

      <Card>
        <h2 style={{ fontSize: 14, marginBottom: 12 }}>Crear un ticket</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input label="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="¿En qué te ayudamos?" />
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Cuéntanos con detalle qué sucedió."
              style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }}
            />
          </div>
          <Button onClick={enviar} loading={enviando} style={{ alignSelf: "flex-start" }}>
            Enviar ticket
          </Button>
        </div>
      </Card>

      <section>
        <h2 style={{ fontSize: 13.5, marginBottom: 10 }}>Mis tickets</h2>
        {tickets === null ? (
          <Skeleton height={80} />
        ) : tickets.length === 0 ? (
          <EmptyState icon={<Headset size={22} />} title="No has creado tickets" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tickets.map((t) => (
              <Card key={t.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{t.asunto}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: t.estado === "resuelto" ? "var(--ok)" : "var(--warn)" }}>
                    {t.estado === "resuelto" ? <CheckCircle size={13} weight="fill" /> : <Clock size={13} />}
                    {t.estado}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.descripcion}</p>
                {t.respuesta_admin && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan)", marginBottom: 3 }}>Respuesta del equipo</div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.respuesta_admin}</p>
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{formatDateTime(t.created_at)}</div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
