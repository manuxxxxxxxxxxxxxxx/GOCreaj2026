import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StorefrontIcon, TrashIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { adminApi, ApiError } from "../../lib/api";
import type { Producto } from "../../lib/types";
import { money } from "../../lib/format";
import { CATEGORIAS, CATEGORIA_LABEL } from "../../lib/categoryIcons";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminProductos.tsx. */
export function AdminProductosScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [categoria, setCategoria] = useState("");
  const [eliminando, setEliminando] = useState<Producto | null>(null);

  const cargar = () => {
    adminApi.productos(categoria || undefined).then((r) => setProductos(r.productos)).catch(() => setProductos([]));
  };

  useEffect(cargar, [categoria]);

  const toggleActivo = async (p: Producto) => {
    setProductos((prev) => prev && prev.map((x) => (x.id === p.id ? { ...x, activo: x.activo ? 0 : 1 } : x)));
    try {
      await adminApi.actualizarProducto({ producto_id: p.id, activo: p.activo ? 0 : 1 });
    } catch (err) {
      setProductos((prev) => prev && prev.map((x) => (x.id === p.id ? { ...x, activo: p.activo } : x)));
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 12, gap: 10 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Productos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Pressable onPress={() => setCategoria("")} style={[styles.chip, { borderColor: !categoria ? tokens.cyan : tokens.border, backgroundColor: !categoria ? tokens.cyanBg : tokens.surface1 }]}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: !categoria ? tokens.cyan : tokens.textSecondary }}>Todas las categorías</Text>
          </Pressable>
          {CATEGORIAS.map((c) => {
            const active = categoria === c;
            return (
              <Pressable key={c} onPress={() => setCategoria(c)} style={[styles.chip, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? tokens.cyan : tokens.textSecondary }}>{CATEGORIA_LABEL[c]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {productos === null ? (
        <View style={{ paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={160} width="47%" radius={14} />
          ))}
        </View>
      ) : productos.length === 0 ? (
        <EmptyState icon={<StorefrontIcon size={22} color={tokens.textMuted} />} title="Sin productos" />
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item: p }) => (
            <View style={{ flex: 1, borderRadius: 14, overflow: "hidden", backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border }}>
              <View style={{ height: 100, backgroundColor: tokens.surface2 }}>
                {p.imagen && <Image source={{ uri: p.imagen }} style={[StyleSheet.absoluteFill, { opacity: p.activo ? 1 : 0.4 }]} />}
                <Pressable onPress={() => setEliminando(p)} accessibilityLabel="Ocultar producto" style={styles.hideBtn}>
                  <TrashIcon size={12} color="#fff" />
                </Pressable>
              </View>
              <View style={{ padding: 10 }}>
                <Text numberOfLines={1} style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{p.nombre}</Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: tokens.textMuted }}>{p.tienda_nombre}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <Text style={{ fontSize: 12.5, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary }}>{money(p.precio)}</Text>
                  <Pressable onPress={() => toggleActivo(p)} style={[styles.estadoPill, { backgroundColor: p.activo ? tokens.okBg : tokens.surface2 }]}>
                    <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: p.activo ? tokens.okInk : tokens.textMuted }}>{p.activo ? "Activo" : "Oculto"}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <ConfirmDialog
        visible={!!eliminando}
        title="¿Ocultar este producto?"
        description="Dejará de aparecer en la tienda, pero no se elimina permanentemente."
        danger
        confirmLabel="Ocultar"
        onCancel={() => setEliminando(null)}
        onConfirm={async () => {
          if (!eliminando) return;
          await adminApi.eliminarProducto(eliminando.id);
          setEliminando(null);
          cargar();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  hideBtn: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  estadoPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
});
