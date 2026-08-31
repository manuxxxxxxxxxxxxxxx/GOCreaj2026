import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
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
      <View style={{ height: 220, borderRadius: radius.md, overflow: "hidden", backgroundColor: tokens.surface2, marginBottom: 14 }}>
        {error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 20 }}>
            <WarningCircleIcon size={24} color={tokens.textMuted} />
            <Text style={{ fontSize: 12.5, color: tokens.textSecondary, textAlign: "center" }}>{error}</Text>
          </View>
        ) : !coords ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={tokens.cyan} />
          </View>
        ) : (
          <WebMapView center={[coords.lng, coords.lat]} zoom={16} interactive={false} markers={[{ id: "yo", coordinate: [coords.lng, coords.lat], color: tokens.cyan }]} />
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <MapPinIcon size={14} weight="fill" color={tokens.cyan} />
        <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>{coords ? "Esta es tu ubicación aproximada actual." : "Buscando tu ubicación…"}</Text>
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
