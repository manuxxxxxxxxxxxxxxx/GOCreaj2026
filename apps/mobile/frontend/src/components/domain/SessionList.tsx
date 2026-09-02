import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DeviceMobileIcon, LaptopIcon, TrashIcon } from "phosphor-react-native";
import { authApi, ApiError } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { Skeleton } from "../ui/Skeleton";

interface Sesion {
  id: number;
  user_agent: string;
  ip: string;
  created_at: string;
  last_seen_at: string;
  es_actual: boolean;
}

interface Props {
  /** Si se pasa, muestra como máximo esta cantidad y ofrece "Ver más" con el resto. */
  limit?: number;
}

/** Lista de sesiones activas, reutilizada en la tarjeta compacta de Seguridad y en la página completa. */
export function SessionList({ limit }: Props) {
  const { tokens } = useTheme();
  const toast = useToast();
  const [sesiones, setSesiones] = useState<Sesion[] | null>(null);
  const [cerrandoOtras, setCerrandoOtras] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const cargar = () => authApi.sesionesListar().then((r) => setSesiones(r.sesiones)).catch(() => setSesiones([]));
  useEffect(() => {
    cargar();
  }, []);

  const cerrarSesion = async (id: number) => {
    setSesiones((prev) => prev?.filter((s) => s.id !== id) ?? null);
    try {
      await authApi.sesionesCerrar(id);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cerrar la sesión.", "error");
    }
  };

  const cerrarOtras = async () => {
    setCerrandoOtras(true);
    try {
      await authApi.sesionesCerrarOtras();
      toast.show("Se cerraron las demás sesiones", "success");
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar.", "error");
    } finally {
      setCerrandoOtras(false);
    }
  };

  if (sesiones === null) return <Skeleton height={60} />;

  const truncado = !!limit && !expandido && sesiones.length > limit;
  const visibles = truncado ? sesiones.slice(0, limit) : sesiones;

  return (
    <View style={{ gap: 10 }}>
      {sesiones.length > 1 && (
        <Pressable onPress={cerrarOtras} disabled={cerrandoOtras} style={{ alignSelf: "flex-end" }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.danger }}>Cerrar las demás</Text>
        </Pressable>
      )}
      {visibles.map((s) => (
        <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/Mobi|Android|iPhone/i.test(s.user_agent) ? <DeviceMobileIcon size={16} color={tokens.textMuted} /> : <LaptopIcon size={16} color={tokens.textMuted} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{s.ip}</Text>
              {s.es_actual && (
                <View style={{ backgroundColor: tokens.okBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999 }}>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: tokens.ok }}>Esta sesión</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 11, color: tokens.textMuted }}>Activo {relativeTime(s.last_seen_at)}</Text>
          </View>
          {!s.es_actual && (
            <Pressable onPress={() => cerrarSesion(s.id)}>
              <TrashIcon size={15} color={tokens.danger} />
            </Pressable>
          )}
        </View>
      ))}
      {truncado && (
        <Pressable onPress={() => setExpandido(true)} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Ver más ({sesiones.length})</Text>
        </Pressable>
      )}
    </View>
  );
}
