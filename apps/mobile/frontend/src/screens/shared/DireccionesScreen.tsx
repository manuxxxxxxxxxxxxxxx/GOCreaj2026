import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { CaretLeftIcon, CrosshairIcon, MapPinIcon, PlusIcon, StarIcon, TrashIcon } from "phosphor-react-native";
import { WebMapView } from "../../components/ui/WebMapView";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { direccionesApi, ApiError } from "../../lib/api";
import type { DireccionUsuario } from "../../lib/types";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Sheet } from "../../components/ui/Sheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AnimatedListItem } from "../../components/ui/Motion";

type Props = NativeStackScreenProps<RootStackParamList, "Direcciones">;

export function DireccionesScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [direcciones, setDirecciones] = useState<DireccionUsuario[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const cargar = () => {
    direccionesApi.listar().then((r) => setDirecciones(r.direcciones)).catch(() => setDirecciones([]));
  };

  useEffect(cargar, []);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Direcciones</Text>
        <Button size="sm" icon={<PlusIcon size={14} color={tokens.cyanInk} />} onPress={() => setFormOpen(true)}>
          Nueva
        </Button>
      </View>

      {direcciones === null ? (
        <View style={{ padding: 20 }}>
          <Skeleton height={80} />
        </View>
      ) : direcciones.length === 0 ? (
        <EmptyState icon={<MapPinIcon size={22} color={tokens.textMuted} />} title="Sin direcciones guardadas" actionLabel="Agregar dirección" onAction={() => setFormOpen(true)} />
      ) : (
        <FlatList
          data={direcciones}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index} style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <MapPinIcon size={18} color={tokens.cyan} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary }}>{item.alias}</Text>
                  {!!item.es_principal && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <StarIcon size={11} weight="fill" color={tokens.cyan} />
                      <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Principal</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>
                  {item.direccion}, {item.municipio}
                </Text>
                {!item.es_principal && (
                  <Pressable onPress={() => direccionesApi.marcarPrincipal(item.id).then(cargar)}>
                    <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.cyan, marginTop: 6 }}>Marcar como principal</Text>
                  </Pressable>
                )}
              </View>
              <Pressable onPress={() => setEliminando(item.id)} hitSlop={8}>
                <TrashIcon size={16} color={tokens.danger} />
              </Pressable>
            </AnimatedListItem>
          )}
        />
      )}

      <DireccionForm visible={formOpen} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); cargar(); }} />

      <ConfirmDialog
        visible={eliminando !== null}
        title="¿Eliminar dirección?"
        description="No podrás deshacer esta acción."
        danger
        confirmLabel="Eliminar"
        onCancel={() => setEliminando(null)}
        onConfirm={async () => {
          if (eliminando === null) return;
          try {
            await direccionesApi.eliminar(eliminando);
            setEliminando(null);
            cargar();
          } catch (err) {
            toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar.", "error");
          }
        }}
      />
    </View>
  );
}

const SAN_SALVADOR: [number, number] = [-89.2182, 13.6929];

function DireccionForm({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { tokens } = useTheme();
  const toast = useToast();
  const [alias, setAlias] = useState("Casa");
  const [municipio, setMunicipio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const usarMiUbicacion = async () => {
    setLocalizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return toast.show("Necesitamos permiso de ubicación.", "warning");
      const pos = await Location.getCurrentPositionAsync({});
      setCoords([pos.coords.longitude, pos.coords.latitude]);
    } catch {
      toast.show("No se pudo obtener tu ubicación.", "error");
    } finally {
      setLocalizando(false);
    }
  };

  const guardar = async () => {
    if (!municipio.trim() || !direccion.trim()) return toast.show("Completa municipio y dirección.", "warning");
    setGuardando(true);
    try {
      await direccionesApi.crear({
        alias,
        municipio,
        direccion,
        referencia: referencia || null,
        departamento: "San Salvador",
        lat: coords?.[1] ?? null,
        lng: coords?.[0] ?? null,
        es_principal: 0,
      });
      setAlias("Casa");
      setMunicipio("");
      setDireccion("");
      setReferencia("");
      setCoords(null);
      onSaved();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nueva dirección">
      <View style={{ gap: 14, paddingBottom: 8 }}>
        <Input label="Alias" value={alias} onChangeText={setAlias} placeholder="Casa, Trabajo…" />
        <Input label="Municipio" value={municipio} onChangeText={setMunicipio} placeholder="San Salvador" />
        <Input label="Dirección" value={direccion} onChangeText={setDireccion} placeholder="Calle, avenida, número" />
        <Input label="Referencia (opcional)" value={referencia} onChangeText={setReferencia} placeholder="Casa color celeste" />

        <View>
          <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 6 }}>
            Ubica el punto en el mapa (opcional, ayuda al repartidor)
          </Text>
          <View style={{ height: 180, borderRadius: 14, borderWidth: 1, borderColor: tokens.border, overflow: "hidden" }}>
            <WebMapView
              center={coords ?? SAN_SALVADOR}
              zoom={coords ? 15 : 12}
              onPress={(c) => setCoords(c)}
              markers={coords ? [{ id: "pin", coordinate: coords, color: tokens.cyan }] : []}
            />
            <Pressable
              onPress={usarMiUbicacion}
              style={{ position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border }}
            >
              <CrosshairIcon size={16} color={localizando ? tokens.textMuted : tokens.cyan} />
            </Pressable>
          </View>
          <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 6 }}>Toca el mapa para mover el pin.</Text>
        </View>

        <Button onPress={guardar} loading={guardando}>
          Guardar dirección
        </Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
});
