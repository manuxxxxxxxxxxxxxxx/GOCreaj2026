import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ShoppingCartIcon, TagIcon, TrashIcon, XIcon } from "phosphor-react-native";
import { Pressable } from "react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { carritoApi, cuponesApi, ApiError } from "../../lib/api";
import type { Cupon } from "../../lib/types";
import { money } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedListItem, ScreenReveal } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, total, cargando, refrescar } = useCart();
  const toast = useToast();
  const [codigo, setCodigo] = useState("");
  const [cupon, setCupon] = useState<{ cupon: Cupon; descuento: number } | null>(null);
  const [validando, setValidando] = useState(false);

  const cambiarCantidad = async (carritoId: number, delta: number, actual: number) => {
    try {
      await carritoApi.actualizar(carritoId, actual + delta);
      await refrescar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  const validarCupon = async () => {
    if (!codigo.trim()) return;
    setValidando(true);
    try {
      const r = await cuponesApi.validar(codigo.trim(), total);
      setCupon(r);
      toast.show("Cupón aplicado", "success");
    } catch (err) {
      setCupon(null);
      toast.show(err instanceof ApiError ? err.message : "Cupón inválido.", "error");
    } finally {
      setValidando(false);
    }
  };

  const totalFinal = Math.max(0, total - (cupon?.descuento ?? 0));

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Tu carrito</Text>
        <Pressable onPress={navigation.goBack} style={[styles.closeBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <XIcon size={16} color={tokens.textPrimary} />
        </Pressable>
      </View>

      {cargando && items.length === 0 ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={80} radius={14} />
          <Skeleton height={80} radius={14} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState icon={<ShoppingCartIcon size={24} color={tokens.textMuted} />} title="Tu carrito está vacío" actionLabel="Explorar tiendas" onAction={() => navigation.navigate("Tabs")} />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
            {items.map((it, idx) => (
              <AnimatedListItem key={it.id} index={idx} style={[styles.item, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 13.5, color: tokens.textPrimary }}>{it.nombre}</Text>
                  <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>{money(it.precio_efectivo)} c/u</Text>
                </View>
                <View style={[styles.stepper, { borderColor: tokens.border }]}>
                  <Pressable onPress={() => cambiarCantidad(it.id, -1, it.cantidad)} style={styles.stepBtn}>
                    <Text style={{ color: tokens.textPrimary }}>−</Text>
                  </Pressable>
                  <Text style={{ width: 20, textAlign: "center", fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary, fontSize: 12 }}>{it.cantidad}</Text>
                  <Pressable onPress={() => cambiarCantidad(it.id, 1, it.cantidad)} style={styles.stepBtn}>
                    <Text style={{ color: tokens.textPrimary }}>+</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => carritoApi.eliminar(it.id).then(refrescar)} style={{ marginLeft: 10 }}>
                  <TrashIcon size={16} color={tokens.danger} />
                </Pressable>
              </AnimatedListItem>
            ))}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <View style={[styles.couponBox, { borderColor: tokens.border, backgroundColor: tokens.surface1 }]}>
                <TagIcon size={14} color={tokens.textMuted} />
                <TextInput value={codigo} onChangeText={(v) => setCodigo(v.toUpperCase())} placeholder="Código de cupón" placeholderTextColor={tokens.textMuted} style={{ flex: 1, fontSize: 13, color: tokens.textPrimary }} />
              </View>
              <Button size="sm" variant="secondary" onPress={validarCupon} loading={validando}>
                Aplicar
              </Button>
            </View>
          </ScrollView>

          <ScreenReveal style={[styles.summary, { backgroundColor: tokens.surface1, borderColor: tokens.border, paddingBottom: insets.bottom + 16 }]}>
            <Row label="Subtotal" value={money(total)} tokens={tokens} />
            {cupon && <Row label={`Cupón ${cupon.cupon.codigo}`} value={`− ${money(cupon.descuento)}`} tokens={tokens} tone={tokens.ok} />}
            <View style={[styles.totalRow, { borderTopColor: tokens.border }]}>
              <Text style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 14, color: tokens.textPrimary }}>Total</Text>
              <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 20, fontWeight: "700", color: tokens.textPrimary }}>{money(totalFinal)}</Text>
            </View>
            <Button size="lg" hero onPress={() => navigation.navigate("Checkout", { cuponCodigo: cupon?.cupon.codigo })}>
              Continuar
            </Button>
          </ScreenReveal>
        </>
      )}
    </View>
  );
}

function Row({ label, value, tokens, tone }: { label: string; value: string; tokens: ReturnType<typeof useTheme>["tokens"]; tone?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
      <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, fontFamily: "IBMPlexMono_500Medium", color: tone ?? tokens.textSecondary }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8 },
  stepBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  couponBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12 },
  summary: { borderTopWidth: 1, padding: 20, gap: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 10, marginTop: 6, marginBottom: 14 },
});
