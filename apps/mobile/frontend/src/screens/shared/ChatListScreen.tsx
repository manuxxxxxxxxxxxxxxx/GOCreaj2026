import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatCircleDotsIcon, MagnifyingGlassIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { chatApi } from "../../lib/api";
import type { Conversacion } from "../../lib/types";
import { relativeTime } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { AnimatedListItem } from "../../components/ui/Motion";

type Tab = "todos" | "noLeidos" | "favoritos" | "archivados";
const TABS: { key: Tab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "noLeidos", label: "No leídos" },
  { key: "favoritos", label: "Favoritos" },
  { key: "archivados", label: "Archivados" },
];

/**
 * Se usa en dos contextos distintos: como tab (comprador -- ahí ya vive debajo del
 * <TopBar/> fijo de TabsShell.tsx, que ya reserva el espacio del status bar) y como
 * pantalla de Stack empujada directo (vendedor/repartidor/admin, que no tienen tab de
 * Chat y llegan acá por el ícono de TopBar -- MainStack.tsx tiene `headerShown: false`
 * global, así que sin esto el buscador quedaba pegado contra el reloj/batería del
 * teléfono). `standalone` lo pasa MainStack.tsx solo para esa segunda ruta.
 */
export function ChatListScreen({ standalone }: { standalone?: boolean } = {}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<Tab>("todos");
  const [q, setQ] = useState("");
  const [conversaciones, setConversaciones] = useState<Conversacion[] | null>(null);

  const cargar = useCallback(() => {
    chatApi.conversaciones({ tab, q: q || undefined }).then((r) => setConversaciones(r.conversaciones)).catch(() => setConversaciones([]));
  }, [tab, q]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 8000);
    return () => clearInterval(t);
  }, [cargar]);

  useFocusEffect(cargar);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.header, standalone && { paddingTop: insets.top + 12 }]}>
        <View style={[styles.searchBox, { borderColor: tokens.border, backgroundColor: tokens.surface1 }]}>
          <MagnifyingGlassIcon size={15} color={tokens.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Buscar conversación" placeholderTextColor={tokens.textMuted} style={{ flex: 1, fontSize: 13, color: tokens.textPrimary }} />
        </View>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
          {TABS.map((t) => (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tabChip, { backgroundColor: tab === t.key ? tokens.cyanBg : "transparent" }]}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: tab === t.key ? tokens.cyan : tokens.textMuted }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {conversaciones === null ? (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={56} />
          <Skeleton height={56} />
        </View>
      ) : conversaciones.length === 0 ? (
        <EmptyState icon={<ChatCircleDotsIcon size={22} color={tokens.textMuted} />} title="Sin conversaciones" />
      ) : (
        <FlatList
          data={conversaciones}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <Pressable onPress={() => navigation.navigate("ChatThread", { otroId: item.id })} style={[styles.row, { borderBottomColor: tokens.border }]}>
                <Avatar nombre={item.nombre} foto={item.foto_perfil ?? item.tienda_logo} size={44} online={!!item.en_linea} rol={item.rol} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text numberOfLines={1} style={{ fontFamily: "Inter_700Bold", fontSize: 13.5, color: tokens.textPrimary, flex: 1 }}>{item.nombre}</Text>
                    {item.ultimo_mensaje && <Text style={{ fontSize: 10.5, color: tokens.textMuted }}>{relativeTime(item.ultimo_mensaje.created_at)}</Text>}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text numberOfLines={1} style={{ fontSize: 12, color: tokens.textMuted, flex: 1 }}>{item.ultimo_mensaje?.mensaje ?? "Sin mensajes"}</Text>
                    {item.no_leidos > 0 && (
                      <View style={[styles.badge, { backgroundColor: tokens.cyan }]}>
                        <Text style={{ fontSize: 9.5, fontFamily: "Inter_700Bold", color: tokens.cyanInk }}>{item.no_leidos}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            </AnimatedListItem>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 4 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12 },
  tabChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  badge: { minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
});
