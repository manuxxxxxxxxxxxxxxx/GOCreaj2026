import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { chatApi, ApiError } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Sheet } from "../ui/Sheet";

const PREGUNTAS_RAPIDAS = [
  "¿Está disponible ahora mismo?",
  "¿Hacen envíos a mi zona?",
  "¿Aceptan pago con tarjeta?",
  "¿Cuánto tarda la entrega?",
  "¿Tienen otros colores o tamaños?",
  "¿Hacen descuento por cantidad?",
];

export function QuestionsSheet({ producto, onClose }: { producto: Producto; onClose: () => void }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [enviando, setEnviando] = useState<string | null>(null);

  const preguntar = async (pregunta: string) => {
    if (!usuario) {
      onClose();
      navigate("/login");
      return;
    }
    setEnviando(pregunta);
    try {
      const r = await chatApi.desdeProducto(producto.id, pregunta);
      toast.show("Pregunta enviada a la tienda", "success");
      onClose();
      navigate(`/chat/${r.otro_id}`);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la pregunta.", "error");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Sheet open onClose={onClose} title={`Preguntar a ${producto.tienda_nombre ?? "la tienda"}`}>
      <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>
        Elige una pregunta rápida — se envía directo al chat de la tienda con este producto adjunto.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PREGUNTAS_RAPIDAS.map((p) => (
          <button
            key={p}
            onClick={() => preguntar(p)}
            disabled={enviando !== null}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              width: "100%",
              textAlign: "left",
              padding: "11px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              cursor: "pointer",
              opacity: enviando && enviando !== p ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 13 }}>{p}</span>
            {enviando === p ? <span className="spinner" style={{ color: "var(--cyan)" }} /> : <PaperPlaneTilt size={14} color="var(--cyan)" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
