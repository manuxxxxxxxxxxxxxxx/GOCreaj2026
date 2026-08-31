import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTheme } from "../../theme/ThemeContext";

interface Props {
  valor: string;
  onChange: (v: string) => void;
  hint?: string;
}

export function QrScanBox({ valor, onChange, hint }: Props) {
  const { tokens } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{hint ?? "Escanea el código QR, o pégalo abajo."}</Text>

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
            onBarcodeScanned={
              scanned
                ? undefined
                : ({ data }) => {
                    setScanned(true);
                    onChange(data);
                  }
            }
          />
        )}
      </View>

      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="Código"
        placeholderTextColor={tokens.textMuted}
        style={[styles.input, { borderColor: tokens.border, color: tokens.textPrimary, backgroundColor: tokens.surface1 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cameraBox: { aspectRatio: 4 / 3, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  input: { height: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, fontFamily: "IBMPlexMono_500Medium" },
});
