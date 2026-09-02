import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { CameraIcon, CaretLeftIcon, PackageIcon, StarIcon, TrophyIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { repartidorApi, ApiError } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ProfileBadges, type ProfileBadge } from "../../components/domain/ProfileBadges";

type Props = NativeStackScreenProps<RootStackParamList, "RepartidorPerfil">;

interface Perfil {
  id: number;
  nombre: string;
  foto_perfil: string | null;
  descripcion: string | null;
  repartidor_calificacion_promedio: number;
  repartidor_total_resenas: number;
  entregas_completadas: number;
}
interface Resena {
  id: number;
  estrellas: number;
  comentario: string;
  created_at: string;
  comprador_nombre: string;
}

export function RepartidorPerfilScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    repartidorApi.miPerfil().then((r) => {
      setPerfil(r.perfil);
      setDescripcion(r.perfil.descripcion ?? "");
    });
    repartidorApi.misResenas().then((r) => setResenas(r.resenas)).catch(() => {});
  }, []);

  const guardar = async () => {
    setGuardando(true);
    try {
      await repartidorApi.actualizarPerfil({ descripcion });
      toast.show("Perfil actualizado", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo guardar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const subirFoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
    if (res.canceled || !res.assets[0].base64) return;
    try {
      const r = await repartidorApi.actualizarPerfil({ foto_perfil: `data:${res.assets[0].mimeType ?? "image/jpeg"};base64,${res.assets[0].base64}` });
      setPerfil((p) => (p ? { ...p, foto_perfil: r.foto_perfil } : p));
      if (usuario) actualizarUsuarioLocal({ ...usuario, foto_perfil: r.foto_perfil });
      toast.show("Foto actualizada", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo subir.", "error");
    }
  };

  if (!perfil) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20 }}>
        <Skeleton height={140} radius={16} />
      </View>
    );
  }

  const repartidorBadges: ProfileBadge[] = [
    { icon: <TrophyIcon size={16} weight="fill" color={tokens.coral} />, label: "Primera entrega", current: perfil.entregas_completadas, target: 1, accent: "coral" },
    { icon: <TrophyIcon size={16} weight="fill" color={tokens.coral} />, label: "Repartidor confiable", current: perfil.entregas_completadas, target: 25, accent: "coral" },
    { icon: <TrophyIcon size={16} weight="fill" color={tokens.coral} />, label: "Bien calificado", current: perfil.repartidor_total_resenas, target: 5, accent: "coral" },
  ];

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Mi perfil</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 60 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View>
            <Avatar nombre={perfil.nombre} foto={perfil.foto_perfil} size={72} />
            <Pressable onPress={subirFoto} style={[styles.camBtn, { backgroundColor: tokens.cyan, borderColor: tokens.bg }]}>
              <CameraIcon size={13} weight="bold" color={tokens.cyanInk} />
            </Pressable>
          </View>
          <View>
            <Text style={{ fontSize: 19, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{perfil.nombre}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <StarIcon size={13} weight="fill" color={tokens.warn} />
              <Text style={{ fontSize: 12, color: tokens.textSecondary }}>
                {perfil.repartidor_calificacion_promedio?.toFixed(1) ?? "Nuevo"} ({perfil.repartidor_total_resenas}) · {perfil.entregas_completadas} entregas
              </Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10, textAlign: "center" }}>Pasos completados</Text>
          <ProfileBadges badges={repartidorBadges} />
        </View>

        <Card>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary, marginBottom: 8 }}>Sobre ti</Text>
          <TextInput
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            placeholder="Cuéntale a los compradores un poco sobre ti"
            placeholderTextColor={tokens.textMuted}
            style={{ height: 80, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, padding: 12, fontSize: 13.5, color: tokens.textPrimary, textAlignVertical: "top" }}
          />
          <Button size="sm" onPress={guardar} loading={guardando} style={{ marginTop: 12, alignSelf: "flex-start" }}>
            Guardar
          </Button>
        </Card>

        <View>
          <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>Reseñas recibidas</Text>
          {resenas.length === 0 ? (
            <EmptyState icon={<PackageIcon size={20} color={tokens.textMuted} />} title="Aún no tienes reseñas" />
          ) : (
            <View style={{ gap: 8 }}>
              {resenas.map((r) => (
                <Card key={r.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: tokens.textPrimary }}>{r.comprador_nombre}</Text>
                    <Text style={{ fontSize: 11, color: tokens.textMuted }}>{formatDate(r.created_at)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 2, marginBottom: 4 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} size={11} weight={i < r.estrellas ? "fill" : "regular"} color={tokens.warn} />
                    ))}
                  </View>
                  {r.comentario ? <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>{r.comentario}</Text> : null}
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  camBtn: { position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
