import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import {
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from "phosphor-react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useTheme } from "../../../theme/ThemeContext";
import { useToast } from "../../../context/ToastContext";

interface Props {
  disabled?: boolean;
  onSend: (dataUri: string, duracionSeg: number) => void | Promise<void>;
}

function formatoTiempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Botón de micrófono que graba una nota de voz y la envía como data URI (mismo formato que web). */
export function VoiceRecorderButton({ disabled, onSend }: Props) {
  const { tokens } = useTheme();
  const toast = useToast();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [activo, setActivo] = useState(false);
  const [enviando, setEnviando] = useState(false);

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
        style={[styles.sendBtn, { backgroundColor: tokens.cyan, opacity: disabled ? 0.5 : 1 }]}
      >
        <MicrophoneIcon size={17} weight="fill" color={tokens.cyanInk} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.bar, { backgroundColor: tokens.surface1 }]}>
      <Pressable onPress={cancelar} accessibilityLabel="Descartar grabación" style={[styles.roundBtn, { backgroundColor: tokens.dangerBg }]}>
        <TrashIcon size={16} color={tokens.danger} />
      </Pressable>

      <View style={[styles.dot, { backgroundColor: tokens.danger, opacity: state.isRecording ? 1 : 0.35 }]} />
      <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: tokens.textPrimary, minWidth: 34 }}>
        {formatoTiempo(Math.floor(state.durationMillis / 1000))}
      </Text>

      <View style={{ flex: 1 }} />

      <Pressable onPress={togglePausa} accessibilityLabel={state.isRecording ? "Pausar" : "Reanudar"} style={[styles.roundBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border, borderWidth: 1 }]}>
        {state.isRecording ? <PauseIcon size={14} weight="fill" color={tokens.textPrimary} /> : <PlayIcon size={14} weight="fill" color={tokens.textPrimary} />}
      </Pressable>

      <Pressable onPress={enviar} disabled={enviando} accessibilityLabel="Enviar nota de voz" style={[styles.sendBtn, { backgroundColor: tokens.cyan, opacity: enviando ? 0.5 : 1 }]}>
        <PaperPlaneTiltIcon size={16} weight="fill" color={tokens.cyanInk} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  bar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 40 },
  roundBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
