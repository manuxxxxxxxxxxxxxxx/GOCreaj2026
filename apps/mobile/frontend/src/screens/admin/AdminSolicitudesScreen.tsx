import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { CheckCircleIcon, HandshakeIcon, XIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { adminApi, ApiError } from "../../lib/api";
import type { SolicitudRol } from "../../lib/types";
import { formatDate, formatDui } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ImageLightbox } from "../../components/ui/ImageLightbox";

const TABS = ["pendiente", "aprobado", "rechazado"] as const;

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
  const { tokens } = useTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: tokens.textMuted }}>{label}:</Text>
      <Text style={{ fontSize: 12, color: tokens.textSecondary, flex: 1 }}>{value}</Text>
    </View>
  );
}

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminSolicitudes.tsx. */
export function AdminSolicitudesScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pendiente");
  const [solicitudes, setSolicitudes] = useState<SolicitudRol[] | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

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
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 12, gap: 12 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Solicitudes de rol</Text>
        <View style={{ flexDirection: "row", gap: 6, backgroundColor: tokens.surface2, padding: 4, borderRadius: 10, alignSelf: "flex-start" }}>
          {TABS.map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: tab === t ? tokens.surface1 : "transparent" }}>
              <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", textTransform: "capitalize", color: tab === t ? tokens.textPrimary : tokens.textSecondary }}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {solicitudes === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={80} radius={14} />
        </View>
      ) : solicitudes.length === 0 ? (
        <EmptyState icon={<HandshakeIcon size={22} color={tokens.textMuted} />} title="Nada por aquí" />
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 10, paddingBottom: 24 }}
          renderItem={({ item: s }) => {
            const imagenes = imagenesDe(s);
            return (
              <Card>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>
                  {s.nombre_completo} <Text style={{ color: tokens.cyan, textTransform: "capitalize" }}>· {s.rol_solicitado}</Text>
                </Text>
                <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 2 }}>
                  {s.usuario_nombre} · {s.email} · {formatDate(s.created_at)}
                </Text>

                <View style={{ marginTop: 8 }}>
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
                </View>

                {imagenes.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {imagenes.map((img, i) => (
                      <Pressable key={img.label} onPress={() => setLightbox({ images: imagenes.map((x) => x.url), index: i })}>
                        <Image source={{ uri: img.url }} style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: tokens.surface2 }} />
                        <Text style={{ fontSize: 9.5, color: tokens.textMuted, marginTop: 3, maxWidth: 72 }} numberOfLines={1}>
                          {img.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {tab === "pendiente" && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <Button size="sm" icon={<CheckCircleIcon size={14} color={tokens.cyanInk} />} onPress={() => resolver(s, "aprobado")}>
                      Aprobar
                    </Button>
                    <Button size="sm" variant="danger" icon={<XIcon size={14} color="#fff" />} onPress={() => resolver(s, "rechazado")}>
                      Rechazar
                    </Button>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onIndexChange={(i) => setLightbox({ images: lightbox.images, index: i })}
          onClose={() => setLightbox(null)}
        />
      )}
    </View>
  );
}
