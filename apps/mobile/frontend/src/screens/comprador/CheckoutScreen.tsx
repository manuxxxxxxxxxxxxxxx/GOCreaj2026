import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, CreditCardIcon, MoneyIcon, PlusIcon, RocketIcon, TruckIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { carritoApi, direccionesApi, cuponesApi, ApiError } from "../../lib/api";
import type { Cupon, DireccionUsuario, MetodoPago } from "../../lib/types";
import { money } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;
type MetodoUI = "efectivo" | "tarjeta" | "paypal";

export function CheckoutScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, total, refrescar } = useCart();
  const toast = useToast();

  const [direcciones, setDirecciones] = useState<DireccionUsuario[] | null>(null);
  const [direccionId, setDireccionId] = useState<number | null>(null);
  const [metodosGuardados, setMetodosGuardados] = useState<MetodoPago[]>([]);
  const [metodo, setMetodo] = useState<MetodoUI>("efectivo");
  const [envioModo, setEnvioModo] = useState<"estandar" | "express">("estandar");
  const [metodoPagoId, setMetodoPagoId] = useState<number | null>(null);
  const [tarjetaNumero, setTarjetaNumero] = useState("");
  const [tarjetaExp, setTarjetaExp] = useState("");
  const [tarjetaCvv, setTarjetaCvv] = useState("");
  const [paypal2fa, setPaypal2fa] = useState("");
  const [efectivoPagaCon, setEfectivoPagaCon] = useState("");
  const [cupon, setCupon] = useState<{ cupon: Cupon; descuento: number } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    direccionesApi.listar().then((r) => {
      setDirecciones(r.direcciones);
      const principal = r.direcciones.find((d) => d.es_principal) ?? r.direcciones[0];
      if (principal) setDireccionId(principal.id);
    });
    carritoApi.metodosListar().then((r) => setMetodosGuardados(r.metodos));
    if (route.params?.cuponCodigo) {
      cuponesApi.validar(route.params.cuponCodigo, total).then(setCupon).catch(() => {});
    }
  }, []);

  const direccion = direcciones?.find((d) => d.id === direccionId) ?? null;
  const costoEnvio = envioModo === "express" ? 4.99 : 2.5;
  const descuento = cupon?.descuento ?? 0;
  const totalFinal = Math.max(0, total - descuento) + costoEnvio;

  const confirmar = async () => {
    if (!direccion) return toast.show("Selecciona una dirección de entrega.", "warning");
    if (metodo === "tarjeta" && !metodoPagoId) {
      const numero = tarjetaNumero.replace(/\D/g, "");
      if (numero.length < 13 || tarjetaCvv.length < 3 || !/^\d{2}\/\d{2}$/.test(tarjetaExp)) return toast.show("Revisa los datos de la tarjeta.", "warning");
    }
    if (metodo === "paypal" && !paypal2fa.trim()) return toast.show("Ingresa el código 2FA de PayPal.", "warning");

    setEnviando(true);
    try {
      const res = await carritoApi.checkout({
        metodo_pago: metodo,
        direccion_entrega: `${direccion.direccion}${direccion.referencia ? ", " + direccion.referencia : ""}`,
        lat: direccion.lat ?? undefined,
        lng: direccion.lng ?? undefined,
        municipio: direccion.municipio,
        departamento: direccion.departamento,
        metodo_pago_id: metodoPagoId ?? undefined,
        tarjeta_numero: metodo === "tarjeta" && !metodoPagoId ? tarjetaNumero : undefined,
        tarjeta_cvv: metodo === "tarjeta" && !metodoPagoId ? tarjetaCvv : undefined,
        tarjeta_exp: metodo === "tarjeta" && !metodoPagoId ? tarjetaExp : undefined,
        paypal_codigo_2fa: metodo === "paypal" ? paypal2fa : undefined,
        efectivo_paga_con: metodo === "efectivo" && efectivoPagaCon ? Number(efectivoPagaCon) : undefined,
        envio_modo: envioModo,
        cupon_codigo: cupon?.cupon.codigo,
      });
      await refrescar();
      toast.show("Pedido realizado con éxito", "success");
      navigation.replace("OrderDetail", { id: res.pedidos[0] });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar el pedido.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: items.length ? 20 : 60, gap: 22 }}>
        <View>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Dirección de entrega</Text>
          {direcciones === null ? (
            <Skeleton height={70} radius={12} />
          ) : direcciones.length === 0 ? (
            <Pressable onPress={() => navigation.navigate("Direcciones")}>
              <Text style={{ color: tokens.cyan, fontFamily: "Inter_700Bold", fontSize: 13 }}>+ Agregar una dirección</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 8 }}>
              {direcciones.map((d) => (
                <Pressable key={d.id} onPress={() => setDireccionId(d.id)} style={[styles.optionRow, { borderColor: direccionId === d.id ? tokens.cyan : tokens.border, backgroundColor: direccionId === d.id ? tokens.cyanBg : tokens.surface1 }]}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>{d.alias}</Text>
                  <Text style={{ fontSize: 12, color: tokens.textSecondary }}>
                    {d.direccion}, {d.municipio}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Modo de envío</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <OptionCard active={envioModo === "estandar"} onPress={() => setEnvioModo("estandar")} icon={<TruckIcon size={18} color={envioModo === "estandar" ? tokens.cyan : tokens.textPrimary} />} title="Estándar" subtitle={money(2.5)} tokens={tokens} />
            <OptionCard active={envioModo === "express"} onPress={() => setEnvioModo("express")} icon={<RocketIcon size={18} color={envioModo === "express" ? tokens.cyan : tokens.textPrimary} />} title="Express" subtitle={money(4.99)} tokens={tokens} />
          </View>
        </View>

        <View>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Método de pago</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <OptionCard active={metodo === "efectivo"} onPress={() => setMetodo("efectivo")} icon={<MoneyIcon size={18} color={metodo === "efectivo" ? tokens.cyan : tokens.textPrimary} />} title="Efectivo" subtitle="Contra entrega" tokens={tokens} />
            <OptionCard active={metodo === "tarjeta"} onPress={() => setMetodo("tarjeta")} icon={<CreditCardIcon size={18} color={metodo === "tarjeta" ? tokens.cyan : tokens.textPrimary} />} title="Tarjeta" subtitle="Crédito/débito" tokens={tokens} />
            <OptionCard active={metodo === "paypal"} onPress={() => setMetodo("paypal")} icon={<CreditCardIcon size={18} color={metodo === "paypal" ? tokens.cyan : tokens.textPrimary} />} title="PayPal" subtitle="Con 2FA" tokens={tokens} />
          </View>

          {metodo === "efectivo" && <Input label="¿Con cuánto pagas? (opcional)" value={efectivoPagaCon} onChangeText={setEfectivoPagaCon} keyboardType="decimal-pad" placeholder={money(totalFinal)} hint="Así el repartidor lleva tu cambio listo." />}

          {metodo === "tarjeta" && (
            <View style={{ gap: 12 }}>
              {metodosGuardados.map((m) => (
                <Pressable key={m.id} onPress={() => setMetodoPagoId(m.id)} style={[styles.optionRow, { borderColor: metodoPagoId === m.id ? tokens.cyan : tokens.border }]}>
                  <Text style={{ fontSize: 13, color: tokens.textPrimary, textTransform: "capitalize" }}>
                    {m.marca} •••• {m.ultimos4}
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setMetodoPagoId(null)} style={[styles.optionRow, { flexDirection: "row", alignItems: "center", gap: 8, borderColor: metodoPagoId === null ? tokens.cyan : tokens.border }]}>
                <PlusIcon size={14} color={tokens.textPrimary} />
                <Text style={{ fontSize: 13, color: tokens.textPrimary }}>Usar una tarjeta nueva</Text>
              </Pressable>
              {metodoPagoId === null && (
                <>
                  <Input label="Número de tarjeta" value={tarjetaNumero} onChangeText={setTarjetaNumero} keyboardType="number-pad" placeholder="4242 4242 4242 4242" />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Input label="Vencimiento" value={tarjetaExp} onChangeText={setTarjetaExp} placeholder="MM/AA" style={{ flex: 1 }} />
                    <Input label="CVV" value={tarjetaCvv} onChangeText={setTarjetaCvv} keyboardType="number-pad" placeholder="123" style={{ flex: 1 }} />
                  </View>
                </>
              )}
            </View>
          )}

          {metodo === "paypal" && <Input label="Código 2FA de PayPal" value={paypal2fa} onChangeText={setPaypal2fa} keyboardType="number-pad" placeholder="123456" />}
        </View>
      </ScrollView>

      <View style={[styles.summary, { backgroundColor: tokens.surface1, borderColor: tokens.border, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.totalRow}>
          <Text style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 14, color: tokens.textPrimary }}>Total</Text>
          <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 20, fontWeight: "700", color: tokens.textPrimary }}>{money(totalFinal)}</Text>
        </View>
        <Button size="lg" hero onPress={confirmar} loading={enviando}>
          Confirmar pedido
        </Button>
      </View>
    </View>
  );
}

function OptionCard({ active, onPress, icon, title, subtitle, tokens }: { active: boolean; onPress: () => void; icon: React.ReactNode; title: string; subtitle: string; tokens: ReturnType<typeof useTheme>["tokens"] }) {
  return (
    <Pressable onPress={onPress} style={[styles.optionCard, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}>
      {icon}
      <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: active ? tokens.cyan : tokens.textPrimary, marginTop: 4 }}>{title}</Text>
      <Text style={{ fontSize: 10.5, fontFamily: "IBMPlexMono_500Medium", color: tokens.textMuted }}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", marginBottom: 10 },
  optionRow: { padding: 12, borderRadius: 12, borderWidth: 1 },
  optionCard: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1 },
  summary: { borderTopWidth: 1, padding: 20 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
});
