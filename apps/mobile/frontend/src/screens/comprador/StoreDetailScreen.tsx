import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, ClockIcon, CreditCardIcon, MapPinIcon, PhoneIcon, PlayIcon, StarIcon, StorefrontIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { productosApi, interaccionesApi } from "../../lib/api";
import type { Producto, Tienda } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { Skeleton } from "../../components/ui/Skeleton";
import { ProductCard } from "../../components/domain/ProductCard";
import { WebMapView } from "../../components/ui/WebMapView";
import { StoreHero } from "../../components/domain/store/StoreHero";
import { StoreEmptyState } from "../../components/domain/store/StoreEmptyState";

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

const CROSS_SECTION_LIMIT = 8;

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
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [reels, setReels] = useState<Producto[] | null>(null);
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [tab, setTab] = useState<Tab>("productos");
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

  const abierto = calcAbierto(tienda);

  const mapCenter = useMemo<[number, number] | null>(() => {
    if (!tienda || tienda.lat === null || tienda.lng === null) return null;
    return [tienda.lng, tienda.lat];
  }, [tienda]);

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
        <View style={{ position: "relative" }}>
          <StoreHero
            tienda={tienda}
            isOwner={isOwner}
            notifOn={!!tienda.yo_sigo}
            onEditBanner={() => navigation.navigate("VendedorTienda")}
            onToggleSeguir={toggleSeguir}
            onToggleNotif={() => {}}
            onContactar={contactar}
          />
          <Pressable onPress={navigation.goBack} style={[styles.backBtn, { top: insets.top + 8 }]}>
            <CaretLeftIcon size={16} color="#fff" />
          </Pressable>
        </View>

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
            <>
              <ProductWrapGrid
                productos={productos}
                empty={
                  <StoreEmptyState
                    icon={<StorefrontIcon size={20} color={tokens.cyan} />}
                    title={isOwner ? "Todavía no has publicado productos" : "Sin productos todavía"}
                    description={isOwner ? "Agrega tu primer producto para que los compradores puedan encontrarte." : "Vuelve pronto, esta tienda está preparando su catálogo."}
                    actionLabel={isOwner ? "Agregar producto" : undefined}
                    onAction={isOwner ? () => navigation.navigate("VendedorProductos") : undefined}
                  />
                }
              />
              {!!reels?.length && (
                <CrossSection title="Reels de la tienda" onViewAll={reels.length > CROSS_SECTION_LIMIT ? () => setTab("reels") : undefined}>
                  <ReelGrid reels={reels.slice(0, CROSS_SECTION_LIMIT)} onOpen={openReel} />
                </CrossSection>
              )}
            </>
          )}

          {tab === "reels" && (
            <>
              {reels === null ? (
                <Skeleton height={220} radius={16} />
              ) : reels.length === 0 ? (
                <StoreEmptyState
                  icon={<PlayIcon size={20} color={tokens.violet} />}
                  title={isOwner ? "Sube tu primer reel" : "Sin reels todavía"}
                  description={isOwner ? "Muestra tus productos en video corto, estilo TikTok." : undefined}
                  actionLabel={isOwner ? "Subir reel" : undefined}
                  onAction={isOwner ? () => navigation.navigate("VendedorTienda") : undefined}
                  tone="violet"
                />
              ) : (
                <ReelGrid reels={reels} onOpen={openReel} />
              )}
              {!!productos?.length && (
                <CrossSection title="Catálogo de productos" onViewAll={productos.length > CROSS_SECTION_LIMIT ? () => setTab("productos") : undefined}>
                  <ProductWrapGrid productos={productos.slice(0, CROSS_SECTION_LIMIT)} empty={null} />
                </CrossSection>
              )}
            </>
          )}

          {tab === "sobre-nosotros" && (
            <View style={{ gap: 16 }}>
              {mapCenter ? (
                <View style={{ height: 200, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: tokens.border }}>
                  <WebMapView center={mapCenter} zoom={15} interactive markers={[{ id: tienda.id, coordinate: mapCenter, category: tienda.categoria?.split(",")[0] ?? undefined }]} />
                </View>
              ) : (
                <StoreEmptyState icon={<MapPinIcon size={20} color={tokens.cyan} />} title="Ubicación no disponible" description="Esta tienda todavía no ha registrado su dirección exacta." compact />
              )}

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
    </View>
  );
}

function CrossSection({ title, onViewAll, children }: { title: string; onViewAll?: () => void; children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{title}</Text>
        {onViewAll && (
          <Pressable onPress={onViewAll}>
            <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Ver todos</Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function ProductWrapGrid({ productos, empty }: { productos: Producto[] | null; empty: React.ReactNode }) {
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
          <ProductCard producto={p} height={130} showWishlist />
        </View>
      ))}
    </View>
  );
}

function ReelGrid({ reels, onOpen }: { reels: Producto[]; onOpen: (r: Producto) => void }) {
  return (
    <View style={styles.reelGrid}>
      {reels.map((r) => (
        <Pressable key={r.id} onPress={() => onOpen(r)} style={styles.reelTile}>
          {r.imagen && <Image source={{ uri: r.imagen }} style={StyleSheet.absoluteFill} />}
          <View style={styles.reelGradient} />
          <View style={styles.reelPlayBadge}>
            <PlayIcon size={11} weight="fill" color="#fff" />
          </View>
          <Text numberOfLines={1} style={styles.reelTitle}>
            {r.nombre}
          </Text>
        </Pressable>
      ))}
    </View>
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
  backBtn: { position: "absolute", left: 20, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)" },
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
