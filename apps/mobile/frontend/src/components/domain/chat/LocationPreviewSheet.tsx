import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { MapPinIcon, PaperPlaneTiltIcon, WarningCircleIcon } from "phosphor-react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { radius } from "../../../theme/tokens";
import { WebMapView } from "../../ui/WebMapView";
import { Sheet } from "../../ui/Sheet";

interface Props {
  visible: boolean;
  enviando: boolean;
  onCancel: () => void;
  onConfirm: (lat: number, lng: number) => void;
}

/** Pide la ubicación, la muestra en un mapa real y solo la envía si el usuario confirma. */
export function LocationPreviewSheet({ visible, enviando, onCancel, onConfirm }: Props) {
  const { tokens } = useTheme();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCoords(null);
    setError(null);
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Necesitamos permiso de ubicación.");
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({});
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        setError("No se pudo obtener tu ubicación.");
      }
    })();
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onCancel} title="Compartir ubicación">
      <View style={{ height: 220, borderRadius: radius.md, overflow: "hidden", backgroundColor: tokens.surface2, marginBottom: 14, borderWidth: 1, borderColor: tokens.border }}>
        {error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 20 }}>
            <WarningCircleIcon size={24} color={tokens.textMuted} />
            <Text style={{ fontSize: 12.5, color: tokens.textSecondary, textAlign: "center" }}>{error}</Text>
          </View>
        ) : !coords ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <ActivityIndicator color={tokens.cyan} />
            <Text style={{ fontSize: 12, color: tokens.textMuted }}>Buscando tu ubicación…</Text>
          </View>
        ) : (
          <>
            <WebMapView center={[coords.lng, coords.lat]} zoom={16} interactive={false} markers={[{ id: "yo", coordinate: [coords.lng, coords.lat], color: tokens.coral }]} />
            <LinearGradient colors={["transparent", "rgba(8,11,20,0.05)", "rgba(8,11,20,0.8)"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={{ position: "absolute", left: 12, right: 12, bottom: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tokens.coral, alignItems: "center", justifyContent: "center" }}>
                <MapPinIcon size={14} weight="fill" color="#fff" />
              </View>
              <Text style={{ flex: 1, fontSize: 12.5, color: "#fff", fontFamily: "Inter_700Bold" }}>Tu ubicación actual</Text>
            </View>
          </>
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <MapPinIcon size={14} weight="fill" color={tokens.cyan} />
        <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>Se compartirá tu ubicación aproximada con esta persona.</Text>
      </View>

      <Pressable
        onPress={() => coords && onConfirm(coords.lat, coords.lng)}
        disabled={!coords || enviando}
        style={{
          height: 46,
          borderRadius: radius.md,
          backgroundColor: tokens.cyan,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: !coords || enviando ? 0.55 : 1,
        }}
      >
        {enviando ? <ActivityIndicator color={tokens.cyanInk} /> : <PaperPlaneTiltIcon size={16} weight="fill" color={tokens.cyanInk} />}
        <Text style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: tokens.cyanInk }}>Enviar esta ubicación</Text>
      </Pressable>
    </Sheet>
  );
}
