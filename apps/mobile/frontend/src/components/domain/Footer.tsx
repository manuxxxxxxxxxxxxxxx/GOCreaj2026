import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CompassIcon,
  FacebookLogoIcon,
  HeartIcon,
  InstagramLogoIcon,
  MapPinIcon,
  PackageIcon,
  ShieldCheckIcon,
  StorefrontIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
  type IconProps,
} from "phosphor-react-native";
import type { ComponentType } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import type { RootStackParamList } from "../../navigation/types";

interface FooterLink {
  label: string;
  icon: ComponentType<IconProps>;
  onPress: () => void;
}

export function Footer() {
  const { tokens } = useTheme();
  const { show } = useToast();
  const { usuario } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const proximamente = () => show("Muy pronto disponible 🚀", "info");

  // Un vendedor o repartidor ya es socio -- no tiene sentido ofrecerle "convertirse"
  // de nuevo (misma regla que ConfiguracionAvanzadaScreen / ProfileScreen).
  const puedeConvertirse = !usuario || usuario.rol === "comprador";

  const columnas: { titulo: string; links: FooterLink[] }[] = [
    {
      titulo: "Comprar",
      links: [
        { label: "Explorar tiendas", icon: CompassIcon, onPress: () => navigation.navigate("Tabs", { screen: "Explorar" }) },
        { label: "Mis pedidos", icon: PackageIcon, onPress: () => navigation.navigate("Orders") },
        { label: "Mis direcciones", icon: MapPinIcon, onPress: () => navigation.navigate("Direcciones") },
      ],
    },
    {
      titulo: "Vender",
      links: [
        ...(puedeConvertirse ? [{ label: "Conviértete en vendedor", icon: StorefrontIcon, onPress: () => navigation.navigate("Convertirse") }] : []),
        { label: "Centro de ayuda", icon: ShieldCheckIcon, onPress: () => navigation.navigate("Soporte") },
      ],
    },
  ];

  const social: { icon: ComponentType<IconProps>; label: string }[] = [
    { icon: FacebookLogoIcon, label: "Facebook" },
    { icon: InstagramLogoIcon, label: "Instagram" },
    { icon: TiktokLogoIcon, label: "TikTok" },
    { icon: WhatsappLogoIcon, label: "WhatsApp" },
  ];

  return (
    <View style={[styles.wrap, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.cyanGlow, opacity: 0.4 }]} pointerEvents="none" />

      <View style={styles.top}>
        <View style={{ flex: 1, minWidth: 160, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_700Bold", color: tokens.textPrimary }}>SV</Text>
            <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_700Bold", color: tokens.cyan }}>[Go]</Text>
          </View>
          <Text style={{ fontSize: 12, color: tokens.textMuted, marginTop: 8, lineHeight: 18, maxWidth: 220, fontFamily: "Inter_400Regular" }}>
            Tu marketplace local: comida, mercado, farmacia, moda y envíos, de puerta en puerta por todo El Salvador.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {social.map(({ icon: Icon, label }) => (
              <Pressable
                key={label}
                onPress={proximamente}
                accessibilityLabel={label}
                style={[styles.socialBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}
              >
                <Icon size={15} weight="fill" color={tokens.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>

        {columnas.map((col) => (
          <View key={col.titulo} style={{ minWidth: 150, marginBottom: 20, marginRight: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.textMuted, letterSpacing: 0.6, marginBottom: 12, textTransform: "uppercase" }}>
              {col.titulo}
            </Text>
            <View style={{ gap: 11 }}>
              {col.links.map((l) => (
                <Pressable key={l.label} onPress={l.onPress} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <l.icon size={14} color={tokens.textSecondary} />
                  <Text style={{ fontSize: 12.5, color: tokens.textSecondary, fontFamily: "Inter_500Medium" }}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: tokens.border }]} />

      <View style={styles.bottom}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }}>
          <Text style={{ fontSize: 11, color: tokens.textMuted, fontFamily: "Inter_400Regular" }}>© 2026 SV[Go] · Hecho con</Text>
          <HeartIcon size={11} weight="fill" color={tokens.coral} />
          <Text style={{ fontSize: 11, color: tokens.textMuted, fontFamily: "Inter_400Regular" }}>en El Salvador</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: tokens.okBg }]}>
          <ShieldCheckIcon size={12} weight="fill" color={tokens.ok} />
          <Text style={{ fontSize: 10.5, color: tokens.okInk, fontFamily: "Inter_600SemiBold" }}>Pagos seguros</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 32, borderRadius: 24, borderWidth: 1, padding: 22, overflow: "hidden" },
  top: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  socialBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
