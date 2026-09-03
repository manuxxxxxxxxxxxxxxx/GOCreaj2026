import { Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeftIcon, CaretRightIcon, XIcon } from "phosphor-react-native";

interface Props {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
}

/** Visor de imagen en grande: tocar una miniatura la abre a pantalla completa, con botón X
 * (o tocar el fondo) para cerrar y flechas para navegar cuando hay más de una foto. */
export function ImageLightbox({ images, index, onClose, onIndexChange }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const src = images[index];
  if (!src) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Cerrar"
          style={[styles.closeBtn, { top: insets.top + 12 }]}
        >
          <XIcon size={18} color="#fff" />
        </Pressable>

        {images.length > 1 && onIndexChange && (
          <>
            <Pressable
              accessibilityLabel="Foto anterior"
              onPress={(e) => {
                e.stopPropagation();
                onIndexChange((index - 1 + images.length) % images.length);
              }}
              style={[styles.navBtn, { left: 16 }]}
            >
              <CaretLeftIcon size={18} weight="bold" color="#fff" />
            </Pressable>
            <Pressable
              accessibilityLabel="Foto siguiente"
              onPress={(e) => {
                e.stopPropagation();
                onIndexChange((index + 1) % images.length);
              }}
              style={[styles.navBtn, { right: 16 }]}
            >
              <CaretRightIcon size={18} weight="bold" color="#fff" />
            </Pressable>
          </>
        )}

        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: width * 0.92, aspectRatio: 1 }}>
          <Image source={{ uri: src }} style={{ width: "100%", height: "100%", borderRadius: 14 }} resizeMode="contain" />
        </Pressable>

        {images.length > 1 && (
          <View style={[styles.counter, { bottom: insets.bottom + 24 }]}>
            <Text style={{ color: "#fff", fontSize: 12.5, fontFamily: "Inter_700Bold" }}>
              {index + 1} / {images.length}
            </Text>
          </View>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(4,8,16,0.92)", alignItems: "center", justifyContent: "center" },
  closeBtn: {
    position: "absolute",
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -21,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: { position: "absolute", alignSelf: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
});
