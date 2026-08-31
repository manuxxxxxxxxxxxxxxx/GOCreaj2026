import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import * as FileSystem from "expo-file-system/legacy";
import { MicrophoneIcon, PauseIcon, PaperPlaneTiltIcon, PlayIcon, TrashIcon } from "phosphor-react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useTheme } from "../../../theme/ThemeContext";
import { glowShadow } from "../../../theme/tokens";
import { useToast } from "../../../context/ToastContext";

interface Props {
  disabled?: boolean;
  onSend: (dataUri: string, duracionSeg: number) => void | Promise<void>;
}

const BANDAS = 20;
const NIVEL_MIN = 3;
const NIVEL_MAX = 26;
// expo-audio reporta metering en dBFS (~ -160 silencio .. 0 más fuerte) --
// una voz normal rara vez pasa de -50dB, así que ese es el piso "audible"
// para no dejar la barra plana en silencio de fondo.
const DB_PISO = -50;

function formatoTiempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Botón de micrófono que graba una nota de voz (con forma de onda en vivo) y la envía como data URI (mismo formato que web). */
export function VoiceRecorderButton({ disabled, onSend }: Props) {
  const { tokens } = useTheme();
  const toast = useToast();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 100);
  const [activo, setActivo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [niveles, setNiveles] = useState<number[]>(Array(BANDAS).fill(NIVEL_MIN));
  const pulso = useSharedValue(1);

  useEffect(() => {
    if (!activo || !state.isRecording) {
      pulso.value = withTiming(1, { duration: 200 });
      return;
    }
    pulso.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 550, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 550, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [activo, state.isRecording, pulso]);

  useEffect(() => {
    if (!activo || !state.isRecording) return;
    const db = state.metering ?? DB_PISO;
    const norm = Math.max(0, Math.min(1, (db - DB_PISO) / -DB_PISO));
    setNiveles((prev) => [...prev.slice(1), Math.round(NIVEL_MIN + norm * (NIVEL_MAX - NIVEL_MIN))]);
  }, [state.metering, state.isRecording, activo]);

  const pulsoStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulso.value }] }));

  const iniciar = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        toast.show("Necesitamos permiso de micrófono para grabar notas de voz.", "error");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setNiveles(Array(BANDAS).fill(NIVEL_MIN));
      setActivo(true);
    } catch {
      toast.show("No se pudo iniciar la grabación.", "error");
    }
  };

  const cancelar = async () => {
    try {
      await recorder.stop();
      if (recorder.uri) await FileSystem.deleteAsync(recorder.uri, { idempotent: true });
    } catch {
      /* no crítico */
    } finally {
      setActivo(false);
    }
  };

  const togglePausa = () => {
    if (state.isRecording) recorder.pause();
    else recorder.record();
  };

  const enviar = async () => {
    const duracion = Math.max(1, Math.round(state.durationMillis / 1000));
    setEnviando(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("Sin grabación");
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      await onSend(`data:audio/m4a;base64,${base64}`, duracion);
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      toast.show("No se pudo enviar la nota de voz.", "error");
    } finally {
      setActivo(false);
      setEnviando(false);
    }
  };

  if (!activo) {
    return (
      <Pressable
        onPress={iniciar}
        disabled={disabled}
        accessibilityLabel="Grabar nota de voz"
        style={[styles.sendBtn, { backgroundColor: tokens.cyan, opacity: disabled ? 0.5 : 1 }, !disabled && glowShadow(tokens.cyanGlow, "sm")]}
      >
        <MicrophoneIcon size={17} weight="fill" color={tokens.cyanInk} />
      </Pressable>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(160)} style={[styles.bar, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
      <Pressable onPress={cancelar} accessibilityLabel="Descartar grabación" style={[styles.roundBtn, { backgroundColor: tokens.dangerBg }]}>
        <TrashIcon size={16} color={tokens.danger} />
      </Pressable>

      <Animated.View style={[styles.dot, { backgroundColor: tokens.danger, opacity: state.isRecording ? 1 : 0.35 }, pulsoStyle]} />
      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: tokens.textPrimary, minWidth: 34 }}>
        {formatoTiempo(Math.floor(state.durationMillis / 1000))}
      </Text>

      <View style={styles.wave} pointerEvents="none">
        {niveles.map((h, i) => (
          <View
            key={i}
            style={{
              width: 2.5,
              height: NIVEL_MAX,
              borderRadius: 2,
              backgroundColor: tokens.cyan,
              opacity: state.isRecording ? 0.85 : 0.35,
              transform: [{ scaleY: Math.max(NIVEL_MIN, h) / NIVEL_MAX }],
            }}
          />
        ))}
      </View>

      <Pressable onPress={togglePausa} accessibilityLabel={state.isRecording ? "Pausar" : "Reanudar"} style={[styles.roundBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border, borderWidth: 1 }]}>
        {state.isRecording ? <PauseIcon size={14} weight="fill" color={tokens.textPrimary} /> : <PlayIcon size={14} weight="fill" color={tokens.textPrimary} />}
      </Pressable>

      <Pressable onPress={enviar} disabled={enviando} accessibilityLabel="Enviar nota de voz" style={[styles.sendBtn, { backgroundColor: tokens.cyan, opacity: enviando ? 0.6 : 1 }]}>
        {enviando ? <ActivityIndicator size="small" color={tokens.cyanInk} /> : <PaperPlaneTiltIcon size={16} weight="fill" color={tokens.cyanInk} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  bar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 40, borderRadius: 20, borderWidth: 1, paddingHorizontal: 4 },
  roundBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  wave: { flex: 1, flexDirection: "row", alignItems: "center", gap: 2.5, height: NIVEL_MAX, overflow: "hidden" },
});
