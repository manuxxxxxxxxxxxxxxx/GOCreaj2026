import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import { CaretLeftIcon, ClockIcon, CreditCardIcon, MapPinIcon, PhoneIcon, PlayIcon, StarIcon, StorefrontIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { productosApi, interaccionesApi, vendedorApi, ApiError } from "../../lib/api";
import type { Producto, Tienda } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { CATEGORIA_LABEL, categoriaColor, categoriaIcon, type Categoria } from "../../lib/categoryIcons";
import { Skeleton } from "../../components/ui/Skeleton";
import { ProductCard } from "../../components/domain/ProductCard";
import { WebMapView } from "../../components/ui/WebMapView";
import { StoreHero } from "../../components/domain/store/StoreHero";
import { StoreEmptyState } from "../../components/domain/store/StoreEmptyState";
import { ReportSheet } from "../../components/domain/ReportSheet";

type Props = NativeStackScreenProps<RootStackParamList, "StoreDetail">;

interface Resena {
  id: number;
  estrellas: number;
  comentario: string;
  respuesta_vendedor: string | null;
  created_at: string;
  comprador_nombre: string;
}

type Tab = "productos" | "reels" | "sobre-nosotros" | "resenas";

const TABS: { key: Tab; label: string }[] = [
  { key: "productos", label: "Productos" },
  { key: "reels", label: "Reels" },
  { key: "sobre-nosotros", label: "Sobre Nosotros" },
  { key: "resenas", label: "Reseñas" },
];

function parseHora(h: string): number | null {
  const m = h.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function calcAbierto(tienda: Tienda | null): boolean | null {
  if (!tienda?.hora_apertura || !tienda?.hora_cierre) return null;
  const open = parseHora(tienda.hora_apertura);
  const close = parseHora(tienda.hora_cierre);
  if (open === null || close === null) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (close > open) return nowMin >= open && nowMin < close;
  return nowMin >= open || nowMin < close;
}

export function StoreDetailScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const toast = useToast();
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [reels, setReels] = useState<Producto[] | null>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [tab, setTab] = useState<Tab>("productos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [reportando, setReportando] = useState(false);
  const [subiendoPortada, setSubiendoPortada] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const isOwner = !!usuario && usuario.rol === "vendedor" && tienda?.vendedor_id === usuario.id;

  useEffect(() => {
    const tid = route.params.id;
    productosApi.tiendaDetalle(tid).then((r) => setTienda(r.tienda)).catch(() => setTienda(null));
    productosApi.listar({ tienda_id: tid, limit: 60 }).then((r) => setProductos(r.productos)).catch(() => setProductos([]));
    productosApi.reels({ tienda_id: tid }).then((r) => setReels(r.reels)).catch(() => setReels([]));
    productosApi.tiendaResenas(tid).then((r) => setResenas(r.resenas)).catch(() => setResenas([]));
  }, [route.params.id]);

  const toggleSeguir = async () => {
    if (!tienda) return;
    const r = await interaccionesApi.seguirTienda(tienda.id);
    setTienda({ ...tienda, yo_sigo: r.accion === "follow" ? 1 : 0, seguidores_count: r.total_seguidores });
  };

  const contactar = () => {
    if (!tienda) return;
    navigation.navigate("ChatThread", { otroId: tienda.vendedor_id });
  };

  const cambiarPortada = async () => {
    if (!tienda) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (res.canceled || !res.assets[0].base64) return;
    const portada = `data:${res.assets[0].mimeType ?? "image/jpeg"};base64,${res.assets[0].base64}`;
    setSubiendoPortada(true);
    try {
      await vendedorApi.actualizarTienda({ tienda_id: tienda.id, portada });
      setTienda({ ...tienda, portada });
      toast.show("Portada actualizada", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la portada.", "error");
    } finally {
      setSubiendoPortada(false);
    }
  };

  const cambiarLogo = async () => {
    if (!tienda) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (res.canceled || !res.assets[0].base64) return;
    const logo = `data:${res.assets[0].mimeType ?? "image/jpeg"};base64,${res.assets[0].base64}`;
    setSubiendoLogo(true);
    try {
      await vendedorApi.actualizarTienda({ tienda_id: tienda.id, logo });
      setTienda({ ...tienda, logo });
      toast.show("Foto de perfil actualizada", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la foto de perfil.", "error");
    } finally {
      setSubiendoLogo(false);
    }
  };

  const abierto = calcAbierto(tienda);

  const mapCenter = useMemo<[number, number] | null>(() => {
    if (!tienda || tienda.lat === null || tienda.lng === null) return null;
    return [tienda.lng, tienda.lat];
  }, [tienda]);

  // Categorías que la tienda realmente vende -- solo las que aparecen entre sus propios
  // productos, no las 129 categorías de la plataforma (mismo cálculo que la web).
  const categoriasDeLaTienda = useMemo(() => {
    const vistas = new Set<string>();
    const lista: string[] = [];
    (productos ?? []).forEach((p) => {
      if (p.categoria && !vistas.has(p.categoria)) {
        vistas.add(p.categoria);
        lista.push(p.categoria);
      }
    });
    return lista;
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    if (!productos || !categoriaFiltro) return productos;
    return productos.filter((p) => p.categoria === categoriaFiltro);
  }, [productos, categoriaFiltro]);

  const openReel = (r: Producto) => navigation.navigate("Tabs", { screen: "Reels", params: { tiendaId: r.tienda_id, productoId: r.id } });

  if (!tienda) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20 }}>
        <Skeleton height={200} radius={20} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Pressable onPress={navigation.goBack} style={[styles.backRow, { paddingTop: insets.top + 12 }]}>
          <CaretLeftIcon size={16} weight="bold" color={tokens.textSecondary} />
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: tokens.textSecondary }}>Volver</Text>
        </Pressable>
        <StoreHero
          tienda={tienda}
          isOwner={isOwner}
          notifOn={!!tienda.yo_sigo}
          onPortadaChange={cambiarPortada}
          subiendoPortada={subiendoPortada}
          onLogoChange={cambiarLogo}
          subiendoLogo={subiendoLogo}
          onEditarProductos={isOwner ? () => navigation.navigate("VendedorProductos") : undefined}
          onToggleSeguir={toggleSeguir}
          onToggleNotif={() => {}}
          onContactar={contactar}
          onReportar={() => setReportando(true)}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tabsRow, { backgroundColor: tokens.surface2 }]}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tabBtn, { backgroundColor: active ? tokens.surface1 : "transparent" }]}>
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: active ? tokens.textPrimary : tokens.textMuted }}>
                  {t.label}
                  {t.key === "reels" && !!reels?.length ? ` (${reels.length})` : ""}
                  {t.key === "resenas" && !!tienda.total_resenas ? ` (${tienda.total_resenas})` : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 24 }}>
          {tab === "productos" && (
            <View style={{ gap: 14 }}>
              {!!categoriasDeLaTienda.length && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <FiltroChip label="Todas" active={!categoriaFiltro} onPress={() => setCategoriaFiltro(null)} />
                  {categoriasDeLaTienda.map((c) => {
                    const color = categoriaColor(c);
                    const CatIcon = categoriaIcon(c);
                    const activo = categoriaFiltro === c;
                    return (
                      <FiltroChip
                        key={c}
                        label={CATEGORIA_LABEL[c as Categoria] ?? c}
                        icon={<CatIcon size={12} weight={activo ? "fill" : "regular"} color={activo ? color : tokens.textSecondary} />}
                        active={activo}
                        accent={color}
                        onPress={() => setCategoriaFiltro(c)}
                      />
                    );
                  })}
                </View>
              )}
              <ProductWrapGrid
                productos={productosFiltrados}
                isOwner={isOwner}
                empty={
                  categoriaFiltro ? (
                    <StoreEmptyState
                      icon={<StorefrontIcon size={20} color={tokens.cyan} />}
                      title="Sin productos en esta categoría"
                      description="Prueba con otra categoría o mira el catálogo completo."
                      actionLabel="Ver todas"
                      onAction={() => setCategoriaFiltro(null)}
                    />
                  ) : (
                    <StoreEmptyState
                      icon={<StorefrontIcon size={20} color={tokens.cyan} />}
                      title={isOwner ? "Todavía no has publicado productos" : "Sin productos todavía"}
                      description={isOwner ? "Agrega tu primer producto para que los compradores puedan encontrarte." : "Vuelve pronto, esta tienda está preparando su catálogo."}
                      actionLabel={isOwner ? "Agregar producto" : undefined}
                      onAction={isOwner ? () => navigation.navigate("VendedorProductos") : undefined}
                    />
                  )
                }
              />
            </View>
          )}

          {tab === "reels" && (
            <>
              {reels === null ? (
                <Skeleton height={220} radius={16} />
              ) : reels.length === 0 ? (
                <StoreEmptyState
                  // El triángulo de "play" no queda ópticamente centrado en su círculo
                  // como un ícono simétrico -- se nota corrido a la izquierda sin este
                  // empujón, porque el centroide del triángulo no coincide con el centro
                  // de su propio bounding box cuadrado.
                  icon={<PlayIcon size={20} color={tokens.violet} style={{ marginLeft: 2 }} />}
                  title={isOwner ? "Sube tu primer reel" : "Sin reels todavía"}
                  description={isOwner ? "Muestra tus productos en video corto, estilo TikTok." : undefined}
                  actionLabel={isOwner ? "Subir reel" : undefined}
                  onAction={isOwner ? () => navigation.navigate("VendedorTienda") : undefined}
                  tone="violet"
                />
              ) : (
                <ReelGrid reels={reels} onOpen={openReel} />
              )}
            </>
          )}

          {tab === "sobre-nosotros" && (
            <View style={{ gap: 16 }}>
              <View style={[styles.infoCard, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                {tienda.descripcion ? <Text style={[styles.desc, { color: tokens.textSecondary }]}>{tienda.descripcion}</Text> : null}
                <InfoRow icon={<MapPinIcon size={15} color={tokens.textMuted} />} text={[tienda.direccion, tienda.municipio].filter(Boolean).join(", ")} />
                {tienda.hora_apertura ? (
                  <InfoRow
                    icon={<ClockIcon size={15} color={tokens.textMuted} />}
                    text={`${tienda.hora_apertura.slice(0, 5)} – ${tienda.hora_cierre?.slice(0, 5)}`}
                    badge={abierto === null ? undefined : abierto ? "Abierto ahora" : "Cerrado"}
                    badgeOk={!!abierto}
                  />
                ) : null}
                {tienda.telefono ? <InfoRow icon={<PhoneIcon size={15} color={tokens.textMuted} />} text={tienda.telefono} /> : null}
                {tienda.metodos_pago ? <InfoRow icon={<CreditCardIcon size={15} color={tokens.textMuted} />} text={tienda.metodos_pago} /> : null}
              </View>

              {mapCenter ? (
                <View style={{ height: 200, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: tokens.border }}>
                  <WebMapView center={mapCenter} zoom={15} interactive markers={[{ id: tienda.id, coordinate: mapCenter, category: tienda.categoria?.split(",")[0] ?? undefined }]} />
                </View>
              ) : (
                <StoreEmptyState icon={<MapPinIcon size={20} color={tokens.cyan} />} title="Ubicación no disponible" description="Esta tienda todavía no ha registrado su dirección exacta." compact />
              )}
            </View>
          )}

          {tab === "resenas" &&
            (resenas.length === 0 ? (
              <StoreEmptyState icon={<StarIcon size={20} color={tokens.warn} />} title="Aún no hay reseñas" description="Aparecerán aquí cuando los clientes califiquen un pedido entregado." />
            ) : (
              <View style={{ gap: 10 }}>
                {resenas.map((r) => (
                  <View key={r.id} style={[styles.resena, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>{r.comprador_nombre}</Text>
                      <Text style={{ fontSize: 11, color: tokens.textMuted }}>{formatDate(r.created_at)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 2, marginVertical: 4 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} size={12} weight={i < r.estrellas ? "fill" : "regular"} color={tokens.warn} />
                      ))}
                    </View>
                    <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{r.comentario}</Text>
                    {r.respuesta_vendedor ? (
                      <View style={[styles.reply, { backgroundColor: tokens.surface2 }]}>
                        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.cyan, marginBottom: 2 }}>Respuesta de la tienda</Text>
                        <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>{r.respuesta_vendedor}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
        </View>
      </ScrollView>
      {reportando && <ReportSheet tipo="tienda" entidadId={tienda.id} entidadNombre={tienda.nombre} onClose={() => setReportando(false)} />}
    </View>
  );
}

function FiltroChip({ label, icon, active, accent, onPress }: { label: string; icon?: React.ReactNode; active: boolean; accent?: string; onPress: () => void }) {
  const { tokens } = useTheme();
  const color = accent ?? tokens.cyan;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? color : tokens.border,
        backgroundColor: active ? `${color}29` : tokens.surface1,
      }}
    >
      {icon}
      <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: active ? color : tokens.textSecondary, textTransform: "capitalize" }}>{label}</Text>
    </Pressable>
  );
}

function ProductWrapGrid({ productos, empty, isOwner }: { productos: Producto[] | null; empty: React.ReactNode; isOwner?: boolean }) {
  if (productos === null) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={180} radius={16} width="47%" />
        ))}
      </View>
    );
  }
  if (productos.length === 0) return <>{empty}</>;
  return (
    <View style={styles.productGrid}>
      {productos.map((p) => (
        <View key={p.id} style={styles.productCell}>
          {/* El dueño de la tienda no le da like a sus propios productos. */}
          <ProductCard producto={p} height={130} showWishlist={!isOwner} isOwner={isOwner} />
        </View>
      ))}
    </View>
  );
}

function ReelGrid({ reels, onOpen }: { reels: Producto[]; onOpen: (r: Producto) => void }) {
  return (
    <View style={styles.reelGrid}>
      {reels.map((r) => (
        <ReelTile key={r.id} reel={r} onOpen={() => onOpen(r)} />
      ))}
    </View>
  );
}

/** Loop silencioso del propio video en vez de una foto fija -- así la cuadrícula se ve
 * "viva" en vez de estática, igual que el perfil de TikTok/Instagram Reels. La miniatura
 * (`reel.imagen`, el frame que el vendedor eligió al subir el reel) se muestra debajo y
 * sigue visible hasta que el video reporta "readyToPlay" -- sin esto la cuadrícula
 * arrancaba en negro/parpadeando mientras cada video cargaba su primer frame. */
function ReelTile({ reel, onOpen }: { reel: Producto; onOpen: () => void }) {
  const [listo, setListo] = useState(false);
  const player = useVideoPlayer(reel.video_url ?? "", (p) => {
    p.loop = true;
    p.muted = true;
    if (reel.video_url) p.play();
  });

  useEffect(() => {
    if (!reel.video_url) return;
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") setListo(true);
    });
    return () => sub.remove();
  }, [player, reel.video_url]);

  return (
    <Pressable onPress={onOpen} style={styles.reelTile}>
      {reel.imagen && <Image source={{ uri: reel.imagen }} style={StyleSheet.absoluteFill} />}
      {reel.video_url && <VideoView player={player} style={[StyleSheet.absoluteFill, { opacity: listo ? 1 : 0 }]} contentFit="cover" nativeControls={false} />}
      <View style={styles.reelGradient} />
      <View style={styles.reelPlayBadge}>
        <PlayIcon size={11} weight="fill" color="#fff" />
      </View>
      <Text numberOfLines={1} style={styles.reelTitle}>
        {reel.nombre}
      </Text>
    </Pressable>
  );
}

function InfoRow({ icon, text, badge, badgeOk }: { icon: React.ReactNode; text: string; badge?: string; badgeOk?: boolean }) {
  const { tokens } = useTheme();
  if (!text) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {icon}
      <Text style={{ fontSize: 13, color: tokens.textSecondary, flexShrink: 1 }}>{text}</Text>
      {badge ? (
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: badgeOk ? tokens.okBg : tokens.dangerBg }}>
          <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: badgeOk ? tokens.okInk : tokens.dangerInk }}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingBottom: 12 },
  tabsRow: { flexDirection: "row", gap: 6, marginHorizontal: 20, marginTop: 14, padding: 4, borderRadius: 12, alignSelf: "flex-start" },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productCell: { width: "47%" },
  reelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  reelTile: { width: "47%", aspectRatio: 9 / 16, borderRadius: 14, overflow: "hidden", position: "relative", backgroundColor: "#000" },
  reelGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", backgroundColor: "rgba(0,0,0,0.55)" },
  reelPlayBadge: { position: "absolute", top: 8, left: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  reelTitle: { position: "absolute", left: 8, right: 8, bottom: 8, color: "#fff", fontSize: 11.5, fontFamily: "Inter_700Bold" },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  desc: { fontSize: 13, lineHeight: 19 },
  resena: { borderRadius: 14, borderWidth: 1, padding: 14 },
  reply: { marginTop: 8, padding: 10, borderRadius: 10 },
});
