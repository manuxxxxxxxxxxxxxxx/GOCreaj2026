import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { GoogleLogoIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { radius } from "../../theme/tokens";
import { useGoogleAuth, type GoogleUserInfo } from "../../lib/googleAuth";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  label?: string;
  loading?: boolean;
  onUserInfo: (info: GoogleUserInfo) => void | Promise<void>;
}

/** Botón "Continuar con Google" — degrada con gracia si no hay Client ID configurado (ver GOOGLE_AUTH_SETUP.md). */
export function GoogleSignInButton({ label = "Continuar con Google", loading, onUserInfo }: Props) {
  const { tokens } = useTheme();
  const scale = useSharedValue(1);
  const { promptAsync } = useGoogleAuth(onUserInfo);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void promptAsync();
  };

  return (
    <AnimatedPressable
      disabled={loading}
      onPress={handlePress}
      onPressIn={() => (scale.value = withTiming(0.94, { duration: 100 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 150 }))}
      style={[
        animStyle,
        styles.base,
        { backgroundColor: tokens.surface1, borderColor: tokens.border, opacity: loading ? 0.6 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tokens.textPrimary} size="small" />
      ) : (
        <>
          <GoogleLogoIcon size={19} weight="bold" color={tokens.textPrimary} />
          <Text style={[styles.text, { color: tokens.textPrimary }]}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 48, borderRadius: radius.sm, borderWidth: 1 },
  text: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
