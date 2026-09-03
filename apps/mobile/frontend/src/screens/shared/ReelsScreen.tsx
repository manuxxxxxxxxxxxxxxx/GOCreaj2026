import { useCallback, useRef, useState } from "react";
import { useEffect } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent, type ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BookmarkSimpleIcon,
  ChatCircleIcon,
  FlagIcon,
  HeartIcon,
  PlayIcon,
  PlusIcon,
  QuestionIcon,
  ShareNetworkIcon,
  ShoppingCartIcon,
  SpeakerSimpleHighIcon,
  SpeakerSimpleSlashIcon,
  StorefrontIcon,
  TrashIcon,
} from "phosphor-react-native";
import type { RootStackParamList, TabsParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { productosApi, interaccionesApi, carritoApi, vendedorApi, ApiError } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { CommentsSheet } from "../../components/domain/CommentsSheet";
import { QuestionsSheet } from "../../components/domain/QuestionsSheet";
import { ReportSheet } from "../../components/domain/ReportSheet";

export function ReelsScreen() {
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<TabsParamList, "Reels">>();
  const tiendaFiltro = route.params?.tiendaId;
  const productoInicial = route.params?.productoId;
  // Los tabs de React Navigation NO desmontan las pantallas al cambiar de sección -- sin esto,
  // el reel activo seguía reproduciéndose (con sonido) aunque el usuario ya estuviera en Chat,
  // Explorar, etc. useIsFocused() detecta cuando la pestaña deja de estar visible.
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  // La barra inferior flota con position:"absolute" (BottomTabBar.tsx), así que
  // React Navigation NO le reserva espacio al contenido -- cada pantalla debe
  // dejar su propio hueco. 78 ≈ alto real de esa barra (padding + pill + label).
  const tabBarSpace = 78 + Math.max(insets.bottom, 14);
  const [reels, setReels] = useState<Producto[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [comentariosDe, setComentariosDe] = useState<Producto | null>(null);
  const [preguntarA, setPreguntarA] = useState<Producto | null>(null);
  const [reportarA, setReportarA] = useState<Producto | null>(null);
  // Medido en vivo con onLayout en vez de Dimensions.get("window") -- el alto
  // real disponible depende del TopBar y de la barra inferior flotante, que
  // Dimensions no conoce. Con un valor fijo mal calculado, cada "página" del
  // FlatList quedaba más alta que el hueco visible real y el precio/nombre del
  // producto terminaba empujado detrás de la barra inferior.
  const [reelHeight, setReelHeight] = useState(0);
  const listRef = useRef<FlatList<Producto>>(null);

  useEffect(() => {
    if (tiendaFiltro) {
      // Vista de reels de una sola tienda (desde la pestaña "Reels" de StoreDetail) --
      // no aplica el fallback por municipio, se muestran todos los de esa tienda.
      productosApi.reels({ tienda_id: tiendaFiltro }).then((r) => setReels(r.reels)).catch(() => setReels([]));
      return;
    }
    // Sin filtro de municipio -- el feed siempre trae todos los reels activos del país,
    // no solo los de la zona del usuario (antes se limitaba al municipio y solo caía a
    // "todos" si esa zona no tenía NINGÚN reel, así que una zona con solo 1 o 2 dejaba
    // sin ver el resto del catálogo nacional).
    productosApi.reels({}).then((r) => setReels(r.reels)).catch(() => setReels([]));
  }, [tiendaFiltro]);

  // Actualiza el contador de comentarios en el momento (sin esto se queda con el valor
  // que trajo el fetch inicial hasta que se recarga toda la lista de reels).
  const bumpComentarios = useCallback((productoId: number) => {
    setReels((prev) => prev && prev.map((r) => (r.id === productoId ? { ...r, comentarios_count: (r.comentarios_count ?? 0) + 1 } : r)));
  }, []);

  // Si venimos de un thumbnail puntual (pestaña Reels de una tienda, o un mensaje de
  // chat), arrancamos el feed directo en ese reel en vez de siempre en el primero.
  useEffect(() => {
    if (!reels || !productoInicial || reelHeight === 0) return;
    const i = reels.findIndex((r) => r.id === productoInicial);
    if (i > 0) {
      setActiveIndex(i);
      listRef.current?.scrollToIndex({ index: i, animated: false });
    }
  }, [reels, productoInicial, reelHeight]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) setActiveIndex(viewableItems[0].index);
  }).current;

  const onLayout = (e: LayoutChangeEvent) => {
    if (reelHeight === 0) setReelHeight(e.nativeEvent.layout.height);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }} onLayout={onLayout}>
      {reels === null || reelHeight === 0 ? (
        <Skeleton height="100%" radius={0} />
      ) : reels.length === 0 ? (
        <EmptyState icon={<PlayIcon size={22} color={tokens.textMuted} />} title="No hay reels en tu zona todavía" />
      ) : (
        <FlatList
          ref={listRef}
          data={reels}
          keyExtractor={(r) => String(r.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={reelHeight}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
          getItemLayout={(_, i) => ({ length: reelHeight, offset: reelHeight * i, index: i })}
          renderItem={({ item, index }) => (
            <ReelCard
              producto={item}
              height={reelHeight}
              bottomSafeSpace={tabBarSpace}
              active={index === activeIndex && isFocused}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onComentarios={() => setComentariosDe(item)}
              onPreguntar={() => setPreguntarA(item)}
              onReportar={() => setReportarA(item)}
              onEliminado={() => setReels((r) => (r ?? []).filter((x) => x.id !== item.id))}
            />
          )}
        />
      )}
      {usuario?.rol === "vendedor" && (
        <Pressable onPress={() => navigation.navigate("VendedorReelForm")} accessibilityLabel="Subir reel" style={[styles.uploadBtn, { backgroundColor: tokens.cyan }]}>
          <PlusIcon size={22} weight="bold" color={tokens.cyanInk} />
        </Pressable>
      )}

      {comentariosDe && (
        <CommentsSheet producto={comentariosDe} onClose={() => setComentariosDe(null)} onComentarioNuevo={() => bumpComentarios(comentariosDe.id)} />
      )}
      {preguntarA && <QuestionsSheet producto={preguntarA} onClose={() => setPreguntarA(null)} />}
      {reportarA && <ReportSheet tipo="reel" entidadId={reportarA.id} entidadNombre={reportarA.nombre} onClose={() => setReportarA(null)} />}
    </View>
  );
}

function ReelCard({
  producto,
  height,
  bottomSafeSpace,
  active,
  muted,
  onToggleMute,
  onComentarios,
  onPreguntar,
  onReportar,
  onEliminado,
}: {
  producto: Producto;
  height: number;
  bottomSafeSpace: number;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onComentarios: () => void;
  onPreguntar: () => void;
  onReportar: () => void;
  onEliminado: () => void;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usuario } = useAuth();
  const { refrescar, celebrarAgregado } = useCart();
  const toast = useToast();
  const vistaRegistrada = useRef(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const esDueno = usuario?.id === producto.vendedor_id;

  const eliminar = async () => {
    setEliminando(true);
    try {
      await vendedorApi.eliminarProducto(producto.id);
      toast.show("Reel eliminado", "success");
      onEliminado();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar.", "error");
    } finally {
      setEliminando(false);
      setConfirmandoEliminar(false);
    }
  };

  const player = useVideoPlayer(producto.video_url ?? "", (p) => {
    p.loop = true;
    p.muted = muted;
  });

  const [estado, setEstado] = useState({ like: !!producto.yo_like, likes: producto.likes_count ?? 0, guardado: !!producto.yo_guardado, sigo: !!producto.yo_sigo });
  const [progreso, setProgreso] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const seekingRef = useRef(false);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (active) {
      player.play();
      if (!vistaRegistrada.current) {
        vistaRegistrada.current = true;
        interaccionesApi.registrarVista(producto.id).catch(() => {});
      }
    } else {
      player.pause();
      // Reinicia al inicio: así cada vez que se vuelve a este reel (scroll de ida y
      // vuelta) arranca de nuevo en vez de seguir donde quedó pausado.
      player.currentTime = 0;
      setProgreso(0);
    }
  }, [active, player, producto.id]);

  useEventListener(player, "timeUpdate", (e) => {
    if (seekingRef.current || !player.duration) return;
    setProgreso(e.currentTime / player.duration);
  });

  const seekAt = (e: GestureResponderEvent) => {
    if (!player.duration || barWidth === 0) return;
    const ratio = Math.min(1, Math.max(0, e.nativeEvent.locationX / barWidth));
    player.currentTime = ratio * player.duration;
    setProgreso(ratio);
  };

  // Optimista: cambia el corazón/bandera al toque, antes de que responda el servidor --
  // sin esto había un salto perceptible entre tocar y ver el cambio. Si la llamada falla,
  // se revierte al estado anterior.
  const toggleLike = async () => {
    if (!usuario || esDueno) return;
    const previo = estado;
    setEstado((s) => ({ ...s, like: !s.like, likes: s.likes + (s.like ? -1 : 1) }));
    try {
      const r = await interaccionesApi.toggleLike(producto.id);
      setEstado((s) => ({ ...s, like: r.accion === "like", likes: r.contadores.likes }));
    } catch {
      setEstado(previo);
    }
  };
  const toggleGuardar = async () => {
    if (!usuario) return;
    const previo = estado;
    setEstado((s) => ({ ...s, guardado: !s.guardado }));
    try {
      const r = await interaccionesApi.toggleGuardar(producto.id);
      setEstado((s) => ({ ...s, guardado: r.accion === "guardar" }));
    } catch {
      setEstado(previo);
    }
  };
  const toggleSeguir = async () => {
    if (!usuario || !producto.tienda_id || esDueno) return;
    const r = await interaccionesApi.seguirTienda(producto.tienda_id);
    setEstado((s) => ({ ...s, sigo: r.accion === "follow" }));
  };
  const agregarCarrito = async () => {
    if (!usuario) return;
    if (usuario.rol !== "comprador") return toast.show("Cambia a tu cuenta de comprador para comprar.", "info");
    try {
      await carritoApi.agregar(producto.id, 1);
      await refrescar();
      celebrarAgregado();
      toast.show(`${producto.nombre} agregado`, "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo agregar.", "error");
    }
  };

  return (
    <View style={{ height, width: "100%" }}>
      {producto.video_url ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      ) : producto.imagen ? (
        <Image source={{ uri: producto.imagen }} style={StyleSheet.absoluteFill} />
      ) : null}

      <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={styles.gradientTop} pointerEvents="none" />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.75)"]} style={styles.gradientBottom} pointerEvents="none" />

      {!!producto.video_url && (
        <View
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            seekingRef.current = true;
            seekAt(e);
          }}
          onResponderMove={seekAt}
          onResponderRelease={() => {
            seekingRef.current = false;
          }}
          style={styles.seekHit}
        >
          <View style={styles.seekTrack}>
            <View style={[styles.seekFill, { width: `${progreso * 100}%` }]} />
          </View>
        </View>
      )}

      <Pressable onPress={onToggleMute} accessibilityLabel="Silenciar" style={styles.muteBtn}>
        {muted ? <SpeakerSimpleSlashIcon size={16} color="#fff" /> : <SpeakerSimpleHighIcon size={16} color="#fff" />}
      </Pressable>

      <View style={[styles.bottomInfo, { bottom: bottomSafeSpace }]}>
        <Pressable onPress={() => navigation.navigate("StoreDetail", { id: producto.tienda_id! })} style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <StorefrontIcon size={17} weight="fill" color="#fff" />
          <Text style={{ color: "#fff", fontFamily: "SpaceGrotesk_700Bold", fontSize: 17, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 }}>{producto.tienda_nombre}</Text>
        </Pressable>
        <Text numberOfLines={2} style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: producto.hashtags ? 4 : 10, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 }}>
          {producto.nombre}
        </Text>
        {!!producto.hashtags && (
          <Text numberOfLines={1} style={{ color: "#7FE6FF", fontFamily: "Inter_600SemiBold", fontSize: 12.5, marginBottom: 10, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 }}>
            {/* replace() por si son datos viejos guardados sin "#" -- evita mostrar "##doble". */}
            {producto.hashtags.split(/\s+/).filter(Boolean).map((t) => `#${t.replace(/^#+/, "")}`).join(" ")}
          </Text>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={{ color: "#fff", fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", fontSize: 20, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 }}>
            {money(producto.precio_oferta || producto.precio)}
          </Text>
          <Pressable onPress={agregarCarrito} style={styles.addBtn}>
            <ShoppingCartIcon size={14} weight="bold" color="#04141C" />
            <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: "#04141C" }}>Agregar</Text>
          </Pressable>
          <Pressable onPress={onPreguntar} style={styles.askBtn}>
            <QuestionIcon size={13} weight="bold" color="#fff" />
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: "#fff" }}>Preguntar</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.actions, { bottom: bottomSafeSpace }]}>
        {/* Un vendedor no se da like ni se sigue a sí mismo -- mismo criterio que StoreHero web. */}
        {!esDueno && <ReelAction icon={<HeartIcon size={24} weight="fill" color={estado.like ? "#FF6B6B" : "#fff"} />} label={estado.likes} onPress={toggleLike} />}
        <ReelAction icon={<ChatCircleIcon size={24} weight="fill" color="#fff" />} label={producto.comentarios_count} onPress={onComentarios} />
        <ReelAction icon={<ShareNetworkIcon size={24} weight="fill" color="#fff" />} label={producto.compartidos_count} onPress={() => interaccionesApi.compartir(producto.id).catch(() => {})} />
        <ReelAction icon={<BookmarkSimpleIcon size={24} weight="fill" color={estado.guardado ? "#FFD60A" : "#fff"} />} onPress={toggleGuardar} />
        {esDueno && <ReelAction icon={<TrashIcon size={22} weight="fill" color="#FF6B6B" />} onPress={() => setConfirmandoEliminar(true)} />}
        {!esDueno && <ReelAction icon={<FlagIcon size={20} weight="fill" color="#fff" />} onPress={onReportar} />}
        {!esDueno && (
          <Pressable onPress={toggleSeguir} style={[styles.followBtn, { backgroundColor: estado.sigo ? "#38D6FF" : "#fff" }]}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: estado.sigo ? "#04141C" : "#000" }}>{estado.sigo ? "✓" : "+"}</Text>
          </Pressable>
        )}
      </View>

      <ConfirmDialog
        visible={confirmandoEliminar}
        title="¿Eliminar este reel?"
        description="Se quitará de Reels y de tu catálogo. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={eliminando}
        onConfirm={eliminar}
        onCancel={() => setConfirmandoEliminar(false)}
      />
    </View>
  );
}

function ReelAction({ icon, label, onPress }: { icon: React.ReactNode; label?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.reelAction}>
      {icon}
      {label !== undefined && <Text style={[styles.reelActionLabel, { color: "#fff" }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  uploadBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  gradientTop: { position: "absolute", top: 0, left: 0, right: 0, height: 130 },
  gradientBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 260 },
  muteBtn: { position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  seekHit: { position: "absolute", left: 0, right: 0, bottom: 0, height: 20, justifyContent: "flex-end" },
  seekTrack: { height: 3, width: "100%", backgroundColor: "rgba(255,255,255,0.25)" },
  seekFill: { height: "100%", backgroundColor: "#38D6FF" },
  bottomInfo: { position: "absolute", left: 14, right: 76 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#38D6FF", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  askBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  actions: { position: "absolute", right: 12, alignItems: "center", gap: 18 },
  followBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  // Los íconos de acción son blancos sólidos sobre el video/foto del reel -- sin esta sombra
  // se pierden por completo cuando el fondo detrás también es claro/blanco.
  reelAction: { alignItems: "center", gap: 3, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 4 },
  reelActionLabel: { fontSize: 11, fontFamily: "IBMPlexMono_500Medium", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
});
