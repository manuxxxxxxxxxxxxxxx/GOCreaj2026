import { Linking, Pressable, Text, View } from "react-native";
import { ArrowSquareOutIcon, MapPinIcon } from "phosphor-react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { radius } from "../../../theme/tokens";
import { WebMapView } from "../../ui/WebMapView";
import { Sheet } from "../../ui/Sheet";

interface Props {
  visible: boolean;
  lat: number;
  lng: number;
  onClose: () => void;
}

/** Abre la ubicación compartida en un mapa grande dentro de la app, sin salir a Google Maps por defecto. */
export function MapViewerSheet({ visible, lat, lng, onClose }: Props) {
  const { tokens } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose} title="Ubicación compartida">
      <View style={{ height: 320, borderRadius: radius.md, overflow: "hidden", marginBottom: 12 }}>
        <WebMapView center={[lng, lat]} zoom={16} markers={[{ id: "u", coordinate: [lng, lat], color: tokens.coral }]} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MapPinIcon size={13} weight="fill" color={tokens.coral} />
          <Text style={{ fontSize: 11.5, color: tokens.textSecondary, fontFamily: "IBMPlexMono_500Medium" }}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </Text>
        </View>
        <Pressable onPress={() => Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}`)} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Abrir en Google Maps</Text>
          <ArrowSquareOutIcon size={13} color={tokens.cyan} />
        </Pressable>
      </View>
    </Sheet>
  );
}
