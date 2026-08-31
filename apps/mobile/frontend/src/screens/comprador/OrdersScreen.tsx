import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, PackageIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { pedidosApi } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money, formatDateTime } from "../../lib/format";
import { StatusPill } from "../../components/ui/StatusPill";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedListItem } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "Orders">;

export function OrdersScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  useEffect(() => {
    pedidosApi.misPedidos().then((r) => setPedidos(r.pedidos)).catch(() => setPedidos([]));
  }, []);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Mis pedidos</Text>
      </View>

      {pedidos === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={90} radius={14} />
          <Skeleton height={90} radius={14} />
        </View>
      ) : pedidos.length === 0 ? (
        <EmptyState icon={<PackageIcon size={24} color={tokens.textMuted} />} title="Todavía no has pedido nada" />
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 60 }}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <Pressable onPress={() => navigation.navigate("OrderDetail", { id: item.id })} style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 13.5, color: tokens.textPrimary }}>Pedido #SV-{item.id}</Text>
                  <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 2 }}>
                    {item.vendedor_nombre} · {formatDateTime(item.created_at)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <StatusPill estado={item.estado} />
                  <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", marginTop: 8, color: tokens.textPrimary }}>{money(item.total)}</Text>
                </View>
              </Pressable>
            </AnimatedListItem>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1 },
});
