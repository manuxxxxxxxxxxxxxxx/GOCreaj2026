import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "@phosphor-icons/react";
import { soporteApi, ApiError } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Sheet } from "../ui/Sheet";

const MOTIVOS = [
  "Contenido inapropiado",
  "Información falsa o engañosa",
  "Spam o publicidad no deseada",
  "Producto prohibido o ilegal",
  "Suplantación de otra tienda",
  "Otro motivo",
];

export function ReportSheet({ producto, onClose }: { producto: Producto; onClose: () => void }) {
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
      await soporteApi.crear(
        "Reporte de video",
        `Video reportado: "${producto.nombre}" (#${producto.id}) de la tienda ${producto.tienda_nombre ?? "—"}.\nMotivo: ${motivo}${
          detalle.trim() ? `\nDetalle: ${detalle.trim()}` : ""
        }`,
      );
      setEnviado(true);
      toast.show("Reporte enviado. Gracias por avisarnos.", "success");
      setTimeout(onClose, 1100);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el reporte.", "error");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <Sheet open onClose={onClose} title="Reportar video">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0" }}>
          <CheckCircle size={40} weight="fill" color="var(--ok)" />
          <p style={{ fontSize: 13.5, textAlign: "center" }}>Recibimos tu reporte. Nuestro equipo lo va a revisar.</p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} title="Reportar video">
      <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>¿Por qué reportas este video?</p>
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
