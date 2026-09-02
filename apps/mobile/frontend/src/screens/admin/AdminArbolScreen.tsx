import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BicycleIcon, FlagIcon, ShoppingBagIcon, StorefrontIcon, TreeStructureIcon, UsersThreeIcon, type IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { adminApi, ApiError } from "../../lib/api";
import { money } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";

type Arbol = Awaited<ReturnType<typeof adminApi.arbolControl>>["arbol"];
type Tab = "vendedores" | "repartidores" | "compradores" | "tiendas" | "productos" | "reels";

const TABS: { key: Tab; label: string; Icon: ComponentType<IconProps> }[] = [
  { key: "vendedores", label: "Vendedores", Icon: StorefrontIcon },
  { key: "repartidores", label: "Repartidores", Icon: BicycleIcon },
  { key: "compradores", label: "Compradores", Icon: UsersThreeIcon },
  { key: "tiendas", label: "Tiendas", Icon: StorefrontIcon },
  { key: "productos", label: "Productos", Icon: ShoppingBagIcon },
  { key: "reels", label: "Reels", Icon: FlagIcon },
];

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminArbol.tsx: vista de solo
 * lectura de todo el árbol de la plataforma, agrupada por tipo. */
export function AdminArbolScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [arbol, setArbol] = useState<Arbol | null>(null);
  const [tab, setTab] = useState<Tab>("vendedores");

  useEffect(() => {
    adminApi.arbolControl().then((r) => setArbol(r.arbol)).catch((err) => toast.show(err instanceof ApiError ? err.message : "No se pudo cargar el árbol.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows =
    arbol === null
      ? null
      : tab === "vendedores" || tab === "repartidores" || tab === "compradores"
        ? arbol[tab]
        : tab === "tiendas"
          ? arbol.tiendas
          : tab === "productos"
            ? arbol.productos
            : arbol.reels;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 12, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TreeStructureIcon size={19} color={tokens.textPrimary} />
          <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Árbol de control</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            const count = arbol?.[t.key]?.length ?? 0;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.chip, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}
              >
                <t.Icon size={13} color={active ? tokens.cyan : tokens.textSecondary} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? tokens.cyan : tokens.textSecondary }}>{t.label}</Text>
                <Text style={{ fontSize: 11, fontFamily: "IBMPlexMono_500Medium", opacity: 0.7, color: active ? tokens.cyan : tokens.textSecondary }}>{count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {rows === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={300} radius={14} />
        </View>
      ) : (
        <FlatList
          data={rows as any[]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <View style={[styles.row, { borderBottomColor: tokens.border, borderBottomWidth: index === rows.length - 1 ? 0 : 1 }]}>
              {(tab === "vendedores" || tab === "repartidores" || tab === "compradores") && (
                <>
                  <Avatar nombre={item.nombre} foto={item.foto_perfil} size={32} online={!!item.en_linea} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{item.nombre}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: tokens.textMuted }}>{item.email}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: item.activo ? tokens.okInk : tokens.danger }}>{item.activo ? "Activo" : "Suspendido"}</Text>
                </>
              )}
              {tab === "tiendas" && (
                <>
                  <View style={[styles.thumb, { backgroundColor: tokens.surface2 }]}>{item.logo && <Image source={{ uri: item.logo }} style={StyleSheet.absoluteFill} />}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{item.nombre}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: tokens.textMuted }}>{item.vendedor_nombre} · {item.municipio}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: item.activo ? tokens.okInk : tokens.danger }}>{item.activo ? "Activa" : "Suspendida"}</Text>
                </>
              )}
              {tab === "productos" && (
                <>
                  <View style={[styles.thumb, { backgroundColor: tokens.surface2 }]}>{item.imagen && <Image source={{ uri: item.imagen }} style={StyleSheet.absoluteFill} />}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{item.nombre}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: tokens.textMuted }}>{item.tienda_nombre}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary }}>{money(item.precio)}</Text>
                </>
              )}
              {tab === "reels" && (
                <>
                  <View style={[styles.thumb, { backgroundColor: tokens.surface2 }]}>{item.imagen && <Image source={{ uri: item.imagen }} style={StyleSheet.absoluteFill} />}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{item.nombre}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: tokens.textMuted }}>{item.tienda_nombre}</Text>
                  </View>
                  {item.reportes > 0 && (
                    <View style={{ backgroundColor: tokens.dangerBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: tokens.danger }}>{item.reportes} reportes</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 20 },
  thumb: { width: 32, height: 32, borderRadius: 8, overflow: "hidden" },
});
