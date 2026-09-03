import { useEffect, useState } from "react";
import { CheckCircle, Handshake, X } from "@phosphor-icons/react";
import { adminApi, ApiError } from "../../lib/api";
import type { SolicitudRol } from "../../lib/types";
import { formatDate, formatDui } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ImageLightbox } from "../../components/ui/ImageLightbox";

const VEHICULO_LABEL: Record<string, string> = { moto: "Moto", bicicleta: "Bicicleta", carro: "Carro", a_pie: "A pie" };

function imagenesDe(s: SolicitudRol): { label: string; url: string }[] {
  const imgs: { label: string; url: string }[] = [];
  if (s.dui_frente) imgs.push({ label: "DUI (frente)", url: s.dui_frente });
  if (s.dui_reverso) imgs.push({ label: "DUI (reverso)", url: s.dui_reverso });
  if (s.rol_solicitado === "repartidor") {
    if (s.licencia_frente) imgs.push({ label: "Licencia (frente)", url: s.licencia_frente });
    if (s.licencia_reverso) imgs.push({ label: "Licencia (reverso)", url: s.licencia_reverso });
  }
  if (s.rol_solicitado === "vendedor" && s.foto_negocio) imgs.push({ label: "Foto del negocio", url: s.foto_negocio });
  return imgs;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 6, fontSize: 12.5, marginTop: 4 }}>
      <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{label}:</span>
      <span style={{ color: "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}

export function AdminSolicitudes() {
  const [tab, setTab] = useState<"pendiente" | "aprobado" | "rechazado">("pendiente");
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[] | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const toast = useToast();

  const cargar = () => {
    adminApi.solicitudes(tab).then((r) => setSolicitudes(r.solicitudes)).catch(() => setSolicitudes([]));
  };

  useEffect(cargar, [tab]);

  const resolver = async (s: SolicitudRol, decision: "aprobado" | "rechazado") => {
    try {
      await adminApi.resolver(s.id, decision);
      toast.show(decision === "aprobado" ? "Solicitud aprobada" : "Solicitud rechazada", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo resolver.", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
      <h1 style={{ fontSize: 20 }}>Solicitudes de rol</h1>
      <div style={{ display: "flex", gap: 6, background: "var(--surface-2)", padding: 4, borderRadius: "var(--radius-sm)", width: "fit-content" }}>
        {(["pendiente", "aprobado", "rechazado"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, textTransform: "capitalize", background: tab === t ? "var(--surface-1)" : "transparent", color: tab === t ? "var(--text-primary)" : "var(--text-secondary)" }}>
            {t}
          </button>
        ))}
      </div>

      {solicitudes === null ? (
        <Skeleton height={200} />
      ) : solicitudes.length === 0 ? (
        <EmptyState icon={<Handshake size={24} />} title="Nada por aquí" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {solicitudes.map((s) => {
            const imagenes = imagenesDe(s);
            return (
              <Card key={s.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                      {s.nombre_completo} <span style={{ color: "var(--cyan)", textTransform: "capitalize" }}>· {s.rol_solicitado}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {s.usuario_nombre} · {s.email} · {formatDate(s.created_at)}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <DetailRow label="DUI" value={s.dui_numero ? formatDui(s.dui_numero) : null} />
                      <DetailRow label="Municipio" value={s.municipio} />
                      {s.rol_solicitado === "repartidor" && (
                        <>
                          <DetailRow label="Vehículo" value={s.tipo_vehiculo ? VEHICULO_LABEL[s.tipo_vehiculo] ?? s.tipo_vehiculo : null} />
                          <DetailRow label="Modelo" value={s.vehiculo_modelo} />
                          <DetailRow label="Placa" value={s.vehiculo_placa} />
                          <DetailRow label="N° de licencia" value={s.licencia_numero} />
                        </>
                      )}
                      {s.rol_solicitado === "vendedor" && <DetailRow label="Negocio" value={s.nombre_negocio} />}
                      <DetailRow label="Credenciales" value={s.credenciales} />
                      {s.estado === "rechazado" && <DetailRow label="Motivo de rechazo" value={s.notas_admin} />}
                    </div>
                  </div>
                  {tab === "pendiente" && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Button size="sm" onClick={() => resolver(s, "aprobado")}>
                        <CheckCircle size={14} /> Aprobar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => resolver(s, "rechazado")}>
                        <X size={14} /> Rechazar
                      </Button>
                    </div>
                  )}
                </div>

                {imagenes.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                    {imagenes.map((img, i) => (
                      <button
                        key={img.label}
                        onClick={() => setLightbox({ images: imagenes.map((x) => x.url), index: i })}
                        style={{ border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                      >
                        <img src={img.url} alt={img.label} style={{ width: 84, height: 84, objectFit: "cover", borderRadius: "var(--radius-sm)", background: "var(--surface-2)", display: "block" }} />
                        <span style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginTop: 3, maxWidth: 84, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {img.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onIndexChange={(i) => setLightbox({ images: lightbox.images, index: i })}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
