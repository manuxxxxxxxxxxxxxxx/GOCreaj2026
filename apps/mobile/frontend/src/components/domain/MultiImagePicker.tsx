import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CameraIcon, PlusIcon, XIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";

const MAX_IMAGENES = 10;

/** Galería de hasta 10 fotos para el formulario de producto (antes una sola). Usa selección
 * múltiple nativa cuando está disponible y sigue funcionando si el usuario agrega de una en
 * una hasta llenar el cupo. */
export function MultiImagePicker({ imagenes, onChange }: { imagenes: string[]; onChange: (imagenes: string[]) => void }) {
  const { tokens } = useTheme();
  const cupoRestante = MAX_IMAGENES - imagenes.length;

  const agregar = async () => {
    if (cupoRestante <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
      allowsMultipleSelection: true,
      selectionLimit: cupoRestante,
    });
    if (res.canceled || !res.assets.length) return;
    const nuevas = res.assets.filter((a) => a.base64).map((a) => `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`);
    onChange([...imagenes, ...nuevas].slice(0, MAX_IMAGENES));
  };

  const quitar = (i: number) => onChange(imagenes.filter((_, idx) => idx !== i));

  return (
    <View>
      <View style={styles.grid}>
        {imagenes.map((uri, i) => (
          <View key={i} style={[styles.tile, { borderColor: tokens.border }]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} />
            {i === 0 && (
              <View style={[styles.portada, { backgroundColor: tokens.cyan }]}>
                <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: tokens.cyanInk }}>Portada</Text>
              </View>
            )}
            <Pressable onPress={() => quitar(i)} style={[styles.quitar, { backgroundColor: tokens.surface1, borderColor: tokens.border }]} accessibilityLabel="Quitar foto">
              <XIcon size={12} color={tokens.textPrimary} />
            </Pressable>
          </View>
        ))}
        {cupoRestante > 0 && (
          <Pressable onPress={agregar} style={[styles.tile, styles.agregar, { borderColor: tokens.border, backgroundColor: tokens.surface2 }]}>
            {imagenes.length === 0 ? <CameraIcon size={20} color={tokens.textMuted} /> : <PlusIcon size={20} color={tokens.textMuted} />}
            <Text style={{ fontSize: 10.5, color: tokens.textMuted, marginTop: 3 }}>{imagenes.length === 0 ? "Agregar fotos" : `${imagenes.length}/${MAX_IMAGENES}`}</Text>
          </Pressable>
        )}
      </View>
      {imagenes.length > 0 && <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 6 }}>La primera foto es la portada. Toca la X para quitar una.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: 78, height: 78, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  agregar: { alignItems: "center", justifyContent: "center" },
  portada: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingVertical: 2 },
  quitar: { position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
