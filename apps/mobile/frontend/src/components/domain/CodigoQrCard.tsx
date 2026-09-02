import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "../../theme/ThemeContext";

/** Tarjeta de "generar" del flujo logístico (ver DESIGN.md "Flujo logístico"): un QR real
 * de un solo uso + su PIN de 6 dígitos como respaldo. Nunca se combina con la UI de
 * "escanear" (ver QrScanBox) en la misma pantalla para el mismo rol. */
export function CodigoQrCard({ token, pin, mensaje }: { token: string; pin: string; mensaje: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 16, paddingBottom: 8 }}>
      <Text style={{ fontSize: 13, color: tokens.textSecondary, textAlign: "center" }}>{mensaje}</Text>
      <View style={{ backgroundColor: "#fff", padding: 18, borderRadius: 18 }}>
        <QRCode value={token} size={180} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, width: "100%" }}>
        <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
        <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>o con el PIN</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: tokens.border }} />
      </View>
      <Text style={{ fontSize: 32, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", letterSpacing: 8, color: tokens.textPrimary }}>{pin}</Text>
    </View>
  );
}
