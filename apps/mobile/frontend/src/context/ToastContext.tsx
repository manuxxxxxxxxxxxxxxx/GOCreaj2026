import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, XCircleIcon, type IconProps } from "phosphor-react-native";
import { useTheme } from "../theme/ThemeContext";

type ToastKind = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, React.ComponentType<IconProps>> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: WarningCircleIcon,
  info: InfoIcon,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View pointerEvents="none" style={[styles.container, { bottom: insets.bottom + 90 }]}>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          const tone = t.kind === "success" ? tokens.ok : t.kind === "error" ? tokens.danger : t.kind === "warning" ? tokens.warn : tokens.cyan;
          return (
            <Animated.View
              key={t.id}
              entering={FadeInDown.duration(220)}
              exiting={FadeOutDown.duration(180)}
              style={[styles.toast, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}
            >
              <Icon size={18} weight="bold" color={tone} />
              <Text style={[styles.text, { color: tokens.textPrimary }]} numberOfLines={2}>
                {t.message}
              </Text>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", left: 16, right: 16, gap: 8, alignItems: "center" },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, width: "100%", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  text: { flex: 1, fontSize: 13.5 },
});

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
