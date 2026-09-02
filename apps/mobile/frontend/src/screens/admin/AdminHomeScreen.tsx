import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BicycleIcon,
  CaretRightIcon,
  ChartBarIcon,
  ChatCircleDotsIcon,
  CurrencyDollarSimpleIcon,
  HeadsetIcon,
  MapPinLineIcon,
  PackageIcon,
  ShieldCheckIcon,
  SignOutIcon,
  StorefrontIcon,
  TagIcon,
  TreeStructureIcon,
  UsersThreeIcon,
} from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { adminApi } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { AnimatedListItem } from "../../components/ui/Motion";

type Stats = Awaited<ReturnType<typeof adminApi.stats>>["stats"];

/** Panel de administrador -- portado 1:1 desde el sidebar de apps/web/web
 * (AdminLayout.tsx + AdminResumen.tsx), pero como un único "hub" nativo:
 * el KPI/actividad de resumen arriba, y la misma agrupación de secciones del
 * sidebar (General / Operación / Soporte) como una lista de navegación abajo,
 * ya que en mobile no hay lugar para una barra lateral siempre visible. */
export function AdminHomeScreen() {
  const { tokens } = useTheme();
  const { usuario, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [actividad, setActividad] = useState<{ tipo: string; descripcion: string; fecha: string }[] | null>(null);

  useEffect(() => {
    adminApi.stats().then((r) => setStats(r.stats)).catch(() => {});
    adminApi.actividadReciente().then((r) => setActividad(r.actividad)).catch(() => setActividad([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar nombre={usuario?.nombre ?? ""} foto={usuario?.foto_perfil} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{usuario?.nombre}</Text>
          <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>Administrador</Text>
        </View>
        <Pressable onPress={logout} accessibilityLabel="Cerrar sesión" style={[styles.logoutBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <SignOutIcon size={16} color={tokens.textSecondary} />
        </Pressable>
      </View>

      {stats === null ? (
        <View style={styles.kpiGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={72} radius={14} />
          ))}
        </View>
      ) : (
        <View style={styles.kpiGrid}>
          {[
            <Kpi key="u" icon={<UsersThreeIcon size={15} color={tokens.textMuted} />} label="Usuarios" value={String(stats.usuarios)} />,
            <Kpi key="p" icon={<PackageIcon size={15} color={tokens.cyan} />} label="Pedidos hoy" value={String(stats.pedidos_hoy)} tone="cyan" />,
            <Kpi key="i" icon={<ShieldCheckIcon size={15} color={tokens.okInk} />} label="Admins" value={String(stats.admins)} tone="ok" />,
            <Kpi
              key="s"
              icon={<HeadsetIcon size={15} color={stats.soporte_abiertos > 0 ? tokens.warnInk : tokens.textMuted} />}
              label="Soporte abierto"
              value={String(stats.soporte_abiertos)}
              tone={stats.soporte_abiertos > 0 ? "warn" : undefined}
            />,
            <Kpi key="v" icon={<StorefrontIcon size={15} color={tokens.textMuted} />} label="Vendedores" value={String(stats.vendedores)} />,
            <Kpi key="r" icon={<BicycleIcon size={15} color={tokens.textMuted} />} label="Repartidores" value={String(stats.repartidores)} />,
          ].map((kpi, i) => (
            <AnimatedListItem key={i} index={i} style={styles.kpi}>
              {kpi}
            </AnimatedListItem>
          ))}
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>Actividad reciente</Text>
        {actividad === null ? (
          <Skeleton height={120} />
        ) : actividad.length === 0 ? (
          <EmptyState icon={<ChatCircleDotsIcon size={20} color={tokens.textMuted} />} title="Sin actividad reciente" />
        ) : (
          <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
            {actividad.slice(0, 8).map((a, i) => (
              <View key={i} style={[styles.actividadRow, { borderBottomColor: tokens.border, borderBottomWidth: i === Math.min(actividad.length, 8) - 1 ? 0 : 1 }]}>
                <Text style={{ flex: 1, fontSize: 12.5, color: tokens.textPrimary }} numberOfLines={2}>{a.descripcion}</Text>
                <Text style={{ fontSize: 11, color: tokens.textMuted, flexShrink: 0, marginLeft: 10 }}>{relativeTime(a.fecha)}</Text>
              </View>
            ))}
          </Card>
        )}
      </View>

      <AdminNavSection
        title="General"
        items={[
          { icon: <UsersThreeIcon size={17} color={tokens.cyan} />, label: "Usuarios", onPress: () => navigation.navigate("AdminUsuarios") },
          { icon: <PackageIcon size={17} color={tokens.cyan} />, label: "Pedidos", onPress: () => navigation.navigate("AdminPedidos") },
          { icon: <StorefrontIcon size={17} color={tokens.cyan} />, label: "Productos", onPress: () => navigation.navigate("AdminProductos") },
          { icon: <TreeStructureIcon size={17} color={tokens.cyan} />, label: "Árbol de control", onPress: () => navigation.navigate("AdminArbol") },
        ]}
      />

      <AdminNavSection
        title="Operación"
        items={[
          { icon: <BicycleIcon size={17} color={tokens.cyan} />, label: "Repartidores en vivo", onPress: () => navigation.navigate("AdminRepartidores") },
          { icon: <MapPinLineIcon size={17} color={tokens.cyan} />, label: "Zonas de cobertura", onPress: () => navigation.navigate("AdminCobertura") },
          { icon: <TagIcon size={17} color={tokens.cyan} />, label: "Cupones", onPress: () => navigation.navigate("AdminCupones") },
          { icon: <CurrencyDollarSimpleIcon size={17} color={tokens.cyan} />, label: "Finanzas", onPress: () => navigation.navigate("AdminFinanzas") },
        ]}
      />

      <AdminNavSection
        title="Soporte"
        items={[
          { icon: <HeadsetIcon size={17} color={tokens.cyan} />, label: "Tickets", onPress: () => navigation.navigate("AdminSoporte") },
          { icon: <ChartBarIcon size={17} color={tokens.cyan} />, label: "Solicitudes de rol", onPress: () => navigation.navigate("AdminSolicitudes") },
        ]}
      />
    </ScrollView>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "cyan" | "ok" | "warn" }) {
  const { tokens } = useTheme();
  const bg = tone === "cyan" ? tokens.cyanBg : tone === "ok" ? tokens.okBg : tone === "warn" ? tokens.warnBg : tokens.surface2;
  const ink = tone === "cyan" ? tokens.cyan : tone === "ok" ? tokens.okInk : tone === "warn" ? tokens.warnInk : tokens.textPrimary;
  return (
    <View style={{ flex: 1, borderRadius: 14, padding: 12, backgroundColor: bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        {icon}
        <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: tone ? ink : tokens.textMuted, textTransform: "uppercase", opacity: 0.85 }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 17, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: ink, marginTop: 6 }}>{value}</Text>
    </View>
  );
}

function AdminNavSection({ title, items }: { title: string; items: { icon: React.ReactNode; label: string; onPress: () => void }[] }) {
  const { tokens } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.sectionLabel, { color: tokens.textMuted }]}>{title}</Text>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        {items.map((item, i) => (
          <Pressable key={item.label} onPress={item.onPress} style={[styles.navRow, { borderBottomColor: tokens.border, borderBottomWidth: i === items.length - 1 ? 0 : 1 }]}>
            <View style={[styles.navIconBadge, { backgroundColor: tokens.cyanBg }]}>{item.icon}</View>
            <Text style={{ flex: 1, fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{item.label}</Text>
            <CaretRightIcon size={14} color={tokens.textMuted} />
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  logoutBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { width: "31.5%" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase", paddingHorizontal: 2 },
  actividadRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  navIconBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
