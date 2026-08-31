import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowRightIcon, ShoppingCartIcon, StorefrontIcon, TagIcon, TrashIcon, TrashSimpleIcon, WarningCircleIcon, XIcon } from "phosphor-react-native";
import { Pressable } from "react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { carritoApi, cuponesApi, ApiError } from "../../lib/api";
import type { CarritoItem, Cupon } from "../../lib/types";
import { money } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AnimatedListItem, ScreenReveal } from "../../components/ui/Motion";

const STOCK_BAJO = 5;

type Props = NativeStackScreenProps<RootStackParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, total, cargando, refrescar } = useCart();
  const toast = useToast();
  const [codigo, setCodigo] = useState("");
  const [cupon, setCupon] = useState<{ cupon: Cupon; descuento: number } | null>(null);
  const [validando, setValidando] = useState(false);
  const [vaciando, setVaciando] = useState(false);
  const [confirmandoVaciar, setConfirmandoVaciar] = useState(false);

  const cambiarCantidad = async (carritoId: number, delta: number, actual: number) => {
    try {
      await carritoApi.actualizar(carritoId, actual + delta);
      await refrescar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  const vaciarCarrito = async () => {
    setVaciando(true);
    try {
      await Promise.all(items.map((it) => carritoApi.eliminar(it.id)));
      await refrescar();
      setConfirmandoVaciar(false);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo vaciar el carrito.", "error");
    } finally {
      setVaciando(false);
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

  const quitarCupon = () => {
    setCupon(null);
    setCodigo("");
  };

  const porTienda = items.reduce<Record<string, CarritoItem[]>>((acc, it) => {
    (acc[it.tienda_nombre] ??= []).push(it);
    return acc;
  }, {});
  const tiendas = Object.entries(porTienda);
  const hayAgotados = items.some((it) => it.estado_stock === "agotado" || it.stock <= 0);
  const totalFinal = Math.max(0, total - (cupon?.descuento ?? 0));

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Tu carrito</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          {items.length > 0 && (
            <Pressable onPress={() => setConfirmandoVaciar(true)} hitSlop={8}>
              <TrashSimpleIcon size={18} color={tokens.danger} />
            </Pressable>
          )}
          <Pressable onPress={navigation.goBack} style={[styles.closeBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
            <XIcon size={16} color={tokens.textPrimary} />
          </Pressable>
        </View>
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
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {tiendas.map(([tiendaNombre, tiendaItems]) => {
              const subtotalTienda = tiendaItems.reduce((acc, it) => acc + it.precio_efectivo * it.cantidad, 0);
              return (
                <View key={tiendaNombre} style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <StorefrontIcon size={13} color={tokens.textMuted} />
                      <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.textMuted }}>{tiendaNombre}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: "IBMPlexMono_500Medium", color: tokens.textMuted }}>{money(subtotalTienda)}</Text>
                  </View>

                  {tiendaItems.map((it, idx) => {
                    const agotado = it.estado_stock === "agotado" || it.stock <= 0;
                    const enOferta = !!it.precio_oferta && it.precio_oferta > 0 && it.precio_oferta < it.precio;
                    const stockBajo = !agotado && it.stock <= STOCK_BAJO;
                    return (
                      <AnimatedListItem
                        key={it.id}
                        index={idx}
                        style={[styles.item, { backgroundColor: tokens.surface1, borderColor: agotado ? tokens.danger : tokens.border, opacity: agotado ? 0.7 : 1 }]}
                      >
                        <View style={[styles.thumb, { backgroundColor: tokens.surface2 }]}>{it.imagen && <Image source={{ uri: it.imagen }} style={StyleSheet.absoluteFill} />}</View>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 13.5, color: tokens.textPrimary }}>{it.nombre}</Text>
                          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                            <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 12, color: enOferta ? tokens.danger : tokens.textSecondary, fontWeight: enOferta ? "700" : "400" }}>
                              {money(it.precio_efectivo)} c/u
                            </Text>
                            {enOferta && (
                              <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 11, color: tokens.textMuted, textDecorationLine: "line-through" }}>{money(it.precio)}</Text>
                            )}
                          </View>
                          {agotado ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <WarningCircleIcon size={11} weight="bold" color={tokens.danger} />
                              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.danger }}>Sin stock — elimínalo</Text>
                            </View>
                          ) : stockBajo ? (
                            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.warn, marginTop: 2 }}>¡Solo quedan {it.stock}!</Text>
                          ) : null}
                        </View>
                        <View style={[styles.stepper, { borderColor: tokens.border }]}>
                          {it.cantidad <= 1 ? (
                            <Pressable onPress={() => carritoApi.eliminar(it.id).then(refrescar)} style={styles.stepBtn}>
                              <TrashIcon size={13} color={tokens.danger} />
                            </Pressable>
                          ) : (
                            <Pressable onPress={() => cambiarCantidad(it.id, -1, it.cantidad)} style={styles.stepBtn}>
                              <Text style={{ color: tokens.textPrimary }}>−</Text>
                            </Pressable>
                          )}
                          <Text style={{ width: 20, textAlign: "center", fontFamily: "IBMPlexMono_500Medium", color: tokens.textPrimary, fontSize: 12 }}>{it.cantidad}</Text>
                          <Pressable onPress={() => cambiarCantidad(it.id, 1, it.cantidad)} disabled={agotado || it.cantidad >= it.stock} style={[styles.stepBtn, (agotado || it.cantidad >= it.stock) && { opacity: 0.35 }]}>
                            <Text style={{ color: tokens.textPrimary }}>+</Text>
                          </Pressable>
                        </View>
                        <Pressable onPress={() => carritoApi.eliminar(it.id).then(refrescar)} style={{ marginLeft: 10 }}>
                          <TrashIcon size={16} color={tokens.textMuted} />
                        </Pressable>
                      </AnimatedListItem>
                    );
                  })}
                </View>
              );
            })}

            {cupon ? (
              <View style={[styles.couponApplied, { backgroundColor: tokens.okBg }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <TagIcon size={14} color={tokens.okInk} />
                  <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.okInk }}>{cupon.cupon.codigo}</Text>
                </View>
                <Pressable onPress={quitarCupon} hitSlop={8}>
                  <XIcon size={14} color={tokens.okInk} />
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={[styles.couponBox, { borderColor: tokens.border, backgroundColor: tokens.surface1 }]}>
                  <TagIcon size={14} color={tokens.textMuted} />
                  <TextInput value={codigo} onChangeText={(v) => setCodigo(v.toUpperCase())} placeholder="Código de cupón" placeholderTextColor={tokens.textMuted} style={{ flex: 1, fontSize: 13, color: tokens.textPrimary }} />
                </View>
                <Button size="sm" variant="secondary" onPress={validarCupon} loading={validando}>
                  Aplicar
                </Button>
              </View>
            )}
          </ScrollView>

          <ScreenReveal style={[styles.summary, { backgroundColor: tokens.surface1, borderColor: tokens.border, paddingBottom: insets.bottom + 16 }]}>
            <Row label="Subtotal" value={money(total)} tokens={tokens} />
            {cupon && <Row label={`Cupón ${cupon.cupon.codigo}`} value={`− ${money(cupon.descuento)}`} tokens={tokens} tone={tokens.ok} />}
            <Row label="Envío" value={tiendas.length > 1 ? `${tiendas.length} tiendas` : "En el checkout"} tokens={tokens} muted />
            <View style={[styles.totalRow, { borderTopColor: tokens.border }]}>
              <Text style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 14, color: tokens.textPrimary }}>Total</Text>
              <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 20, fontWeight: "700", color: tokens.textPrimary }}>{money(totalFinal)}</Text>
            </View>
            {hayAgotados && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 }}>
                <WarningCircleIcon size={13} weight="bold" color={tokens.danger} />
                <Text style={{ fontSize: 11.5, color: tokens.danger, flex: 1 }}>Elimina los productos sin stock para continuar.</Text>
              </View>
            )}
            <Button size="lg" hero disabled={hayAgotados} icon={<ArrowRightIcon size={16} color={tokens.cyanInk} />} onPress={() => navigation.navigate("Checkout", { cuponCodigo: cupon?.cupon.codigo })}>
              Continuar
            </Button>
          </ScreenReveal>
        </>
      )}

      <ConfirmDialog
        visible={confirmandoVaciar}
        title="¿Vaciar el carrito?"
        description="Se eliminarán todos los productos de tu carrito."
        confirmLabel="Vaciar carrito"
        danger
        loading={vaciando}
        onCancel={() => setConfirmandoVaciar(false)}
        onConfirm={vaciarCarrito}
      />
    </View>
  );
}

function Row({ label, value, tokens, tone, muted }: { label: string; value: string; tokens: ReturnType<typeof useTheme>["tokens"]; tone?: string; muted?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>
      <Text style={{ fontSize: 13, color: muted ? tokens.textMuted : tokens.textSecondary, flexShrink: 0 }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: "right", fontSize: 13, fontFamily: "IBMPlexMono_500Medium", color: tone ?? (muted ? tokens.textMuted : tokens.textSecondary) }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  item: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1 },
  thumb: { width: 44, height: 44, borderRadius: 10, overflow: "hidden", marginRight: 10, flexShrink: 0 },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8 },
  stepBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  couponBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12 },
  couponApplied: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 40, borderRadius: 10, paddingHorizontal: 12 },
  summary: { borderTopWidth: 1, padding: 20, gap: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 10, marginTop: 6, marginBottom: 14 },
});
