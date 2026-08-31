import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useVideoPlayer, VideoView } from "expo-video";
import { HashIcon, VideoCameraIcon, PencilSimpleIcon, TrashIcon, XIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { vendedorApi, ApiError } from "../../lib/api";
import { CategoryPicker } from "../../components/domain/CategoryPicker";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

const MAX_VIDEO_MB = 80;
const MAX_VIDEO_SECONDS = 90;

type Props = NativeStackScreenProps<RootStackParamList, "VendedorReelForm">;

function SectionLabel({ children }: { children: string }) {
  const { tokens } = useTheme();
  return <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>{children}</Text>;
}

export function VendedorReelFormScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [tiendaId, setTiendaId] = useState<number | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("0");
  const [categoria, setCategoria] = useState("comida");
  const [hashtags, setHashtags] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    vendedorApi.misTiendas().then((r) => setTiendaId(r.tiendas[0]?.id ?? null));
  }, []);

  const player = useVideoPlayer(videoUri ?? "", (p) => {
    p.loop = true;
    p.muted = true;
    if (videoUri) p.play();
  });

  const elegirVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];

    if (asset.duration && asset.duration / 1000 > MAX_VIDEO_SECONDS) {
      return toast.show(`El video dura más de ${MAX_VIDEO_SECONDS}s — elige uno más corto para que suba rápido.`, "warning");
    }
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (info.exists && info.size && info.size / (1024 * 1024) > MAX_VIDEO_MB) {
      return toast.show(`El video pesa más de ${MAX_VIDEO_MB}MB — elige uno más liviano o recórtalo.`, "warning");
    }
    setVideoUri(asset.uri);
  };

  const publicar = async () => {
    if (!videoUri) return toast.show("Elige un video para el reel.", "warning");
    if (!nombre.trim() || !precio) return toast.show("Nombre y precio son obligatorios.", "warning");
    if (!tiendaId) return toast.show("Primero crea tu tienda.", "warning");
    setGuardando(true);
    setProgreso(0);
    try {
      // El video se manda como archivo (multipart), no como base64 en el JSON: evita el ~33%
      // de overhead y permite mostrar el progreso real de subida en vez de un spinner ciego.
      await vendedorApi.crearProductoConVideo(
        {
          tienda_id: tiendaId,
          nombre,
          descripcion,
          precio: Number(precio),
          stock: Number(stock),
          categoria,
          es_reel: true,
          hashtags: hashtags.trim() || undefined,
        },
        videoUri,
        setProgreso,
      );
      toast.show("Reel publicado", "success");
      navigation.goBack();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo publicar el reel.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: tokens.bg }}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <Text style={{ flex: 1, fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Nuevo Reel</Text>
        <Pressable onPress={navigation.goBack} style={[styles.closeBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <XIcon size={16} color={tokens.textPrimary} />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable onPress={elegirVideo} style={[styles.videoPicker, { backgroundColor: "#000", borderColor: tokens.borderStrong }]}>
            {videoUri ? (
              <>
                <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
                <View style={styles.videoOverlay}>
                  <View style={[styles.videoBadge, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                    <PencilSimpleIcon size={11} color="#fff" />
                    <Text style={{ fontSize: 10.5, color: "#fff", fontFamily: "Inter_600SemiBold" }}>Cambiar</Text>
                  </View>
                </View>
                <Pressable onPress={() => setVideoUri(null)} accessibilityLabel="Quitar video" style={styles.removeBtn} hitSlop={8}>
                  <TrashIcon size={13} color="#fff" />
                </Pressable>
              </>
            ) : (
              <View style={{ alignItems: "center", gap: 8 }}>
                <VideoCameraIcon size={28} color={tokens.textMuted} />
                <Text style={{ fontSize: 12.5, color: tokens.textMuted, fontFamily: "Inter_500Medium" }}>Elegir video</Text>
                <Text style={{ fontSize: 10.5, color: tokens.textMuted, opacity: 0.7 }}>Vertical, se ve mejor</Text>
              </View>
            )}
          </Pressable>

          <View style={{ flex: 1, gap: 14 }}>
            <SectionLabel>Producto</SectionLabel>
            <Input label="Nombre" value={nombre} onChangeText={setNombre} />
            <Input label="Precio" value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border, marginTop: 20 }]}>
          <SectionLabel>Detalles</SectionLabel>
          <View style={{ gap: 14 }}>
            <Input label="Descripción" value={descripcion} onChangeText={setDescripcion} multiline />
            <Input label="Stock" value={stock} onChangeText={setStock} keyboardType="number-pad" />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border, marginTop: 14 }]}>
          <SectionLabel>Categoría</SectionLabel>
          <CategoryPicker value={categoria} onChange={setCategoria} />
        </View>

        <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border, marginTop: 14 }]}>
          <SectionLabel>Hashtags</SectionLabel>
          <Input
            label="Etiquetas"
            value={hashtags}
            onChangeText={setHashtags}
            placeholder="comida salvador oferta"
            icon={<HashIcon size={16} color={tokens.textMuted} />}
            autoCapitalize="none"
            hint="Sepáralos con espacios — se muestran como #comida #salvador #oferta"
          />
        </View>

        {guardando && (
          <View style={{ marginTop: 22, gap: 6 }}>
            <View style={[styles.progressTrack, { backgroundColor: tokens.surface2 }]}>
              <View style={[styles.progressFill, { backgroundColor: tokens.cyan, width: `${Math.round(progreso * 100)}%` }]} />
            </View>
            <Text style={{ fontSize: 11.5, color: tokens.textMuted, textAlign: "center" }}>Subiendo video... {Math.round(progreso * 100)}%</Text>
          </View>
        )}
        <Button size="lg" onPress={publicar} loading={guardando} style={{ marginTop: guardando ? 10 : 22 }}>
          Publicar Reel
        </Button>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  videoPicker: { width: 130, height: 220, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  videoOverlay: { position: "absolute", left: 0, right: 0, bottom: 8, alignItems: "center" },
  videoBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  removeBtn: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
});
