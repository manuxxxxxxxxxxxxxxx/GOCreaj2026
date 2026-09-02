import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapTrifold, Package, Star, Trophy } from "@phosphor-icons/react";
import { repartidorApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { fileToBase64, formatDate, formatDateTime, money, numeroPedido } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatusPill } from "../../components/ui/StatusPill";
import { ProfileBadges, type ProfileBadge } from "../../components/domain/ProfileBadges";

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

type Tab = "resenas" | "entregas";

export function RepartidorPerfil() {
  const { actualizarUsuarioLocal, usuario } = useAuth();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [entregas, setEntregas] = useState<Pedido[] | null>(null);
  const [tab, setTab] = useState<Tab>("resenas");
  const [guardando, setGuardando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    repartidorApi.miPerfil().then((r) => {
      setPerfil(r.perfil);
      setDescripcion(r.perfil.descripcion ?? "");
    });
    repartidorApi.misResenas().then((r) => setResenas(r.resenas)).catch(() => {});
    repartidorApi.misEntregas().then((r) => setEntregas(r.pedidos)).catch(() => setEntregas([]));
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

  const heroStats: { label: string; value: string; tab?: Tab }[] = [
    { label: "Entregas", value: String(perfil.entregas_completadas), tab: "entregas" },
    { label: "Calificación", value: perfil.repartidor_calificacion_promedio ? perfil.repartidor_calificacion_promedio.toFixed(1) : "Nuevo", tab: "resenas" },
    { label: "Reseñas", value: String(perfil.repartidor_total_resenas), tab: "resenas" },
  ];

  const repartidorBadges: ProfileBadge[] = [
    { icon: <Trophy size={16} weight="fill" />, label: "Primera entrega", current: perfil.entregas_completadas, target: 1, accent: "coral" },
    { icon: <Trophy size={16} weight="fill" />, label: "Repartidor confiable", current: perfil.entregas_completadas, target: 25, accent: "coral" },
    { icon: <Trophy size={16} weight="fill" />, label: "Bien calificado", current: perfil.repartidor_total_resenas, target: 5, accent: "coral" },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
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
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{perfil.telefono}</p>
        </div>
      </div>

      <Card>
        <div style={{ display: "flex" }}>
          {heroStats.map((s, i) => (
            <button
              key={s.label}
              onClick={() => s.tab && setTab(s.tab)}
              style={{
                flex: 1,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                background: "none",
                border: "none",
                borderLeft: i > 0 ? "1px solid var(--border)" : "none",
                cursor: s.tab ? "pointer" : "default",
                padding: "2px 0",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                {s.label === "Calificación" && <Star size={14} weight="fill" color="var(--warn)" />}
                {s.value}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{s.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <section>
        <h2 style={{ fontSize: 13.5, marginBottom: 12, textAlign: "center" }}>Pasos completados</h2>
        <ProfileBadges badges={repartidorBadges} />
      </section>

      <Card>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Sobre ti</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} placeholder="Cuéntale a los compradores un poco sobre ti" style={{ width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 13.5, fontFamily: "inherit", resize: "vertical" }} />
        <Button onClick={guardar} loading={guardando} style={{ marginTop: 12 }} size="sm">
          Guardar
        </Button>
      </Card>

      <div>
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          <TabButton active={tab === "resenas"} icon={<Star size={16} weight={tab === "resenas" ? "fill" : "regular"} />} label="Reseñas" onClick={() => setTab("resenas")} />
          <TabButton active={tab === "entregas"} icon={<MapTrifold size={16} weight={tab === "entregas" ? "fill" : "regular"} />} label="Historial de entregas" onClick={() => setTab("entregas")} />
        </div>

        <div style={{ paddingTop: 12 }}>
          {tab === "resenas" &&
            (resenas.length === 0 ? (
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
            ))}

          {tab === "entregas" &&
            (entregas === null ? (
              <Skeleton height={160} />
            ) : entregas.length === 0 ? (
              <EmptyState icon={<MapTrifold size={22} />} title="Aún no tienes entregas" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entregas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/pedidos/${p.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-1)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Pedido #{numeroPedido(p)}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.vendedor_nombre} · {formatDateTime(p.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <StatusPill estado={p.estado} />
                      <div className="tabular" style={{ fontWeight: 700, fontSize: 12.5, marginTop: 6 }}>
                        {money(p.total)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "12px 4px",
        background: "none",
        border: "none",
        borderBottom: active ? "2px solid var(--cyan)" : "2px solid transparent",
        color: active ? "var(--cyan)" : "var(--text-muted)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {icon} {label}
    </button>
  );
}
