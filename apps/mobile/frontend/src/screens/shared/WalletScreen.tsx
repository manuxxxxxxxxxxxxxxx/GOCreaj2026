import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowDownIcon, ArrowUpIcon, CaretLeftIcon, WalletIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { walletApi, ApiError } from "../../lib/api";
import type { Retiro, WalletMovimiento } from "../../lib/types";
import { money, formatDateTime } from "../../lib/format";
import { GlowBackground } from "../../components/ui/GlowBackground";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Sheet } from "../../components/ui/Sheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedListItem, ScreenReveal } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "Wallet">;

const LABELS: Record<WalletMovimiento["tipo"], string> = {
  venta: "Venta",
  entrega: "Entrega completada",
  reembolso: "Reembolso",
  retiro_solicitado: "Retiro solicitado",
  retiro_rechazado: "Retiro rechazado",
};

export function WalletScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [saldo, setSaldo] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<WalletMovimiento[]>([]);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [retiroOpen, setRetiroOpen] = useState(false);

  const cargar = () => {
    walletApi.saldo().then((r) => {
      setSaldo(r.saldo);
      setMovimientos(r.movimientos);
    });
    walletApi.misRetiros().then((r) => setRetiros(r.retiros)).catch(() => {});
  };

  useEffect(cargar, []);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Billetera</Text>
      </View>

      <FlatList
        data={movimientos}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: 60 }}
        ListHeaderComponent={
          <View>
            <ScreenReveal style={{ position: "relative", borderRadius: 20, overflow: "hidden", padding: 22, marginBottom: 18, borderWidth: 1, borderColor: tokens.border }}>
              <GlowBackground />
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tokens.textMuted, textTransform: "uppercase" }}>Saldo disponible</Text>
              {saldo === null ? <Skeleton height={36} width={140} /> : <Text style={{ fontSize: 30, fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary, marginTop: 4 }}>{money(saldo)}</Text>}
              <Button hero onPress={() => setRetiroOpen(true)} disabled={!saldo} style={{ marginTop: 14, alignSelf: "flex-start" }}>
                Solicitar retiro
              </Button>
            </ScreenReveal>
            {retiros.length > 0 && (
              <View style={{ marginBottom: 18, gap: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Retiros</Text>
                {retiros.map((r) => (
                  <View key={r.id} style={[styles.movRow, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                    <Text style={{ fontSize: 12.5, color: tokens.textSecondary, textTransform: "capitalize" }}>
                      {r.metodo} · {r.estado}
                    </Text>
                    <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: tokens.textPrimary }}>{money(r.monto)}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={{ fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 4 }}>Movimientos</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState icon={<WalletIcon size={22} color={tokens.textMuted} />} title="Sin movimientos todavía" />}
        renderItem={({ item, index }) => {
          const positivo = item.monto >= 0;
          return (
            <AnimatedListItem index={index} style={[styles.movRow, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <View style={[styles.movIcon, { backgroundColor: positivo ? tokens.okBg : tokens.dangerBg }]}>
                {positivo ? <ArrowDownIcon size={13} color={tokens.okInk} /> : <ArrowUpIcon size={13} color={tokens.dangerInk} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{LABELS[item.tipo] ?? item.tipo}</Text>
                <Text style={{ fontSize: 10.5, color: tokens.textMuted }}>{formatDateTime(item.created_at)}</Text>
              </View>
              <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", color: positivo ? tokens.ok : tokens.danger }}>
                {positivo ? "+" : ""}
                {money(item.monto)}
              </Text>
            </AnimatedListItem>
          );
        }}
      />

      <RetiroSheet visible={retiroOpen} onClose={() => setRetiroOpen(false)} maxMonto={saldo ?? 0} onDone={() => { setRetiroOpen(false); cargar(); toast.show("Solicitud de retiro enviada", "success"); }} />
    </View>
  );
}

function RetiroSheet({ visible, onClose, maxMonto, onDone }: { visible: boolean; onClose: () => void; maxMonto: number; onDone: () => void }) {
  const toast = useToast();
  const [monto, setMonto] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    const m = Number(monto);
    if (!m || m < 5) return toast.show("El retiro mínimo es $5.00.", "warning");
    if (m > maxMonto) return toast.show("No tienes saldo suficiente.", "warning");
    if (!cuenta.trim()) return toast.show("Indica los datos de tu cuenta.", "warning");
    setEnviando(true);
    try {
      await walletApi.solicitarRetiro({ monto: m, metodo: "transferencia", datos_cuenta: cuenta });
      setMonto("");
      setCuenta("");
      onDone();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo solicitar.", "error");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Solicitar retiro">
      <View style={{ gap: 14, paddingBottom: 8 }}>
        <Input label="Monto" value={monto} onChangeText={setMonto} keyboardType="decimal-pad" placeholder="Mínimo $5.00" hint={`Disponible: ${money(maxMonto)}`} />
        <Input label="Datos de la cuenta" value={cuenta} onChangeText={setCuenta} placeholder="Nombre y número de cuenta" />
        <Button onPress={enviar} loading={enviando}>
          Enviar solicitud
        </Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  movRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  movIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
