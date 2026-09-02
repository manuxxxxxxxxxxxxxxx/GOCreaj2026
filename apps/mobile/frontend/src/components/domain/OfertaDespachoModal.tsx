import { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { BicycleIcon, MapPinIcon, StorefrontIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { repartidorApi, ApiError } from "../../lib/api";
import { money } from "../../lib/format";
import { Button } from "../ui/Button";

type Oferta = Awaited<ReturnType<typeof repartidorApi.miOferta>>["oferta"];

const RING_SIZE = 64;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

/** Oferta individual y exclusiva del despacho automático (ver DESIGN.md "Flujo
 * logístico"): el vendedor ya no elige repartidor -- el sistema ofrece el pedido a UNO
 * solo, con una ventana muy corta para aceptar. Poll de `miOferta()` cada 2s desde
 * quien monta esto (RepartidorDisponiblesScreen) mientras el repartidor esté en línea;
 * este componente solo se encarga de mostrarla y de la cuenta regresiva visual -- la
 * expiración real la decide el backend (ver avanzar_despacho_global() en conexion.php),
 * este timer es puramente cosmético para que se sienta "vivo" mientras tanto. */
export function OfertaDespachoModal({ oferta, segundosTotales, onRespondida }: { oferta: NonNullable<Oferta>; segundosTotales: number; onRespondida: () => void }) {
  const { tokens } = useTheme();
  const toast = useToast();
  // Cuenta regresiva puramente local a partir de "segundos_restantes" que ya manda
  // calculado el servidor (TIMESTAMPDIFF contra su propio NOW()) -- así se evita parsear
  // fechas y compararlas contra el reloj del teléfono, que puede tener otra zona horaria.
  const [restante, setRestante] = useState(oferta.segundos_restantes);
  const [respondiendo, setRespondiendo] = useState<"aceptar" | "rechazar" | null>(null);
  const yaRespondio = useRef(false);

  useEffect(() => {
    yaRespondio.current = false;
    setRestante(oferta.segundos_restantes);
    const t = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [oferta.id, oferta.segundos_restantes]);

  const responder = async (decision: "aceptar" | "rechazar") => {
    if (yaRespondio.current) return;
    yaRespondio.current = true;
    setRespondiendo(decision);
    try {
      await repartidorApi.responderOferta(oferta.id, decision);
      if (decision === "aceptar") toast.show("Pedido aceptado. Dirígete a la tienda.", "success");
    } catch (err) {
      if (decision === "aceptar") toast.show(err instanceof ApiError ? err.message : "La oferta ya no está disponible.", "error");
    } finally {
      onRespondida();
    }
  };

  // Se agotó el tiempo visualmente -- el backend ya la habrá expirado solo (lo hace
  // en cada request a repartidor_dashboard.php), así que acá solo cerramos la modal.
  useEffect(() => {
    if (restante === 0 && !yaRespondio.current) {
      yaRespondio.current = true;
      onRespondida();
    }
  }, [restante, onRespondida]);

  const progreso = Math.max(0, Math.min(1, restante / segundosTotales));
  const dashOffset = RING_CIRC * (1 - progreso);
  const urgente = restante <= Math.min(4, segundosTotales / 3);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={tokens.border} strokeWidth={RING_STROKE} fill="none" />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={urgente ? tokens.danger : tokens.cyan}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation={-90}
                originX={RING_SIZE / 2}
                originY={RING_SIZE / 2}
              />
            </Svg>
            <Text style={[styles.ringText, { color: urgente ? tokens.danger : tokens.textPrimary }]}>{restante}</Text>
          </View>

          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>¡Nuevo pedido!</Text>
          <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginTop: 4, textAlign: "center" }}>{oferta.tienda_nombre ?? "Tienda"}</Text>

          <View style={{ gap: 8, width: "100%", marginTop: 16, marginBottom: 18 }}>
            <View style={styles.filaInfo}>
              <StorefrontIcon size={14} color={tokens.textMuted} />
              <Text style={{ flex: 1, fontSize: 12.5, color: tokens.textSecondary }} numberOfLines={1}>{oferta.tienda_direccion ?? "Recoger en tienda"}</Text>
            </View>
            <View style={styles.filaInfo}>
              <MapPinIcon size={14} color={tokens.textMuted} />
              <Text style={{ flex: 1, fontSize: 12.5, color: tokens.textSecondary }} numberOfLines={1}>{oferta.municipio_entrega ?? "Entrega al cliente"}</Text>
            </View>
            <View style={styles.filaInfo}>
              <BicycleIcon size={14} color={tokens.textMuted} />
              <Text style={{ flex: 1, fontSize: 12.5, color: tokens.textSecondary }}>Pedido #{oferta.numero_pedido ?? oferta.id}</Text>
              <Text style={{ fontSize: 15, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.okInk }}>+{money(oferta.ganancia_repartidor)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" fullWidth loading={respondiendo === "rechazar"} disabled={!!respondiendo} onPress={() => responder("rechazar")}>
                Rechazar
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="primary" fullWidth hero loading={respondiendo === "aceptar"} disabled={!!respondiendo} onPress={() => responder("aceptar")}>
                Aceptar
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(4,8,16,0.72)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 340, borderRadius: 24, borderWidth: 1, padding: 24, alignItems: "center" },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  ringText: { position: "absolute", fontSize: 20, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700" },
  filaInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
});
