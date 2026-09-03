import { useEffect, useState } from "react";
import { Bicycle, Flag, ShoppingBag, Storefront, TreeStructure, Trash, UsersThree, Warning, X } from "@phosphor-icons/react";
import { adminApi, ApiError } from "../../lib/api";
import { money } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";

type Arbol = Awaited<ReturnType<typeof adminApi.arbolControl>>["arbol"];
type ReportesReel = Awaited<ReturnType<typeof adminApi.reportesReel>>["reportes"];
type ReportesGenerales = Awaited<ReturnType<typeof adminApi.reportesGenerales>>["reportes"];
type Tab = "vendedores" | "repartidores" | "compradores" | "tiendas" | "productos" | "reels" | "reportes";

const TABS: { key: Tab; label: string; icon: typeof UsersThree }[] = [
  { key: "vendedores", label: "Vendedores", icon: Storefront },
  { key: "repartidores", label: "Repartidores", icon: Bicycle },
  { key: "compradores", label: "Compradores", icon: UsersThree },
  { key: "tiendas", label: "Tiendas", icon: Storefront },
  { key: "productos", label: "Productos", icon: ShoppingBag },
  { key: "reels", label: "Reels", icon: Flag },
  { key: "reportes", label: "Reportes", icon: Warning },
];

const FILTROS_REPORTE: { key: "" | "tienda" | "comentario" | "chat"; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "tienda", label: "Tiendas" },
  { key: "comentario", label: "Comentarios" },
  { key: "chat", label: "Chats" },
];

export function AdminArbol() {
  const [arbol, setArbol] = useState<Arbol | null>(null);
  const [tab, setTab] = useState<Tab>("vendedores");
  const [reelSeleccionado, setReelSeleccionado] = useState<{ id: number; nombre: string } | null>(null);
  const [reportesGenerales, setReportesGenerales] = useState<ReportesGenerales | null>(null);
  const [filtroReporte, setFiltroReporte] = useState<"" | "tienda" | "comentario" | "chat">("");
  const toast = useToast();

  useEffect(() => {
    adminApi.arbolControl().then((r) => setArbol(r.arbol)).catch((err) => toast.show(err instanceof ApiError ? err.message : "No se pudo cargar el árbol.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarReportesGenerales = () => {
    setReportesGenerales(null);
    adminApi
      .reportesGenerales(filtroReporte || undefined)
      .then((r) => setReportesGenerales(r.reportes))
      .catch(() => setReportesGenerales([]));
  };

  useEffect(() => {
    if (tab === "reportes") cargarReportesGenerales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filtroReporte]);

  const resolverReporteGeneral = async (id: number, estado: "resuelto" | "descartado") => {
    try {
      await adminApi.resolverReporteGeneral(id, estado);
      toast.show(estado === "resuelto" ? "Reporte resuelto" : "Reporte descartado", "success");
      cargarReportesGenerales();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar el reporte.", "error");
    }
  };

  const eliminarComentario = async (id: number) => {
    if (!window.confirm("¿Eliminar este comentario reportado? También se borran sus respuestas.")) return;
    try {
      await adminApi.eliminarComentarioReel(id);
      toast.show("Comentario eliminado", "success");
      cargarReportesGenerales();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar el comentario.", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <TreeStructure size={20} /> Árbol de control
      </h1>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = t.key === "reportes" ? undefined : arbol?.[t.key]?.length ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: "var(--radius-pill)", border: `1px solid ${tab === t.key ? "var(--cyan)" : "var(--border)"}`, background: tab === t.key ? "var(--cyan-bg)" : "var(--surface-1)", color: tab === t.key ? "var(--cyan)" : "var(--text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              <Icon size={14} />
              {t.label}
              {count !== undefined && (
                <span className="tabular" style={{ opacity: 0.7 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "reportes" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTROS_REPORTE.map((f) => (
              <button
                key={f.key}
                onClick={() => setFiltroReporte(f.key)}
                style={{ padding: "6px 12px", borderRadius: "var(--radius-pill)", border: `1px solid ${filtroReporte === f.key ? "var(--danger)" : "var(--border)"}`, background: filtroReporte === f.key ? "var(--danger-bg)" : "var(--surface-1)", color: filtroReporte === f.key ? "var(--danger-ink)" : "var(--text-secondary)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {reportesGenerales === null ? (
              <Skeleton height={200} />
            ) : reportesGenerales.length === 0 ? (
              <p style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>No hay reportes {filtroReporte ? `de ${filtroReporte}s` : ""} por ahora.</p>
            ) : (
              reportesGenerales.map((r) => (
                <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", color: "var(--cyan)", background: "var(--cyan-bg)", padding: "2px 8px", borderRadius: "var(--radius-pill)" }}>{r.tipo}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{r.objetivo}</span>
                    {r.estado !== "pendiente" && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: r.estado === "resuelto" ? "var(--ok)" : "var(--text-muted)" }}>· {r.estado}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <strong>{r.motivo}</strong>
                    {r.detalle ? ` — ${r.detalle}` : ""}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Reportado por {r.usuario_nombre} · {new Date(r.created_at).toLocaleString()}
                  </div>
                  {r.estado === "pendiente" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button onClick={() => resolverReporteGeneral(r.id, "resuelto")} style={smallBtnStyle("var(--ok)")}>
                        Marcar resuelto
                      </button>
                      <button onClick={() => resolverReporteGeneral(r.id, "descartado")} style={smallBtnStyle("var(--text-secondary)")}>
                        Descartar
                      </button>
                      {r.tipo === "comentario" && (
                        <button onClick={() => eliminarComentario(r.entidad_id)} style={smallBtnStyle("var(--danger)")}>
                          <Trash size={11} weight="bold" /> Eliminar comentario
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : arbol === null ? (
        <Skeleton height={300} />
      ) : (
        <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          {(tab === "vendedores" || tab === "repartidores" || tab === "compradores") &&
            arbol[tab].map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <Avatar nombre={u.nombre} foto={u.foto_perfil} size={30} online={!!u.en_linea} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: u.activo ? "var(--ok)" : "var(--danger)" }}>{u.activo ? "Activo" : "Suspendido"}</span>
              </div>
            ))}

          {tab === "tiendas" &&
            arbol.tiendas.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>{t.logo && <img src={t.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {t.vendedor_nombre} · {t.municipio}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.activo ? "var(--ok)" : "var(--danger)" }}>{t.activo ? "Activa" : "Suspendida"}</span>
              </div>
            ))}

          {tab === "productos" &&
            arbol.productos.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>{p.imagen && <img src={p.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{p.tienda_nombre}</div>
                </div>
                <span className="tabular" style={{ fontSize: 12, fontWeight: 700 }}>{money(p.precio)}</span>
              </div>
            ))}

          {tab === "reels" &&
            arbol.reels.map((r) => (
              <button
                key={r.id}
                onClick={() => r.reportes > 0 && setReelSeleccionado({ id: r.id, nombre: r.nombre })}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)", width: "100%", textAlign: "left", background: "none", border: "none", borderRadius: 0, cursor: r.reportes > 0 ? "pointer" : "default" }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)", overflow: "hidden", flexShrink: 0 }}>{r.imagen && <img src={r.imagen} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.nombre}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.tienda_nombre}</div>
                </div>
                {r.reportes > 0 && (
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "var(--danger)", background: "var(--danger-bg)", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>{r.reportes} reportes</span>
                )}
              </button>
            ))}
        </div>
      )}

      {reelSeleccionado && (
        <ReelReportesModal reel={reelSeleccionado} onClose={() => setReelSeleccionado(null)} onCambio={() => adminApi.arbolControl().then((r) => setArbol(r.arbol))} />
      )}
    </div>
  );
}

function smallBtnStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 10px",
    borderRadius: "var(--radius-sm)",
    border: `1px solid ${color}`,
    background: "transparent",
    color,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };
}

/** Panel de moderación de un reel reportado: lista los reportes puntuales y permite
 * descartarlos, advertir al vendedor, o eliminar el reel directamente. */
function ReelReportesModal({ reel, onClose, onCambio }: { reel: { id: number; nombre: string }; onClose: () => void; onCambio: () => void }) {
  const toast = useToast();
  const [reportes, setReportes] = useState<ReportesReel | null>(null);

  const cargar = () => {
    adminApi.reportesReel(reel.id).then((r) => setReportes(r.reportes)).catch(() => setReportes([]));
  };
  useEffect(cargar, [reel.id]);

  const descartar = async () => {
    await adminApi.descartarReportes(reel.id);
    toast.show("Reportes descartados", "success");
    cargar();
    onCambio();
  };

  const advertir = async () => {
    await adminApi.advertirVendedorReel(reel.id, "Revisado por el equipo de moderación.");
    toast.show("Vendedor advertido", "success");
    cargar();
    onCambio();
  };

  const eliminar = async () => {
    if (!window.confirm(`¿Eliminar el reel "${reel.nombre}"? Esta acción no se puede deshacer.`)) return;
    await adminApi.eliminarReel(reel.id);
    toast.show("Reel eliminado", "success");
    onCambio();
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(8,11,20,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--surface-1)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", padding: 20 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Reportes de "{reel.nombre}"</h3>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        {reportes === null ? (
          <Skeleton height={100} />
        ) : reportes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>No hay reportes pendientes.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {reportes.map((r) => (
              <div key={r.id} style={{ padding: 10, borderRadius: "var(--radius-sm)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.motivo}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {r.usuario_nombre} · {new Date(r.created_at).toLocaleString()} · {r.estado}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={descartar} style={smallBtnStyle("var(--text-secondary)")}>
            Descartar reportes
          </button>
          <button onClick={advertir} style={smallBtnStyle("var(--warn)")}>
            Advertir vendedor
          </button>
          <button onClick={eliminar} style={smallBtnStyle("var(--danger)")}>
            <Trash size={11} weight="bold" /> Eliminar reel
          </button>
        </div>
      </div>
    </div>
  );
}
