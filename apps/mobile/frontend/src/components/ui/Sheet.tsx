import { useEffect } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { XIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ visible, onClose, title, children }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const translateY = useSharedValue(0);
  const scrimOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = winHeight;
      translateY.value = withSpring(0, { damping: 18, stiffness: 190 });
      scrimOpacity.value = withTiming(1, { duration: 220 });
    }
  }, [visible]);

  const close = () => {
    translateY.value = withTiming(winHeight, { duration: 220 });
    scrimOpacity.value = withTiming(0, { duration: 200 }, () => runOnJS(onClose)());
  };

  const pan = Gesture.Pan()
    // Sin esto, cualquier arrastre horizontal dentro del sheet (p. ej. deslizar dentro
    // del buscador de categoría/zona) igual quedaba "atrapado" por este gesto -- no
    // movía el sheet (solo reacciona a translationY), pero sí se robaba el toque. Con
    // failOffsetX el gesto se cancela apenas el arrastre es más horizontal que vertical,
    // soltando el toque para que el contenido de abajo lo reciba con normalidad.
    .activeOffsetY(10)
    .failOffsetX([-15, 15])
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 800) {
        runOnJS(close)();
      } else {
        translateY.value = withTiming(0, { duration: 180 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(4,8,16,0.35)" }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              sheetStyle,
              styles.sheet,
              { backgroundColor: tokens.surface1, maxHeight: winHeight * 0.88, position: "absolute", left: 0, right: 0, bottom: 0 },
            ]}
          >
            {/* En iOS el teclado no reacomoda nada solo -- sin esto, un input al fondo del
                sheet (p. ej. el de comentarios) quedaba tapado por el teclado apenas se
                enfocaba. "padding" hace crecer este contenedor hacia arriba (el sheet sigue
                anclado abajo) exactamente lo que el teclado ocupa, así el input y lo que se
                está escribiendo quedan siempre visibles encima de él. */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ paddingBottom: insets.bottom + 16 }}>
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: tokens.borderStrong }]} />
              </View>
              {title && (
                <View style={styles.header}>
                  <Text style={[styles.title, { color: tokens.textPrimary }]}>{title}</Text>
                  <Pressable onPress={close} accessibilityLabel="Cerrar" style={[styles.closeBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
                    <XIcon size={16} color={tokens.textPrimary} />
                  </Pressable>
                </View>
              )}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: radius.pill },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  title: { fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20 },
});
