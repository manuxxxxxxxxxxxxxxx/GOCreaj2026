import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  ArchiveIcon,
  ArrowBendUpLeftIcon,
  CaretLeftIcon,
  CheckIcon,
  ChecksIcon,
  FileArrowUpIcon,
  FilePdfIcon,
  ImageIcon,
  MapPinIcon,
  PaperclipIcon,
  PaperPlaneTiltIcon,
  PauseIcon,
  PlayIcon,
  SmileyIcon,
  StarIcon,
  StarHalfIcon,
  XIcon,
} from "phosphor-react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { WebMapView } from "../../components/ui/WebMapView";
import { AttachmentPreviewSheet, type PendienteAdjunto } from "../../components/domain/chat/AttachmentPreviewSheet";
import { LocationPreviewSheet } from "../../components/domain/chat/LocationPreviewSheet";
import { MapViewerSheet } from "../../components/domain/chat/MapViewerSheet";
import { EmojiPickerSheet } from "../../components/domain/chat/EmojiPickerSheet";
import { MessageActionsSheet } from "../../components/domain/chat/MessageActionsSheet";
import { VoiceRecorderButton } from "../../components/domain/chat/VoiceRecorderButton";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { chatApi, ApiError } from "../../lib/api";
import type { ChatMensaje, Usuario } from "../../lib/types";
import { formatTime, money } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";

type Props = NativeStackScreenProps<RootStackParamList, "ChatThread">;

interface ReplySnapshot {
  nombre: string;
  mensaje: string;
  tipo: ChatMensaje["tipo"];
}

/** Snapshot que arma chat_multi.php?action=desde_producto (botón "Preguntar" en Reels). */
interface ProductoSnapshot {
  producto_id: number;
  nombre: string;
  imagen: string | null;
  precio: number;
  tienda: string;
  tienda_id: number;
  es_reel: boolean;
  video_url: string | null;
}

const PREVIEWS_RESPUESTA: Partial<Record<ChatMensaje["tipo"], string>> = {
  imagen: "Foto",
  video: "Video",
  audio: "Nota de voz",
  ubicacion: "Ubicación compartida",
};

export function ChatThreadScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const toast = useToast();
  const otroId = route.params.otroId;
  const [mensajes, setMensajes] = useState<ChatMensaje[] | null>(null);
  const [otro, setOtro] = useState<Usuario | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pendiente, setPendiente] = useState<PendienteAdjunto | null>(null);
  const [pidiendoUbicacion, setPidiendoUbicacion] = useState(false);
  const [menuAdjuntar, setMenuAdjuntar] = useState(false);
  const [verMapaDe, setVerMapaDe] = useState<{ lat: number; lng: number } | null>(null);
  const [meta, setMeta] = useState<{ archivado: number; favorito: number } | null>(null);
  const [respondiendoA, setRespondiendoA] = useState<ChatMensaje | null>(null);
  const [accionesDe, setAccionesDe] = useState<ChatMensaje | null>(null);
  const [emojiComposerAbierto, setEmojiComposerAbierto] = useState(false);
  const listRef = useRef<FlatList>(null);

  const cargar = useCallback(() => {
    chatApi.mensajes(otroId).then((r) => {
      setMensajes(r.mensajes);
      setOtro(r.otro);
    }).catch(() => setMensajes([]));
  }, [otroId]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 4000);
    return () => clearInterval(t);
  }, [cargar]);

  /** Construye la cita compacta que va sobre el mensaje al que se responde. */
  const snapshotDe = (m: ChatMensaje): ReplySnapshot => ({
    nombre: m.emisor_id === usuario?.id ? "Tú" : otro?.nombre ?? "",
    mensaje: PREVIEWS_RESPUESTA[m.tipo] ?? (m.tipo === "pdf" ? m.adjunto_nombre ?? "Documento" : m.mensaje),
    tipo: m.tipo,
  });

  const datosRespuesta = () =>
    respondiendoA ? { reply_to_id: respondiendoA.id, reply_snapshot: snapshotDe(respondiendoA) as unknown as Record<string, unknown> } : {};

  const enviar = async (extra?: Partial<Parameters<typeof chatApi.enviar>[0]>) => {
    if (!texto.trim() && !extra) return;
    setEnviando(true);
    try {
      await chatApi.enviar({ receptor_id: otroId, mensaje: texto.trim() || undefined, ...datosRespuesta(), ...extra });
      setTexto("");
      setRespondiendoA(null);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const elegirFoto = async () => {
    setMenuAdjuntar(false);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setPendiente({ uri: asset.uri, kind: asset.type === "video" ? "video" : "imagen" });
  };

  const elegirDocumento = async () => {
    setMenuAdjuntar(false);
    const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setPendiente({ uri: asset.uri, kind: "pdf", nombre: asset.name, tamano: asset.size ?? undefined });
  };

  const confirmarAdjunto = async (caption: string) => {
    if (!pendiente) return;
    setEnviando(true);
    try {
      let mime = pendiente.kind === "imagen" ? "image/jpeg" : pendiente.kind === "video" ? "video/mp4" : "application/pdf";
      if (pendiente.kind === "pdf" && pendiente.nombre?.toLowerCase().endsWith(".pdf")) mime = "application/pdf";
      const base64 = await FileSystem.readAsStringAsync(pendiente.uri, { encoding: FileSystem.EncodingType.Base64 });
      await chatApi.enviar({
        receptor_id: otroId,
        tipo: pendiente.kind,
        mensaje: caption || undefined,
        adjunto: `data:${mime};base64,${base64}`,
        nombre: pendiente.kind === "pdf" ? pendiente.nombre : undefined,
        tamano: pendiente.tamano,
        ...datosRespuesta(),
      });
      setPendiente(null);
      setRespondiendoA(null);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el archivo.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const confirmarUbicacion = async (lat: number, lng: number) => {
    setEnviando(true);
    try {
      await chatApi.enviar({ receptor_id: otroId, tipo: "ubicacion", lat, lng, ...datosRespuesta() });
      setPidiendoUbicacion(false);
      setRespondiendoA(null);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la ubicación.", "error");
    } finally {
      setEnviando(false);
    }
  };

  const enviarAudio = async (dataUri: string, duracionSeg: number) => {
    try {
      await chatApi.enviar({ receptor_id: otroId, tipo: "audio", adjunto: dataUri, duracion: duracionSeg, ...datosRespuesta() });
      setRespondiendoA(null);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar la nota de voz.", "error");
    }
  };

  const insertarEmoji = (emoji: string) => setTexto((t) => t + emoji);

  const reaccionar = async (chatId: number, emoji: string) => {
    try {
      await chatApi.reaccionar(chatId, emoji);
      cargar();
    } catch {
      toast.show("No se pudo reaccionar al mensaje.", "error");
    }
  };

  if (!mensajes || !otro) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20 }}>
        <Skeleton height={60} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: tokens.border }]}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Avatar nombre={otro.nombre} foto={otro.foto_perfil} size={34} online={!!otro.en_linea} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>{otro.nombre}</Text>
          <Text style={{ fontSize: 11, color: tokens.textMuted }}>{otro.en_linea ? "En línea" : "Desconectado"}</Text>
        </View>
        <Pressable
          onPress={async () => {
            const r = await chatApi.toggleFavorito(otroId);
            setMeta((m) => ({ archivado: m?.archivado ?? 0, favorito: r.favorito }));
          }}
          accessibilityLabel="Favorito"
        >
          {meta?.favorito ? (
            <StarIcon size={19} weight="fill" color={tokens.warn} />
          ) : (
            <StarHalfIcon size={19} color={tokens.textMuted} />
          )}
        </Pressable>
        <Pressable
          onPress={async () => {
            const r = await chatApi.toggleArchivado(otroId);
            setMeta((m) => ({ favorito: m?.favorito ?? 0, archivado: r.archivado }));
            toast.show(r.archivado ? "Conversación archivada." : "Conversación desarchivada.", "info");
          }}
          accessibilityLabel="Archivar"
        >
          <ArchiveIcon size={19} color={tokens.textMuted} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={mensajes}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mio = item.emisor_id === usuario?.id;
          const reply = item.reply_snapshot as unknown as ReplySnapshot | null | undefined;
          return (
            <View style={{ alignItems: mio ? "flex-end" : "flex-start" }}>
              <Pressable
                onLongPress={() => setAccionesDe(item)}
                style={[styles.bubble, { backgroundColor: mio ? tokens.cyan : tokens.surface2, borderTopRightRadius: mio ? 4 : 14, borderTopLeftRadius: mio ? 14 : 4 }]}
              >
                {reply && (
                  <View
                    style={[
                      styles.replyQuote,
                      { borderLeftColor: mio ? "rgba(255,255,255,0.65)" : tokens.cyan, backgroundColor: mio ? "rgba(255,255,255,0.15)" : tokens.surface1 },
                    ]}
                  >
                    <Text numberOfLines={1} style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: mio ? tokens.cyanInk : tokens.textPrimary, opacity: 0.9 }}>
                      {reply.nombre}
                    </Text>
                    <Text numberOfLines={1} style={{ fontSize: 11.5, color: mio ? tokens.cyanInk : tokens.textMuted, opacity: 0.85 }}>
                      {reply.mensaje}
                    </Text>
                  </View>
                )}

                {item.tipo === "producto" && item.reply_snapshot && (() => {
                  const p = item.reply_snapshot as unknown as ProductoSnapshot;
                  return (
                    <Pressable
                      onPress={() =>
                        p.es_reel
                          ? navigation.navigate("Tabs", { screen: "Reels", params: { tiendaId: p.tienda_id, productoId: p.producto_id } })
                          : navigation.navigate("ProductDetail", { id: p.producto_id })
                      }
                      style={styles.productoRow}
                    >
                      <View style={styles.productoThumb}>
                        {p.imagen && <Image source={{ uri: p.imagen }} style={StyleSheet.absoluteFill} />}
                        {p.es_reel && (
                          <View style={styles.productoPlayOverlay}>
                            <PlayIcon size={16} weight="fill" color="#fff" />
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        {p.es_reel && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 2 }}>
                            <PlayIcon size={9} weight="fill" color={mio ? tokens.cyanInk : tokens.cyan} />
                            <Text style={{ fontSize: 9.5, fontFamily: "Inter_700Bold", color: mio ? tokens.cyanInk : tokens.cyan }}>REEL</Text>
                          </View>
                        )}
                        <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: mio ? tokens.cyanInk : tokens.textPrimary }}>{p.nombre}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "IBMPlexMono_500Medium", color: mio ? tokens.cyanInk : tokens.textMuted, opacity: 0.85 }}>{money(p.precio)}</Text>
                      </View>
                    </Pressable>
                  );
                })()}
                {item.tipo === "imagen" && item.adjunto && <Image source={{ uri: item.adjunto }} style={{ width: 200, height: 200, borderRadius: 10, marginBottom: item.mensaje ? 6 : 0 }} />}
                {item.tipo === "video" && item.adjunto && <MensajeVideo uri={item.adjunto} marginBottom={item.mensaje ? 6 : 0} />}
                {item.tipo === "audio" && item.adjunto && <MensajeAudio uri={item.adjunto} duracion={item.adjunto_duracion ?? 0} mio={mio} />}
                {item.tipo === "pdf" && item.adjunto && (
                  <Pressable onPress={() => Linking.openURL(item.adjunto!)} style={styles.pdfRow}>
                    <View style={[styles.pdfIcon, { backgroundColor: "rgba(0,0,0,0.12)" }]}>
                      <FilePdfIcon size={18} weight="fill" color={mio ? tokens.cyanInk : tokens.textPrimary} />
                    </View>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: mio ? tokens.cyanInk : tokens.textPrimary }}>
                      {item.adjunto_nombre ?? "Documento.pdf"}
                    </Text>
                  </Pressable>
                )}
                {item.tipo === "ubicacion" && item.lat && item.lng && (
                  <Pressable onPress={() => setVerMapaDe({ lat: item.lat!, lng: item.lng! })} style={{ width: 200, height: 140, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
                    <WebMapView
                      center={[item.lng, item.lat]}
                      zoom={15}
                      interactive={false}
                      markers={[{ id: "loc", coordinate: [item.lng, item.lat], color: tokens.danger }]}
                    />
                    <View style={{ position: "absolute", left: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <MapPinIcon size={11} color="#fff" />
                      <Text style={{ fontSize: 10.5, color: "#fff", fontFamily: "Inter_600SemiBold" }}>Ver ubicación</Text>
                    </View>
                  </Pressable>
                )}
                {item.tipo !== "audio" && item.tipo !== "producto" && <Text style={{ fontSize: 13.5, color: mio ? tokens.cyanInk : tokens.textPrimary }}>{item.mensaje}</Text>}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 3 }}>
                  <Text style={{ fontSize: 9.5, color: mio ? tokens.cyanInk : tokens.textMuted, opacity: 0.75 }}>{formatTime(item.created_at)}</Text>
                  {mio &&
                    (item.leido ? (
                      <ChecksIcon size={13} weight="bold" color={tokens.cyanInk} />
                    ) : (
                      <CheckIcon size={13} weight="bold" color={tokens.cyanInk} style={{ opacity: 0.7 }} />
                    ))}
                </View>
              </Pressable>

              {!!item.reacciones?.length && (
                <View style={{ flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {item.reacciones.map((r: NonNullable<ChatMensaje["reacciones"]>[number]) => (
                    <Pressable
                      key={r.emoji}
                      onPress={() => reaccionar(item.id, r.emoji)}
                      style={[
                        styles.reactionPill,
                        { borderColor: r.mio ? tokens.cyan : tokens.border, backgroundColor: r.mio ? tokens.cyanBg : tokens.surface2 },
                      ]}
                    >
                      <Text style={{ fontSize: 12 }}>{r.emoji}</Text>
                      {r.count > 1 && <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: tokens.textMuted }}>{r.count}</Text>}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />

      {respondiendoA && (
        <View style={[styles.replyBar, { borderTopColor: tokens.border, backgroundColor: tokens.surface2 }]}>
          <ArrowBendUpLeftIcon size={15} color={tokens.cyan} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Respondiendo a {snapshotDe(respondiendoA).nombre}</Text>
            <Text numberOfLines={1} style={{ fontSize: 11.5, color: tokens.textMuted }}>{snapshotDe(respondiendoA).mensaje}</Text>
          </View>
          <Pressable onPress={() => setRespondiendoA(null)} accessibilityLabel="Cancelar respuesta">
            <XIcon size={16} color={tokens.textMuted} />
          </Pressable>
        </View>
      )}

      <View style={[styles.inputBar, { borderTopColor: tokens.border, paddingBottom: insets.bottom + 10 }]}>
        <View>
          <Pressable onPress={() => setMenuAdjuntar((v) => !v)} accessibilityLabel="Adjuntar">
            <PaperclipIcon size={22} color={tokens.textMuted} />
          </Pressable>
          {menuAdjuntar && (
            <>
              <Pressable onPress={() => setMenuAdjuntar(false)} style={styles.menuScrim} />
              <View style={[styles.attachMenu, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <AttachMenuItem icon={<ImageIcon size={16} color={tokens.cyan} />} label="Foto o video" onPress={elegirFoto} />
                <AttachMenuItem icon={<FileArrowUpIcon size={16} color={tokens.violet} />} label="Documento" onPress={elegirDocumento} />
                <AttachMenuItem
                  icon={<MapPinIcon size={16} color={tokens.coral} />}
                  label="Ubicación"
                  onPress={() => {
                    setMenuAdjuntar(false);
                    setPidiendoUbicacion(true);
                  }}
                />
              </View>
            </>
          )}
        </View>

        <Pressable onPress={() => setEmojiComposerAbierto(true)} accessibilityLabel="Emoji">
          <SmileyIcon size={22} color={tokens.textMuted} />
        </Pressable>

        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={tokens.textMuted}
          style={[styles.input, { borderColor: tokens.border, color: tokens.textPrimary }]}
        />
        {texto.trim() ? (
          <Pressable onPress={() => enviar()} disabled={enviando} style={[styles.sendBtn, { backgroundColor: tokens.cyan, opacity: enviando ? 0.5 : 1 }]}>
            <PaperPlaneTiltIcon size={16} weight="fill" color={tokens.cyanInk} />
          </Pressable>
        ) : (
          <VoiceRecorderButton onSend={enviarAudio} disabled={enviando} />
        )}
      </View>

      <AttachmentPreviewSheet pendiente={pendiente} enviando={enviando} onCancel={() => setPendiente(null)} onConfirm={confirmarAdjunto} />
      <LocationPreviewSheet visible={pidiendoUbicacion} enviando={enviando} onCancel={() => setPidiendoUbicacion(false)} onConfirm={confirmarUbicacion} />
      <MapViewerSheet visible={!!verMapaDe} lat={verMapaDe?.lat ?? 0} lng={verMapaDe?.lng ?? 0} onClose={() => setVerMapaDe(null)} />
      <EmojiPickerSheet visible={emojiComposerAbierto} onClose={() => setEmojiComposerAbierto(false)} onSelect={insertarEmoji} />
      <MessageActionsSheet
        visible={!!accionesDe}
        onClose={() => setAccionesDe(null)}
        onReply={() => accionesDe && setRespondiendoA(accionesDe)}
        onReact={(emoji) => accionesDe && reaccionar(accionesDe.id, emoji)}
      />
    </KeyboardAvoidingView>
  );
}

function MensajeVideo({ uri, marginBottom }: { uri: string; marginBottom: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  return <VideoView player={player} nativeControls style={{ width: 200, height: 200, borderRadius: 10, marginBottom }} />;
}

function MensajeAudio({ uri, duracion, mio }: { uri: string; duracion: number; mio: boolean }) {
  const { tokens } = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const progreso = status.duration > 0 ? status.currentTime / status.duration : 0;

  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0);
  }, [status.didJustFinish, player]);

  return (
    <View style={styles.audioRow}>
      <Pressable
        onPress={() => (status.playing ? player.pause() : player.play())}
        accessibilityLabel={status.playing ? "Pausar" : "Reproducir"}
        style={[styles.audioBtn, { backgroundColor: mio ? "rgba(255,255,255,0.25)" : tokens.cyanBg }]}
      >
        {status.playing ? <PauseIcon size={13} weight="fill" color={mio ? tokens.cyanInk : tokens.cyan} /> : <PlayIcon size={13} weight="fill" color={mio ? tokens.cyanInk : tokens.cyan} />}
      </Pressable>
      <View style={[styles.audioTrack, { backgroundColor: mio ? "rgba(255,255,255,0.35)" : tokens.border }]}>
        <View style={{ width: `${progreso * 100}%`, height: "100%", backgroundColor: mio ? "#fff" : tokens.cyan }} />
      </View>
      <Text style={{ fontSize: 10.5, opacity: 0.85, color: mio ? tokens.cyanInk : tokens.textMuted }}>
        {Math.floor(duracion / 60)}:{String(duracion % 60).padStart(2, "0")}
      </Text>
    </View>
  );
}

function AttachMenuItem({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.attachMenuItem}>
      {icon}
      <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: tokens.textPrimary }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "78%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  productoRow: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 200, paddingVertical: 2 },
  productoThumb: { width: 52, height: 52, borderRadius: 10, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.15)" },
  productoPlayOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" },
  replyQuote: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6, maxWidth: 220 },
  replyBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
  reactionPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, height: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, fontSize: 13.5 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  pdfRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, marginBottom: 6, maxWidth: 200 },
  pdfIcon: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2, minWidth: 190 },
  audioBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  audioTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  menuScrim: { position: "absolute", top: -1000, bottom: -1000, left: -1000, right: -1000 },
  attachMenu: {
    position: "absolute",
    bottom: 34,
    left: 0,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    minWidth: 190,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  attachMenuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
});
