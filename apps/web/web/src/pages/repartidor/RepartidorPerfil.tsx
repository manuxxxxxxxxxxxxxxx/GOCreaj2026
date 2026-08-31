import { useEffect, useRef, useState } from "react";
import { Camera, Package, Star } from "@phosphor-icons/react";
import { repartidorApi, ApiError } from "../../lib/api";
import { fileToBase64, formatDate } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

interface Perfil {
  id: number;
  nombre: string;
  foto_perfil: string | null;
  descripcion: string | null;
  telefono: string;
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

export function RepartidorPerfil() {
  const { actualizarUsuarioLocal, usuario } = useAuth();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [guardando, setGuardando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    repartidorApi.miPerfil().then((r) => {
      setPerfil(r.perfil);
      setDescripcion(r.perfil.descripcion ?? "");
    });
    repartidorApi.misResenas().then((r) => setResenas(r.resenas)).catch(() => {});
  }, []);

  const guardar = async () => {
    setGuardando(true);
    try {
      await repartidorApi.actualizarPerfil({ descripcion });
      toast.show("Perfil actualizado", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const subirFoto = async (file: File) => {
    const b64 = await fileToBase64(file);
    try {
      const r = await repartidorApi.actualizarPerfil({ foto_perfil: b64 });
      setPerfil((p) => (p ? { ...p, foto_perfil: r.foto_perfil } : p));
      if (usuario) actualizarUsuarioLocal({ ...usuario, foto_perfil: r.foto_perfil });
      toast.show("Foto actualizada", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo subir la foto.", "error");
    }
  };

  if (!perfil) return <Skeleton height={200} />;

  return (
    <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative" }}>
          <Avatar nombre={perfil.nombre} foto={perfil.foto_perfil} size={72} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && subirFoto(e.target.files[0])} />
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Cambiar foto"
            style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%", background: "var(--cyan)", color: "var(--cyan-ink)", border: "2px solid var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Camera size={13} weight="bold" />
          </button>
        </div>
        <div>
          <h1 style={{ fontSize: 20 }}>{perfil.nombre}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "var(--text-secondary)" }}>
            <Star size={13} weight="fill" color="var(--warn)" /> {perfil.repartidor_calificacion_promedio?.toFixed(1) ?? "Nuevo"} ({perfil.repartidor_total_resenas}) · {perfil.entregas_completadas} entregas
          </div>
        </div>
      </div>

      <Card>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Sobre ti</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Cuéntale a los compradores un poco sobre ti" style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }} />
        <Button onClick={guardar} loading={guardando} style={{ marginTop: 12 }} size="sm">
          Guardar
        </Button>
      </Card>

      <section>
        <h2 style={{ fontSize: 13.5, marginBottom: 10 }}>Reseñas recibidas</h2>
        {resenas.length === 0 ? (
          <EmptyState icon={<Package size={22} />} title="Aún no tienes reseñas" />
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
      </section>
    </div>
  );
}
