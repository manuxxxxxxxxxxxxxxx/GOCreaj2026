import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { CaretLeftIcon, CrosshairIcon, MapPinIcon, PencilSimpleIcon, PlusIcon, StarIcon, TrashIcon } from "phosphor-react-native";
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

/** Geocodificación inversa vía Nominatim (OpenStreetMap) — misma fuente que usa la web, sin API key. */
async function geocodificarInverso(lat: number, lng: number) {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("No se pudo geocodificar.");
  const data = await res.json();
  const a = data.address ?? {};
  const calle = [a.road, a.house_number].filter(Boolean).join(" ");
  const barrio = a.neighbourhood || a.suburb || a.quarter;
  const direccion = [calle, barrio].filter(Boolean).join(", ") || data.display_name || "";
  const municipio = a.city || a.town || a.village || a.municipality || "";
  const departamento = a.state || a.county || "";
  return { direccion, municipio, departamento };
}

export function DireccionesScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [direcciones, setDirecciones] = useState<DireccionUsuario[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<DireccionUsuario | null>(null);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const cargar = () => {
    direccionesApi.listar().then((r) => setDirecciones(r.direcciones)).catch(() => setDirecciones([]));
  };

  useEffect(cargar, []);

  const abrirNueva = () => {
    setEditando(null);
    setFormOpen(true);
  };
  const abrirEditar = (d: DireccionUsuario) => {
    setEditando(d);
    setFormOpen(true);
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Direcciones</Text>
        <Button size="sm" icon={<PlusIcon size={14} color={tokens.cyanInk} />} onPress={abrirNueva}>
          Nueva
        </Button>
      </View>

      {direcciones === null ? (
        <View style={{ padding: 20 }}>
          <Skeleton height={80} />
        </View>
      ) : direcciones.length === 0 ? (
        <EmptyState icon={<MapPinIcon size={22} color={tokens.textMuted} />} title="Sin direcciones guardadas" actionLabel="Agregar dirección" onAction={abrirNueva} />
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
                {!!item.referencia && <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginTop: 2 }}>{item.referencia}</Text>}
                {!item.es_principal && (
                  <Pressable onPress={() => direccionesApi.marcarPrincipal(item.id).then(cargar)}>
                    <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.cyan, marginTop: 6 }}>Marcar como principal</Text>
                  </Pressable>
                )}
              </View>
              <Pressable onPress={() => abrirEditar(item)} hitSlop={8}>
                <PencilSimpleIcon size={16} color={tokens.textMuted} />
              </Pressable>
              <Pressable onPress={() => setEliminando(item.id)} hitSlop={8}>
                <TrashIcon size={16} color={tokens.danger} />
              </Pressable>
            </AnimatedListItem>
          )}
        />
      )}

      <DireccionForm
        visible={formOpen}
        editando={editando}
        totalActual={direcciones?.length ?? 0}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          cargar();
        }}
      />

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

function DireccionForm({
  visible,
  editando,
  totalActual,
  onClose,
  onSaved,
}: {
  visible: boolean;
  editando: DireccionUsuario | null;
  totalActual: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tokens } = useTheme();
  const toast = useToast();
  const [alias, setAlias] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [departamento, setDepartamento] = useState("San Salvador");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Repuebla el formulario cada vez que se abre: datos de la dirección a editar, o vacío para una nueva.
  useEffect(() => {
    if (!visible) return;
    if (editando) {
      setAlias(editando.alias);
      setMunicipio(editando.municipio);
      setDepartamento(editando.departamento || "San Salvador");
      setDireccion(editando.direccion);
      setReferencia(editando.referencia ?? "");
      setCoords(editando.lat != null && editando.lng != null ? [editando.lng, editando.lat] : null);
    } else {
      setAlias("");
      setMunicipio("");
      setDepartamento("San Salvador");
      setDireccion("");
      setReferencia("");
      setCoords(null);
    }
  }, [visible, editando]);

  const elegirEnMapa = async (c: [number, number]) => {
    setCoords(c);
    setUbicando(true);
    try {
      const r = await geocodificarInverso(c[1], c[0]);
      if (r.direccion) setDireccion(r.direccion);
      if (r.municipio) setMunicipio(r.municipio);
      if (r.departamento) setDepartamento(r.departamento);
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

  const guardar = async () => {
    if (!municipio.trim() || !direccion.trim()) return toast.show("Completa municipio y dirección.", "warning");
    const aliasFinal = alias.trim() || (editando ? editando.alias : `Ubicación ${totalActual + 1}`);
    setGuardando(true);
    try {
      if (editando) {
        await direccionesApi.actualizar({
          id: editando.id,
          alias: aliasFinal,
          municipio,
          direccion,
          referencia: referencia || null,
          departamento,
          lat: coords?.[1] ?? null,
          lng: coords?.[0] ?? null,
        });
        toast.show("Dirección actualizada", "success");
      } else {
        await direccionesApi.crear({
          alias: aliasFinal,
          municipio,
          direccion,
          referencia: referencia || null,
          departamento,
          lat: coords?.[1] ?? null,
          lng: coords?.[0] ?? null,
          es_principal: 0,
        });
        toast.show("Dirección guardada", "success");
      }
      onSaved();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editando ? "Editar dirección" : "Nueva dirección"}>
      <View style={{ gap: 14, paddingBottom: 8 }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ fontSize: 12.5, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>Toca el mapa para ubicar tu dirección</Text>
          </View>
          <View style={{ height: 180, borderRadius: 14, borderWidth: 1, borderColor: tokens.border, overflow: "hidden" }}>
            <WebMapView
              center={coords ?? SAN_SALVADOR}
              zoom={coords ? 16 : 12}
              onPress={elegirEnMapa}
              markers={coords ? [{ id: "pin", coordinate: coords, color: tokens.cyan }] : []}
            />
            <Pressable
              onPress={usarMiUbicacion}
              style={{ position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border }}
            >
              <CrosshairIcon size={16} color={localizando ? tokens.textMuted : tokens.cyan} />
            </Pressable>
          </View>
          <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 6 }}>
            {ubicando ? "Detectando la calle…" : "Toca el mapa para mover el pin, o usa tu ubicación actual."}
          </Text>
        </View>

        <Input label="Alias" value={alias} onChangeText={setAlias} placeholder={editando ? "Casa, Trabajo…" : `Casa, Trabajo… (vacío = Ubicación ${totalActual + 1})`} />
        <Input label="Municipio" value={municipio} onChangeText={setMunicipio} placeholder="San Salvador" />
        <Input label="Dirección" value={direccion} onChangeText={setDireccion} placeholder="Calle, avenida, número" />
        <Input label="Referencia (opcional)" value={referencia} onChangeText={setReferencia} placeholder="Casa color celeste" />

        <Button onPress={guardar} loading={guardando}>
          {editando ? "Guardar cambios" : "Guardar dirección"}
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
