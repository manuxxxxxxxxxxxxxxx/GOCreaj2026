import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BicycleIcon, MapPinIcon, PowerIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { repartidorApi, ApiError } from "../../lib/api";
import type { Pedido } from "../../lib/types";
import { money } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedListItem } from "../../components/ui/Motion";

export function RepartidorDisponiblesScreen() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [enLinea, setEnLinea] = useState(false);
  const [pedidos, setPedidos] = useState<(Pedido & { distancia_km?: number; ganancia_repartidor: number })[] | null>(null);

  const cargar = () => {
    repartidorApi.disponibles().then((r) => {
      setEnLinea(r.en_linea);
      setPedidos(r.pedidos);
    });
  };

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 9000);
    return () => clearInterval(t);
  }, []);

  const toggle = async () => {
    const nuevo = !enLinea;
    try {
      await repartidorApi.toggleEnLinea(nuevo);
      setEnLinea(nuevo);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cambiar.", "error");
    }
  };

  const aceptar = async (p: Pedido) => {
    try {
      await repartidorApi.aceptar(p.id);
      toast.show("Pedido aceptado. Dirígete a la tienda.", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo aceptar.", "error");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Disponibles</Text>
        <Pressable onPress={toggle} style={[styles.toggle, { borderColor: enLinea ? tokens.ok : tokens.border, backgroundColor: enLinea ? tokens.okBg : tokens.surface2 }]}>
          <PowerIcon size={14} weight="bold" color={enLinea ? tokens.okInk : tokens.textSecondary} />
          <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: enLinea ? tokens.okInk : tokens.textSecondary }}>{enLinea ? "En línea" : "Desconectado"}</Text>
        </Pressable>
      </View>

      {!enLinea ? (
        <EmptyState icon={<PowerIcon size={24} color={tokens.textMuted} />} title="Estás desconectado" description="Conéctate para recibir pedidos cerca de ti." actionLabel="Conectarme" onAction={toggle} />
      ) : pedidos === null ? (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Skeleton height={100} radius={14} />
        </View>
      ) : pedidos.length === 0 ? (
        <EmptyState icon={<BicycleIcon size={22} color={tokens.textMuted} />} title="Sin pedidos disponibles ahora" />
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 140 }}
          renderItem={({ item: p, index }) => (
            <AnimatedListItem index={index}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <View>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: tokens.textPrimary }}>{p.tienda_nombre}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <MapPinIcon size={12} color={tokens.textMuted} />
                    <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>
                      {p.tienda_direccion ?? p.municipio_entrega} {p.distancia_km !== undefined ? `· ${p.distancia_km} km` : ""}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", fontSize: 15, color: tokens.ok }}>+{money(p.ganancia_repartidor)}</Text>
              </View>
              <Text style={{ fontSize: 12, color: tokens.textSecondary, marginBottom: 10 }}>
                {p.items.length} producto{p.items.length !== 1 ? "s" : ""} · Total {money(p.total)}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button size="sm" onPress={() => aceptar(p)}>
                    Aceptar
                  </Button>
                </View>
                <View style={{ flex: 1 }}>
                  <Button size="sm" variant="secondary" onPress={() => repartidorApi.rechazar(p.id).then(cargar)}>
                    Rechazar
                  </Button>
                </View>
              </View>
            </Card>
            </AnimatedListItem>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
});
