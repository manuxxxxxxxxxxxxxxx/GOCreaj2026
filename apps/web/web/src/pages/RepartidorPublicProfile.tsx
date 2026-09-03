import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapTrifold, Moped, Package, Phone, Star } from "@phosphor-icons/react";
import { chatApi, ApiError } from "../lib/api";
import { Avatar } from "../components/ui/Avatar";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../lib/format";
import { useToast } from "../context/ToastContext";

interface Perfil {
  id: number;
  nombre: string;
  foto_perfil: string | null;
  descripcion: string | null;
  telefono: string | null;
  repartidor_calificacion_promedio: number;
  repartidor_total_resenas: number;
  entregas_completadas: number;
}

interface Resena {
  id: number;
  estrellas: number;
  comentario: string;
  created_at: string;
  comprador_nombre: string;
}

/** Ficha pública de un repartidor (a la que se llega tocando su nombre/avatar dentro
 * del chat) -- de solo lectura, a diferencia de RepartidorPerfil.tsx que es la pantalla
 * de "editar mi propio perfil" del repartidor autenticado. */
export function RepartidorPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined);
  const [resenas, setResenas] = useState<Resena[]>([]);

  useEffect(() => {
    if (!id) return;
    chatApi
      .perfilPublicoRepartidor(Number(id))
      .then((r) => {
        setPerfil(r.perfil);
        setResenas(r.resenas);
      })
      .catch((err) => {
        setPerfil(null);
        toast.show(err instanceof ApiError ? err.message : "No se pudo cargar el perfil.", "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (perfil === undefined) return <Skeleton height={200} />;
  if (perfil === null) {
    return <EmptyState icon={<Moped size={22} />} title="Repartidor no encontrado" />;
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar nombre={perfil.nombre} foto={perfil.foto_perfil} size={72} />
        <div>
          <h1 style={{ fontSize: 20 }}>{perfil.nombre}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
            <Moped size={14} /> Repartidor
          </div>
        </div>
      </div>

      <Card>
        <div style={{ display: "flex" }}>
          {[
            { label: "Entregas", value: String(perfil.entregas_completadas) },
            { label: "Calificación", value: perfil.repartidor_calificacion_promedio ? perfil.repartidor_calificacion_promedio.toFixed(1) : "Nuevo" },
            { label: "Reseñas", value: String(perfil.repartidor_total_resenas) },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", gap: 2, borderLeft: i > 0 ? "1px solid var(--border)" : "none", padding: "2px 0" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                {s.label === "Calificación" && <Star size={14} weight="fill" color="var(--warn)" />}
                {s.value}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {perfil.descripcion && (
        <Card>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{perfil.descripcion}</p>
        </Card>
      )}

      {perfil.telefono && (
        <button
          onClick={() => navigate(`/chat/${perfil.id}`)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-1)", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: "var(--cyan)" }}
        >
          <Phone size={16} /> Volver al chat
        </button>
      )}

      <div>
        <h2 style={{ fontSize: 13.5, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <MapTrifold size={16} /> Reseñas
        </h2>
        {resenas.length === 0 ? (
          <EmptyState icon={<Package size={22} />} title="Aún no tiene reseñas" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resenas.map((r) => (
              <Card key={r.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{r.comprador_nombre}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatDate(r.created_at)}</span>
                </div>
                <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} weight={i < r.estrellas ? "fill" : "regular"} color="var(--warn)" />
                  ))}
                </div>
                {r.comentario && <p style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{r.comentario}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
