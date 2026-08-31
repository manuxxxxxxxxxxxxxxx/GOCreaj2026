import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BellIcon, CaretLeftIcon, ChatCircleDotsIcon, GearIcon, MegaphoneIcon, PackageIcon, TrashIcon, type IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { notificacionesApi } from "../../lib/api";
import type { Notificacion } from "../../lib/types";
import { relativeTime } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedListItem } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

const ICONS: Record<Notificacion["tipo"], ComponentType<IconProps>> = { pedido: PackageIcon, chat: ChatCircleDotsIcon, sistema: GearIcon, promocion: MegaphoneIcon };

export function NotificationsScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Notificacion[] | null>(null);

  const cargar = () => {
    notificacionesApi.listar().then((r) => setItems(r.notificaciones)).catch(() => setItems([]));
  };

  useEffect(cargar, []);

  const marcar = async (n: Notificacion) => {
    if (!n.leida) await notificacionesApi.marcarLeida(n.id);
    if (n.tipo === "pedido" && n.referencia_id) navigation.navigate("OrderDetail", { id: n.referencia_id });
    cargar();
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Notificaciones</Text>
        <Button size="sm" variant="secondary" onPress={() => notificacionesApi.marcarTodasLeidas().then(cargar)}>
          Leídas
        </Button>
      </View>

      {items === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState icon={<BellIcon size={22} color={tokens.textMuted} />} title="No tienes notificaciones" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 60 }}
          renderItem={({ item, index }) => {
            const Icon = ICONS[item.tipo] ?? BellIcon;
            return (
              <AnimatedListItem index={index}>
                <Pressable onPress={() => marcar(item)} style={[styles.card, { backgroundColor: item.leida ? tokens.surface1 : tokens.cyanBg, borderColor: tokens.border }]}>
                  <View style={[styles.iconWrap, { backgroundColor: tokens.surface2 }]}>
                    <Icon size={16} color={tokens.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: item.leida ? "Inter_500Medium" : "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>{item.titulo}</Text>
                    {item.cuerpo && <Text style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>{item.cuerpo}</Text>}
                    <Text style={{ fontSize: 10.5, color: tokens.textMuted, marginTop: 4 }}>{relativeTime(item.created_at)}</Text>
                  </View>
                  <Pressable onPress={() => notificacionesApi.eliminar(item.id).then(cargar)} hitSlop={8}>
                    <TrashIcon size={15} color={tokens.textMuted} />
                  </Pressable>
                </Pressable>
              </AnimatedListItem>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
});
