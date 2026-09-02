import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { CheckCircleIcon, ArrowCounterClockwiseIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { PinBoxInput } from "./PinBoxInput";

interface Props {
  valor: string;
  onChange: (v: string) => void;
  hint?: string;
}

/** El mismo campo sirve para escanear el QR (siempre un token largo) o teclear el PIN de
 * respaldo de 6 dígitos (ver DESIGN.md "Flujo logístico", PARTE 2.A) -- se distingue solo
 * por la forma del valor, sin pedirle al usuario que elija un modo aparte. */
export function codigoDesdeValor(valor: string): { qr_token: string } | { pin: string } {
  const limpio = valor.trim();
  return /^\d{6}$/.test(limpio) ? { pin: limpio } : { qr_token: limpio };
}

export function QrScanBox({ valor, onChange, hint }: Props) {
  const { tokens } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [qrEscaneado, setQrEscaneado] = useState<string | null>(/^\d{6}$/.test(valor) ? null : valor || null);

  const reiniciar = () => {
    setQrEscaneado(null);
    onChange("");
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{hint ?? "Escanea el código QR, o teclea el PIN de 6 dígitos."}</Text>

      {qrEscaneado ? (
        <View style={[styles.escaneadoBox, { backgroundColor: tokens.okBg, borderColor: tokens.okInk }]}>
          <CheckCircleIcon size={28} weight="fill" color={tokens.okInk} />
          <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: tokens.okInk, marginTop: 8 }}>Código QR escaneado</Text>
          <Pressable onPress={reiniciar} style={styles.reescanearBtn}>
            <ArrowCounterClockwiseIcon size={13} color={tokens.textSecondary} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>Escanear de nuevo</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.cameraBox, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
            {!permission?.granted ? (
              <View style={styles.center}>
                <Text style={{ fontSize: 12.5, color: tokens.textSecondary, textAlign: "center", marginBottom: 10 }}>Necesitamos permiso de cámara para escanear.</Text>
                <Text onPress={requestPermission} style={{ color: tokens.cyan, fontFamily: "Inter_700Bold", fontSize: 13 }}>
                  Activar cámara
                </Text>
              </View>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => {
                  setQrEscaneado(data);
                  onChange(data);
                }}
              />
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
            <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>o el PIN</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
          </View>

          <PinBoxInput value={valor} onChange={onChange} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Antes era `aspectRatio: 4/3` sin tope -- en un sheet ancho (p. ej. web) eso estiraba
  // la caja a cientos de pixeles de alto, empujando el botón de Confirmar muy abajo del
  // scroll. Una altura fija se ve bien en cualquier ancho sin ese problema.
  cameraBox: { height: 220, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  escaneadoBox: { alignItems: "center", borderRadius: 14, borderWidth: 1.5, paddingVertical: 28 },
  reescanearBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
});
