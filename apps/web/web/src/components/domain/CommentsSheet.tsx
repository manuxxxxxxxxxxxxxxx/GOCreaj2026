import { useEffect, useMemo, useState } from "react";
import { ArrowBendUpLeft, Heart, PaperPlaneTilt } from "@phosphor-icons/react";
import { interaccionesApi } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { relativeTime } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sheet } from "../ui/Sheet";
import { Avatar } from "../ui/Avatar";
import { Skeleton } from "../ui/Skeleton";

interface Comentario {
  id: number;
  comentario: string;
  created_at: string;
  parent_id: number | null;
  likes_count: number;
  usuario_id: number;
  nombre: string;
  foto_perfil: string | null;
  yo_like: number;
}

export function CommentsSheet({ producto, onClose }: { producto: Producto; onClose: () => void }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [comentarios, setComentarios] = useState<Comentario[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [respondiendoA, setRespondiendoA] = useState<Comentario | null>(null);

  const cargar = () => {
    interaccionesApi
      .listarComentarios(producto.id)
      .then((r) => setComentarios(r.comentarios))
      .catch(() => setComentarios([]));
  };

  useEffect(cargar, [producto.id]);

  const respuestasPorPadre = useMemo(() => {
    const mapa = new Map<number, Comentario[]>();
    for (const c of comentarios ?? []) {
      if (!c.parent_id) continue;
      if (!mapa.has(c.parent_id)) mapa.set(c.parent_id, []);
      mapa.get(c.parent_id)!.push(c);
    }
    return mapa;
  }, [comentarios]);

  const enviar = async () => {
    if (!usuario) return navigate("/login");
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await interaccionesApi.comentar(producto.id, texto.trim(), respondiendoA?.id);
      setTexto("");
      setRespondiendoA(null);
      cargar();
    } finally {
      setEnviando(false);
    }
  };

  const likeComentario = async (id: number) => {
    if (!usuario) return navigate("/login");
    await interaccionesApi.likeComentario(id);
    cargar();
  };

  return (
    <Sheet open onClose={onClose} title={`Comentarios · ${producto.nombre}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "50vh", overflowY: "auto", marginBottom: 14 }}>
        {comentarios === null ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={44} />)
        ) : comentarios.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", padding: 20 }}>Sé el primero en comentar.</p>
        ) : (
          comentarios
            .filter((c) => !c.parent_id)
            .map((c) => (
              <div key={c.id}>
                <ComentarioFila
                  c={c}
                  onLike={() => likeComentario(c.id)}
                  onResponder={() => setRespondiendoA(c)}
                />
                {(respuestasPorPadre.get(c.id) ?? []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12, paddingLeft: 30, borderLeft: "1.5px solid var(--border)", marginLeft: 15 }}>
                    {respuestasPorPadre.get(c.id)!.map((r) => (
                      <ComentarioFila key={r.id} c={r} small onLike={() => likeComentario(r.id)} onResponder={() => setRespondiendoA(c)} />
                    ))}
                  </div>
                )}
              </div>
            ))
        )}
      </div>

      {respondiendoA && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--cyan-bg)", borderRadius: "var(--radius-sm)", padding: "6px 10px", marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, color: "var(--cyan)" }}>
            Respondiendo a <strong>{respondiendoA.nombre}</strong>
          </span>
          <button onClick={() => setRespondiendoA(null)} style={{ background: "none", border: "none", color: "var(--cyan)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder={respondiendoA ? `Responder a ${respondiendoA.nombre}…` : "Escribe un comentario…"}
          style={{ flex: 1, height: 40, borderRadius: "var(--radius-pill)", border: "1px solid var(--border)", padding: "0 14px", fontSize: 13 }}
        />
        <button
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          aria-label="Comentar"
          style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--cyan)", color: "var(--cyan-ink)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: enviando || !texto.trim() ? 0.5 : 1 }}
        >
          <PaperPlaneTilt size={15} weight="fill" />
        </button>
      </div>
    </Sheet>
  );
}

function ComentarioFila({ c, small, onLike, onResponder }: { c: Comentario; small?: boolean; onLike: () => void; onResponder: () => void }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <Avatar nombre={c.nombre} foto={c.foto_perfil} size={small ? 26 : 32} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: small ? 12 : 12.5 }}>
          <span style={{ fontWeight: 700 }}>{c.nombre}</span> <span style={{ color: "var(--text-secondary)" }}>{c.comentario}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
          <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{relativeTime(c.created_at)}</span>
          <button onClick={onLike} style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: c.yo_like ? "var(--danger)" : "var(--text-muted)" }}>
            <Heart size={12} weight={c.yo_like ? "fill" : "regular"} />
            <span style={{ fontSize: 10.5 }}>{c.likes_count || ""}</span>
          </button>
          <button onClick={onResponder} style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <ArrowBendUpLeft size={12} />
            <span style={{ fontSize: 10.5, fontWeight: 600 }}>Responder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
