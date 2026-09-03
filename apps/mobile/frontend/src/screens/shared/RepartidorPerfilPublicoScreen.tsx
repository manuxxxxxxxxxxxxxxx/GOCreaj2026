import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CaretLeftIcon, MopedIcon, PackageIcon, StarIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { chatApi, ApiError } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

type Props = NativeStackScreenProps<RootStackParamList, "RepartidorPerfilPublico">;

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

/** Ficha pública de un repartidor (a la que se llega tocando su nombre/avatar dentro
 * del chat) -- de solo lectura, a diferencia de RepartidorPerfilScreen.tsx que es la
 * pantalla de "editar mi propio perfil" del repartidor autenticado. */
export function RepartidorPerfilPublicoScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined);
  const [resenas, setResenas] = useState<Resena[]>([]);

  useEffect(() => {
    chatApi
      .perfilPublicoRepartidor(route.params.id)
      .then((r) => {
        setPerfil(r.perfil);
        setResenas(r.resenas);
      })
      .catch((err) => {
        setPerfil(null);
        toast.show(err instanceof ApiError ? err.message : "No se pudo cargar el perfil.", "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params.id]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Perfil del repartidor</Text>
      </View>

      {perfil === undefined ? (
        <View style={{ padding: 20 }}>
          <Skeleton height={140} radius={16} />
        </View>
      ) : perfil === null ? (
        <EmptyState icon={<MopedIcon size={20} color={tokens.textMuted} />} title="Repartidor no encontrado" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 60 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Avatar nombre={perfil.nombre} foto={perfil.foto_perfil} size={72} />
            <View>
              <Text style={{ fontSize: 19, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{perfil.nombre}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <StarIcon size={13} weight="fill" color={tokens.warn} />
                <Text style={{ fontSize: 12, color: tokens.textSecondary }}>
                  {perfil.repartidor_calificacion_promedio ? perfil.repartidor_calificacion_promedio.toFixed(1) : "Nuevo"} ({perfil.repartidor_total_resenas}) · {perfil.entregas_completadas} entregas
                </Text>
              </View>
            </View>
          </View>

          {perfil.descripcion ? (
            <Card>
              <Text style={{ fontSize: 13, color: tokens.textSecondary }}>{perfil.descripcion}</Text>
            </Card>
          ) : null}

          <View>
            <Text style={{ fontSize: 13.5, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>Reseñas</Text>
            {resenas.length === 0 ? (
              <EmptyState icon={<PackageIcon size={20} color={tokens.textMuted} />} title="Aún no tiene reseñas" />
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
