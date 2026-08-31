import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "@phosphor-icons/react";
import { vendedorApi, ApiError } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

interface Resena {
  id: number;
  estrellas: number;
  comentario: string;
  respuesta_vendedor: string | null;
  respuesta_at: string | null;
  created_at: string;
  comprador_nombre: string;
}

export function VendedorResenas() {
  const [resenas, setResenas] = useState<Resena[] | null>(null);
  const [respondiendo, setRespondiendo] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const toast = useToast();

  const cargar = () => {
    vendedorApi.misResenas().then((r) => setResenas(r.resenas)).catch(() => setResenas([]));
  };

  useEffect(cargar, []);

  const responder = async (id: number) => {
    if (!texto.trim()) return;
    try {
      await vendedorApi.responderResena(id, texto.trim());
      setRespondiendo(null);
      setTexto("");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo responder.", "error");
    }
  };

  if (resenas === null) return <Skeleton height={200} />;
  if (resenas.length === 0) return <EmptyState icon={<Star size={24} />} title="Aún no tienes reseñas" />;

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 14 }}>
      <h1 style={{ fontSize: 20 }}>Reseñas</h1>
      {resenas.map((r, i) => (
        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>{r.comprador_nombre}</span>
            <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{formatDate(r.created_at)}</span>
          </div>
          <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} weight={i < r.estrellas ? "fill" : "regular"} color="var(--warn)" />
            ))}
          </div>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{r.comentario}</p>
          {r.respuesta_vendedor ? (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--cyan)", marginBottom: 3 }}>Tu respuesta</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.respuesta_vendedor}</p>
            </div>
          ) : respondiendo === r.id ? (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu respuesta pública" style={{ flex: 1, height: 36, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "0 10px", fontSize: 12.5 }} />
              <Button size="sm" onClick={() => responder(r.id)}>
                Enviar
              </Button>
            </div>
          ) : (
            <button onClick={() => setRespondiendo(r.id)} style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Responder
            </button>
          )}
        </Card>
        </motion.div>
      ))}
    </div>
  );
}
