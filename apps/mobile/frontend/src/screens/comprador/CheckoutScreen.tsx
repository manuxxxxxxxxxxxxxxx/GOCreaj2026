import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { CaretLeftIcon, CheckIcon, CreditCardIcon, CrosshairIcon, MoneyIcon, PaypalLogoIcon, PlusIcon, RocketIcon, StorefrontIcon, TruckIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { carritoApi, direccionesApi, cuponesApi, ApiError } from "../../lib/api";
import type { Cupon, DireccionUsuario, MetodoPago } from "../../lib/types";
import { money } from "../../lib/format";
import { geocodificarInverso } from "../../lib/geocoding";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { WebMapView } from "../../components/ui/WebMapView";

const SAN_SALVADOR: [number, number] = [-89.2182, 13.6929];

type Props = NativeStackScreenProps<RootStackParamList, "Checkout">;
type MetodoUI = "efectivo" | "tarjeta" | "paypal";

export function CheckoutScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, total, cargando: cargandoCart, refrescar } = useCart();
  const toast = useToast();

  const [direcciones, setDirecciones] = useState<DireccionUsuario[] | null>(null);
  const [direccionId, setDireccionId] = useState<number | null>(null);
  const [modoDireccion, setModoDireccion] = useState<"guardada" | "mapa">("guardada");
  const [mapaCoords, setMapaCoords] = useState<[number, number] | null>(null);
  const [mapaDireccion, setMapaDireccion] = useState("");
  const [mapaMunicipio, setMapaMunicipio] = useState("");
  const [mapaDepartamento, setMapaDepartamento] = useState("");
  const [mapaReferencia, setMapaReferencia] = useState("");
  const [ubicando, setUbicando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [guardarUbicacion, setGuardarUbicacion] = useState(false);
  const [guardarAlias, setGuardarAlias] = useState("");
  const [metodosGuardados, setMetodosGuardados] = useState<MetodoPago[]>([]);
  const [metodo, setMetodo] = useState<MetodoUI>("efectivo");
  const [tipoEntrega, setTipoEntrega] = useState<"domicilio" | "recogida">("domicilio");
  const [envioModo, setEnvioModo] = useState<"estandar" | "express">("estandar");
  const [notas, setNotas] = useState("");
  const [metodoPagoId, setMetodoPagoId] = useState<number | null>(null);
  const [tarjetaNumero, setTarjetaNumero] = useState("");
  const [tarjetaExp, setTarjetaExp] = useState("");
  const [tarjetaCvv, setTarjetaCvv] = useState("");
  const [guardarTarjeta, setGuardarTarjeta] = useState(false);
  const [paypal2fa, setPaypal2fa] = useState("");
  const [efectivoPagaCon, setEfectivoPagaCon] = useState("");
  const [cupon, setCupon] = useState<{ cupon: Cupon; descuento: number } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    direccionesApi.listar().then((r) => {
      setDirecciones(r.direcciones);
      const principal = r.direcciones.find((d) => d.es_principal) ?? r.direcciones[0];
      if (principal) setDireccionId(principal.id);
      else setModoDireccion("mapa");
    });
    carritoApi.metodosListar().then((r) => setMetodosGuardados(r.metodos));
    if (route.params?.cuponCodigo) {
      cuponesApi.validar(route.params.cuponCodigo, total).then(setCupon).catch(() => {});
    }
  }, []);

  // El carrito puede tardar un tick en hidratarse desde CartContext al montar esta
  // pantalla -- sin esperar a cargandoCart, un usuario que llegó con el carrito recién
  // vaciado (o directo por deep link) vería el checkout roto en vez de volver al carrito.
  useEffect(() => {
    if (!cargandoCart && items.length === 0) navigation.replace("Cart");
  }, [cargandoCart, items.length, navigation]);

  const direccion = direcciones?.find((d) => d.id === direccionId) ?? null;
  const esRecogida = tipoEntrega === "recogida";
  const usaMapa = !esRecogida && modoDireccion === "mapa";
  const direccionListaLista = esRecogida || (usaMapa ? !!mapaCoords && !!mapaDireccion.trim() && !!mapaMunicipio.trim() : !!direccion);
  const costoEnvio = esRecogida ? 0 : envioModo === "express" ? 4.99 : 2.5;
  const descuento = cupon?.descuento ?? 0;
  const totalFinal = Math.max(0, total - descuento) + costoEnvio;
  const PICKUP_EFECTIVO_MAX = 20;
  const recogidaEfectivoBloqueado = esRecogida && metodo === "efectivo" && totalFinal > PICKUP_EFECTIVO_MAX;

  const elegirEnMapa = async (c: [number, number]) => {
    setMapaCoords(c);
    setUbicando(true);
    try {
      const r = await geocodificarInverso(c[1], c[0]);
      if (r.direccion) setMapaDireccion(r.direccion);
      if (r.municipio) setMapaMunicipio(r.municipio);
      if (r.departamento) setMapaDepartamento(r.departamento);
      toast.show("Ubicación detectada", "success");
    } catch {
      toast.show("No se pudo detectar la calle — puedes escribirla manualmente.", "warning");
    } finally {
      setUbicando(false);
    }
  };

  const usarMiUbicacion = async () => {
    setLocalizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return toast.show("Necesitamos permiso de ubicación.", "warning");
      const pos = await Location.getCurrentPositionAsync({});
      await elegirEnMapa([pos.coords.longitude, pos.coords.latitude]);
    } catch {
      toast.show("No se pudo obtener tu ubicación.", "error");
    } finally {
      setLocalizando(false);
    }
  };

  const confirmar = async () => {
    if (!esRecogida && !direccionListaLista) return toast.show(usaMapa ? "Marca tu ubicación en el mapa y completa la dirección." : "Selecciona una dirección de entrega.", "warning");
    if (recogidaEfectivoBloqueado) return toast.show(`Para recoger en tienda, pedidos de más de $${PICKUP_EFECTIVO_MAX} deben pagarse con tarjeta.`, "warning");
    if (metodo === "tarjeta" && !metodoPagoId) {
      const numero = tarjetaNumero.replace(/\D/g, "");
      if (numero.length < 13 || tarjetaCvv.length < 3 || !/^\d{2}\/\d{2}$/.test(tarjetaExp)) return toast.show("Revisa los datos de la tarjeta.", "warning");
    }
    if (metodo === "paypal" && !paypal2fa.trim()) return toast.show("Ingresa el código 2FA de PayPal.", "warning");

    setEnviando(true);
    try {
      const res = await carritoApi.checkout({
        metodo_pago: metodo,
        tipo_entrega: tipoEntrega,
        direccion_entrega: esRecogida
          ? undefined
          : usaMapa
            ? `${mapaDireccion.trim()}${mapaReferencia.trim() ? ", " + mapaReferencia.trim() : ""}`
            : `${direccion!.direccion}${direccion!.referencia ? ", " + direccion!.referencia : ""}`,
        lat: esRecogida ? undefined : usaMapa ? mapaCoords?.[1] : direccion?.lat ?? undefined,
        lng: esRecogida ? undefined : usaMapa ? mapaCoords?.[0] : direccion?.lng ?? undefined,
        municipio: esRecogida ? undefined : usaMapa ? mapaMunicipio.trim() : direccion?.municipio,
        departamento: esRecogida ? undefined : usaMapa ? mapaDepartamento.trim() || undefined : direccion?.departamento,
        metodo_pago_id: metodoPagoId ?? undefined,
        tarjeta_numero: metodo === "tarjeta" && !metodoPagoId ? tarjetaNumero : undefined,
        tarjeta_cvv: metodo === "tarjeta" && !metodoPagoId ? tarjetaCvv : undefined,
        tarjeta_exp: metodo === "tarjeta" && !metodoPagoId ? tarjetaExp : undefined,
        guardar_tarjeta: metodo === "tarjeta" && !metodoPagoId ? guardarTarjeta : undefined,
        paypal_codigo_2fa: metodo === "paypal" ? paypal2fa : undefined,
        efectivo_paga_con: metodo === "efectivo" && efectivoPagaCon ? Number(efectivoPagaCon) : undefined,
        envio_modo: envioModo,
        cupon_codigo: cupon?.cupon.codigo,
        notas: notas.trim() || undefined,
      });
      if (usaMapa && guardarUbicacion) {
        direccionesApi
          .crear({
            alias: guardarAlias.trim() || `Ubicación ${(direcciones?.length ?? 0) + 1}`,
            municipio: mapaMunicipio.trim(),
            direccion: mapaDireccion.trim(),
            referencia: mapaReferencia.trim() || null,
            departamento: mapaDepartamento.trim() || "San Salvador",
            lat: mapaCoords?.[1] ?? null,
            lng: mapaCoords?.[0] ?? null,
            es_principal: 0,
          })
          .catch(() => {});
      }
      await refrescar();
      const numero = res.numeros_pedido?.[0];
      toast.show(numero ? `¡Pedido #${numero} realizado con éxito!` : "Pedido realizado con éxito", "success");
      navigation.replace("OrderDetail", { id: res.pedidos[0], recienCreado: true, totalPedidos: res.pedidos.length });
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar el pedido.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, paddingTop: insets.top }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: items.length ? 20 : 60, gap: 22 }}>
        <View>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Entrega</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <OptionCard active={tipoEntrega === "domicilio" && envioModo === "estandar"} onPress={() => { setTipoEntrega("domicilio"); setEnvioModo("estandar"); }} icon={<TruckIcon size={18} color={tipoEntrega === "domicilio" && envioModo === "estandar" ? tokens.cyan : tokens.textPrimary} />} title="Estándar" subtitle={money(2.5)} tokens={tokens} />
            <OptionCard active={tipoEntrega === "domicilio" && envioModo === "express"} onPress={() => { setTipoEntrega("domicilio"); setEnvioModo("express"); }} icon={<RocketIcon size={18} color={tipoEntrega === "domicilio" && envioModo === "express" ? tokens.cyan : tokens.textPrimary} />} title="Express" subtitle={money(4.99)} tokens={tokens} />
            <OptionCard active={esRecogida} onPress={() => setTipoEntrega("recogida")} icon={<StorefrontIcon size={18} color={esRecogida ? tokens.cyan : tokens.textPrimary} />} title="Recoger" subtitle="En tienda" tokens={tokens} />
          </View>
        </View>

        {esRecogida ? (
          <View style={[styles.optionRow, { borderColor: tokens.border, backgroundColor: tokens.surface1 }]}>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary, marginBottom: 4 }}>Recoges tú mismo en la tienda</Text>
            <Text style={{ fontSize: 12, color: tokens.textSecondary }}>Sin costo de envío. La tienda te avisará cuando esté listo, con un código para confirmar la recogida.</Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Dirección de entrega</Text>
            {direcciones === null ? (
              <Skeleton height={70} radius={12} />
            ) : (
              <>
                {direcciones.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                    <ModoTab active={modoDireccion === "guardada"} label="Mis direcciones" onPress={() => setModoDireccion("guardada")} tokens={tokens} />
                    <ModoTab active={modoDireccion === "mapa"} label="Nueva ubicación" onPress={() => setModoDireccion("mapa")} tokens={tokens} />
                  </View>
                )}

                {modoDireccion === "guardada" && direcciones.length > 0 && (
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

                {usaMapa && (
                  <View style={{ gap: 12 }}>
                    <View style={{ height: 180, borderRadius: 14, borderWidth: 1, borderColor: tokens.border, overflow: "hidden" }}>
                      <WebMapView
                        center={mapaCoords ?? SAN_SALVADOR}
                        zoom={mapaCoords ? 16 : 12}
                        onPress={elegirEnMapa}
                        markers={mapaCoords ? [{ id: "pin", coordinate: mapaCoords, color: tokens.cyan }] : []}
                      />
                      <Pressable
                        onPress={usarMiUbicacion}
                        style={{ position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border }}
                      >
                        <CrosshairIcon size={16} color={localizando ? tokens.textMuted : tokens.cyan} />
                      </Pressable>
                    </View>
                    <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: -6 }}>
                      {ubicando ? "Detectando la calle…" : "Toca el mapa para marcar el punto exacto de entrega."}
                    </Text>
                    <Input label="Dirección" value={mapaDireccion} onChangeText={setMapaDireccion} placeholder="Calle, avenida, número" />
                    <Input label="Municipio" value={mapaMunicipio} onChangeText={setMapaMunicipio} placeholder="San Salvador" />
                    <Input label="Referencia (opcional)" value={mapaReferencia} onChangeText={setMapaReferencia} placeholder="Casa color celeste, portón negro" />
                    <Pressable onPress={() => setGuardarUbicacion((v) => !v)} style={styles.checkboxRow}>
                      <View style={[styles.checkbox, { borderColor: guardarUbicacion ? tokens.cyan : tokens.border, backgroundColor: guardarUbicacion ? tokens.cyan : "transparent" }]}>
                        {guardarUbicacion && <CheckIcon size={12} weight="bold" color={tokens.cyanInk} />}
                      </View>
                      <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Guardar esta ubicación en mis direcciones</Text>
                    </Pressable>
                    {guardarUbicacion && <Input label="Alias" value={guardarAlias} onChangeText={setGuardarAlias} placeholder={`Casa, Trabajo… (vacío = Ubicación ${(direcciones?.length ?? 0) + 1})`} />}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View>
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>Método de pago</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <OptionCard active={metodo === "efectivo"} onPress={() => setMetodo("efectivo")} icon={<MoneyIcon size={18} color={metodo === "efectivo" ? tokens.cyan : tokens.textPrimary} />} title="Efectivo" subtitle={esRecogida ? "Hasta $20" : "Contra entrega"} tokens={tokens} />
            <OptionCard active={metodo === "tarjeta"} onPress={() => setMetodo("tarjeta")} icon={<CreditCardIcon size={18} color={metodo === "tarjeta" ? tokens.cyan : tokens.textPrimary} />} title="Tarjeta" subtitle="Crédito/débito" tokens={tokens} />
            <OptionCard active={metodo === "paypal"} onPress={() => setMetodo("paypal")} icon={<PaypalLogoIcon size={18} color={metodo === "paypal" ? tokens.cyan : tokens.textPrimary} />} title="PayPal" subtitle="Con 2FA" tokens={tokens} />
          </View>

          {recogidaEfectivoBloqueado && (
            <Text style={{ fontSize: 12, color: tokens.danger, marginBottom: 12 }}>
              Para recoger en tienda, los pedidos de más de ${PICKUP_EFECTIVO_MAX} deben pagarse con tarjeta.
            </Text>
          )}

          {metodo === "efectivo" && !esRecogida && <Input label="¿Con cuánto pagas? (opcional)" value={efectivoPagaCon} onChangeText={setEfectivoPagaCon} keyboardType="decimal-pad" placeholder={money(totalFinal)} hint="Así el repartidor lleva tu cambio listo." />}

          {metodo === "tarjeta" && (
            <View style={{ gap: 12 }}>
              {metodosGuardados.map((m) => (
                <Pressable key={m.id} onPress={() => setMetodoPagoId(m.id)} style={[styles.optionRow, { flexDirection: "row", alignItems: "center", borderColor: metodoPagoId === m.id ? tokens.cyan : tokens.border }]}>
                  <Text style={{ flex: 1, fontSize: 13, color: tokens.textPrimary, textTransform: "capitalize" }}>
                    {m.marca} •••• {m.ultimos4}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: "IBMPlexMono_500Medium", color: tokens.textMuted }}>
                    {String(m.exp_mes).padStart(2, "0")}/{String(m.exp_anio).slice(-2)}
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
                  <Pressable onPress={() => setGuardarTarjeta((v) => !v)} style={styles.checkboxRow}>
                    <View style={[styles.checkbox, { borderColor: guardarTarjeta ? tokens.cyan : tokens.border, backgroundColor: guardarTarjeta ? tokens.cyan : "transparent" }]}>
                      {guardarTarjeta && <CheckIcon size={12} weight="bold" color={tokens.cyanInk} />}
                    </View>
                    <Text style={{ fontSize: 13, color: tokens.textSecondary }}>Guardar esta tarjeta para la próxima</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {metodo === "paypal" && <Input label="Código 2FA de PayPal" value={paypal2fa} onChangeText={setPaypal2fa} keyboardType="number-pad" placeholder="123456" />}
        </View>

        <Input
          label="Notas para el pedido (opcional)"
          value={notas}
          onChangeText={setNotas}
          placeholder={esRecogida ? "Ej. Llego en carro rojo, avísame por chat" : "Ej. Sin cebolla, tocar el timbre"}
          multiline
        />
      </ScrollView>

      <View style={[styles.summary, { backgroundColor: tokens.surface1, borderColor: tokens.border, paddingBottom: insets.bottom + 16 }]}>
        <SummaryRow label="Subtotal" value={money(total)} tokens={tokens} />
        {cupon && <SummaryRow label={`Cupón ${cupon.cupon.codigo}`} value={`− ${money(descuento)}`} tone={tokens.okInk} tokens={tokens} />}
        <SummaryRow label="Envío" value={esRecogida ? "Gratis" : money(costoEnvio)} tokens={tokens} />
        <View style={styles.totalRow}>
          <Text style={{ fontFamily: "SpaceGrotesk_600SemiBold", fontSize: 14, color: tokens.textPrimary }}>Total</Text>
          <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontSize: 20, fontWeight: "700", color: tokens.textPrimary }}>{money(totalFinal)}</Text>
        </View>
        <Button size="lg" hero onPress={confirmar} loading={enviando} disabled={items.length === 0 || recogidaEfectivoBloqueado}>
          Confirmar pedido
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, tone, tokens }: { label: string; value: string; tone?: string; tokens: ReturnType<typeof useTheme>["tokens"] }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
      <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, fontFamily: tone ? "Inter_700Bold" : "IBMPlexMono_500Medium", color: tone ?? tokens.textSecondary }}>{value}</Text>
    </View>
  );
}

function ModoTab({ active, label, onPress, tokens }: { active: boolean; label: string; onPress: () => void; tokens: ReturnType<typeof useTheme>["tokens"] }) {
  return (
    <Pressable onPress={onPress} style={[styles.modoTab, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}>
      <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: active ? tokens.cyan : tokens.textSecondary }}>{label}</Text>
    </Pressable>
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
  modoTab: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  optionCard: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1 },
  summary: { borderTopWidth: 1, padding: 20 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingTop: 8 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
