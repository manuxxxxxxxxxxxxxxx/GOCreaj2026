import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "@phosphor-icons/react";
import { interaccionesApi, chatApi, ApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Sheet } from "../ui/Sheet";

export type ReportTipo = "reel" | "producto" | "tienda" | "comentario" | "chat";

const MOTIVOS = [
  "Contenido inapropiado",
  "Información falsa o engañosa",
  "Spam o publicidad no deseada",
  "Producto prohibido o ilegal",
  "Suplantación de otra tienda",
  "Otro motivo",
];

const TITULOS: Record<ReportTipo, string> = {
  reel: "Reportar video",
  producto: "Reportar producto",
  tienda: "Reportar tienda",
  comentario: "Reportar comentario",
  chat: "Reportar conversación",
};

/** Sheet genérico de reportes -- cubre reels, productos, tiendas, comentarios de reels y
 * conversaciones de chat (punto 6). Cada tipo llama al endpoint de backend que corresponde:
 * reel/producto van a productos_reportes (ya leída por el panel admin), el resto a la tabla
 * genérica "reportes". */
export function ReportSheet({
  tipo,
  entidadId,
  entidadNombre,
  onClose,
}: {
  tipo: ReportTipo;
  entidadId: number;
  entidadNombre?: string;
  onClose: () => void;
}) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [motivo, setMotivo] = useState<string | null>(null);
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    if (!usuario) {
      onClose();
      navigate("/login");
      return;
    }
    if (!motivo) return;
    setEnviando(true);
    try {
      if (tipo === "reel" || tipo === "producto") {
        await interaccionesApi.reportarProducto(entidadId, motivo + (detalle.trim() ? ` — ${detalle.trim()}` : ""));
      } else if (tipo === "tienda") {
        await interaccionesApi.reportarTienda(entidadId, motivo, detalle.trim() || undefined);
      } else if (tipo === "comentario") {
        await interaccionesApi.reportarComentario(entidadId, motivo, detalle.trim() || undefined);
      } else {
        await chatApi.reportar(entidadId, motivo, detalle.trim() || undefined);
      }
      setEnviado(true);
      toast.show("Reporte enviado. Gracias por avisarnos.", "success");
      setTimeout(onClose, 1100);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el reporte.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const titulo = TITULOS[tipo];

  if (enviado) {
    return (
      <Sheet open onClose={onClose} title={titulo}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0" }}>
          <CheckCircle size={40} weight="fill" color="var(--ok)" />
          <p style={{ fontSize: 13.5, textAlign: "center" }}>Recibimos tu reporte. Nuestro equipo lo va a revisar.</p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} title={titulo}>
      <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>
        {entidadNombre ? `¿Por qué reportas "${entidadNombre}"?` : "¿Por qué quieres reportar esto?"}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {MOTIVOS.map((m) => (
          <button
            key={m}
            onClick={() => setMotivo(m)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              textAlign: "left",
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${motivo === m ? "var(--danger)" : "var(--border)"}`,
              background: motivo === m ? "var(--danger-bg)" : "var(--surface-2)",
              color: motivo === m ? "var(--danger-ink)" : "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                border: `1.5px solid ${motivo === m ? "var(--danger)" : "var(--border-strong)"}`,
                background: motivo === m ? "var(--danger)" : "transparent",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13 }}>{m}</span>
          </button>
        ))}
      </div>
      <textarea
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        placeholder="Cuéntanos más (opcional)"
        rows={3}
        style={{
          width: "100%",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          padding: 10,
          fontSize: 13,
          resize: "vertical",
          marginBottom: 14,
        }}
      />
      <button
        onClick={enviar}
        disabled={!motivo || enviando}
        style={{
          width: "100%",
          height: 42,
          borderRadius: "var(--radius-md)",
          border: "none",
          background: "var(--danger)",
          color: "var(--danger-ink)",
          fontWeight: 700,
          fontSize: 13.5,
          cursor: "pointer",
          opacity: !motivo || enviando ? 0.55 : 1,
        }}
      >
        {enviando ? "Enviando…" : "Enviar reporte"}
      </button>
    </Sheet>
  );
}
