import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BellIcon, BellSlashIcon, CameraIcon, ChatCircleTextIcon, SealCheckIcon, StarIcon, StorefrontIcon, UsersThreeIcon } from "phosphor-react-native";
import type { Tienda } from "../../../lib/types";
import { useTheme } from "../../../theme/ThemeContext";
import { Button } from "../../ui/Button";

const DEFAULT_BANNERS: [string, string][] = [
  ["#0891B2", "#7C3AED"],
  ["#7C3AED", "#F5642E"],
  ["#F5642E", "#0891B2"],
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

interface Props {
  tienda: Tienda;
  isOwner: boolean;
  notifOn: boolean;
  onEditBanner?: () => void;
  onToggleSeguir: () => void;
  onToggleNotif: () => void;
  onContactar: () => void;
}

/**
 * Compact panoramic hero: a thin 16:9 banner with the logo overlapping its
 * bottom edge, and the identity/stats/CTA block acoupled directly beneath --
 * one shallow unit instead of a tall banner + a separate boxy info panel.
 */
export function StoreHero({ tienda, isOwner, notifOn, onEditBanner, onToggleSeguir, onToggleNotif, onContactar }: Props) {
  const { tokens } = useTheme();
  const [from, to] = DEFAULT_BANNERS[tienda.id % DEFAULT_BANNERS.length];

  return (
    <View>
      <View style={styles.banner}>
        {tienda.portada ? (
          <Image source={{ uri: tienda.portada }} style={StyleSheet.absoluteFill} />
        ) : (
          <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={["rgba(8,11,20,0)", "rgba(8,11,20,0.35)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
        {isOwner && (
          <Pressable onPress={onEditBanner} style={styles.editBtn}>
            <CameraIcon size={12} weight="bold" color="#fff" />
            <Text style={styles.editBtnText}>Cambiar portada</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.identity, { backgroundColor: tokens.surface1 }]}>
        <View style={[styles.logo, { borderColor: tokens.surface1, backgroundColor: tokens.surface2 }]}>
          {tienda.logo ? (
            <Image source={{ uri: tienda.logo }} style={StyleSheet.absoluteFill} />
          ) : (
            <StorefrontIcon size={22} color={tokens.textMuted} style={{ alignSelf: "center", marginTop: 19 }} />
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <Text style={[styles.name, { color: tokens.textPrimary }]}>{tienda.nombre}</Text>
          {!!tienda.verificado && (
            <View style={[styles.badge, { backgroundColor: tokens.cyanBg }]}>
              <SealCheckIcon size={11} weight="fill" color={tokens.cyan} />
              <Text style={[styles.badgeText, { color: tokens.cyan }]}>VERIFICADO</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <StarIcon size={13} weight="fill" color={tokens.warn} />
          <Text style={[styles.statBold, { color: tokens.textPrimary }]}>{tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo"}</Text>
          <Text style={[styles.statMuted, { color: tokens.textSecondary }]}>({formatCount(tienda.total_resenas)} reseñas)</Text>
          <Text style={{ color: tokens.textMuted }}>·</Text>
          <UsersThreeIcon size={13} color={tokens.textSecondary} />
          <Text style={[styles.statMuted, { color: tokens.textSecondary }]}>{formatCount(tienda.seguidores_count ?? 0)} seguidores</Text>
        </View>

        <View style={styles.ctaRow}>
          <Button size="sm" variant={tienda.yo_sigo ? "secondary" : "primary"} icon={!tienda.yo_sigo ? <BellIcon size={14} weight="fill" color={tokens.cyanInk} /> : undefined} onPress={onToggleSeguir}>
            {tienda.yo_sigo ? "Siguiendo" : "SEGUIR"}
          </Button>
          <Button size="sm" variant="secondary" icon={<ChatCircleTextIcon size={14} color={tokens.textPrimary} />} onPress={onContactar}>
            CONTACTAR
          </Button>
          {!!tienda.yo_sigo && (
            <Pressable
              onPress={onToggleNotif}
              accessibilityLabel={notifOn ? "Desactivar notificaciones" : "Activar notificaciones"}
              style={[styles.notifBtn, { borderColor: notifOn ? tokens.cyan : tokens.border, backgroundColor: notifOn ? tokens.cyanBg : tokens.surface2 }]}
            >
              {notifOn ? <BellIcon size={15} weight="fill" color={tokens.cyan} /> : <BellSlashIcon size={15} color={tokens.textSecondary} />}
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { width: "100%", aspectRatio: 16 / 9, position: "relative", overflow: "hidden" },
  editBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(8,11,20,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  editBtnText: { color: "#fff", fontSize: 10.5, fontFamily: "Inter_700Bold" },
  identity: { paddingHorizontal: 20, paddingBottom: 16, alignItems: "center", gap: 6 },
  logo: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, overflow: "hidden", marginTop: -30 },
  name: { fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold", textAlign: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 9.5, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "center" },
  statBold: { fontSize: 12.5, fontFamily: "Inter_700Bold" },
  statMuted: { fontSize: 12 },
  ctaRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  notifBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
