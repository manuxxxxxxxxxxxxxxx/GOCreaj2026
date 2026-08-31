import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CaretLeftIcon, MoonIcon, SunIcon } from "phosphor-react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { IconButton } from "./IconButton";

type AuthNav = NativeStackNavigationProp<AuthStackParamList, keyof AuthStackParamList>;

interface Props {
  navigation: AuthNav;
  /** Login es el "home" para usuarios no autenticados: no muestra botón de volver. */
  showBack?: boolean;
}

/**
 * Header fijo (fuera del ScrollView) compartido por Login/Register/ForgotPassword:
 * volver directo a Login (reset, no goBack — evita apilar Login→Register→ForgotPassword),
 * marca "SB" centrada, y el toggle de tema claro/oscuro.
 */
export function AuthHeader({ navigation, showBack = true }: Props) {
  const { tokens, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();

  const volverAHome = () => navigation.reset({ index: 0, routes: [{ name: "Login" }] });

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[styles.wrap, { paddingTop: insets.top + 28 }]}
    >
      <View style={styles.side}>
        {showBack ? (
          <Pressable onPress={volverAHome} accessibilityLabel="Volver al inicio" hitSlop={10} style={styles.backRow}>
            <CaretLeftIcon size={16} weight="bold" color={tokens.textSecondary} />
            <Text style={[styles.backText, { color: tokens.textSecondary }]}>Volver</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center} pointerEvents="none">
        <Image
          source={isDark ? require("../../../assets/branding/logo-dark.png") : require("../../../assets/branding/logo-light.png")}
          style={styles.brand}
          resizeMode="contain"
        />
      </View>

      <View style={[styles.side, styles.sideRight]}>
        <IconButton
          size={44}
          icon={isDark ? <SunIcon size={19} weight="bold" color={tokens.textPrimary} /> : <MoonIcon size={19} weight="bold" color={tokens.textPrimary} />}
          label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          onPress={toggle}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  side: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  sideRight: { alignItems: "flex-end" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingVertical: 12 },
  backText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  brand: { height: 38, width: 100 },
});
