import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { HeartIcon, PaperPlaneTiltIcon } from "phosphor-react-native";
import type { Producto } from "../../lib/types";
import { interaccionesApi } from "../../lib/api";
import { relativeTime } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { Sheet } from "../ui/Sheet";
import { Avatar } from "../ui/Avatar";
import { Skeleton } from "../ui/Skeleton";

interface Comentario {
  id: number;
  comentario: string;
  created_at: string;
  parent_id: number | null;
  likes_count: number;
  usuario_id: number;
  nombre: string;
  foto_perfil: string | null;
  yo_like: number;
}

export function CommentsSheet({ producto, onClose }: { producto: Producto; onClose: () => void }) {
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  const [comentarios, setComentarios] = useState<Comentario[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = () => {
    interaccionesApi.listarComentarios(producto.id).then((r) => setComentarios(r.comentarios)).catch(() => setComentarios([]));
  };

  useEffect(cargar, [producto.id]);

  const enviar = async () => {
    if (!usuario || !texto.trim()) return;
    setEnviando(true);
    try {
      await interaccionesApi.comentar(producto.id, texto.trim());
      setTexto("");
      cargar();
    } finally {
      setEnviando(false);
    }
  };

  const likeComentario = async (id: number) => {
    if (!usuario) return;
    await interaccionesApi.likeComentario(id);
    cargar();
  };

  return (
    <Sheet visible onClose={onClose} title={`Comentarios · ${producto.nombre}`}>
      <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
        {comentarios === null ? (
          <Skeleton height={60} />
        ) : comentarios.filter((c) => !c.parent_id).length === 0 ? (
          <Text style={{ fontSize: 13, color: tokens.textSecondary, textAlign: "center", padding: 20 }}>Sé el primero en comentar.</Text>
        ) : (
          comentarios
            .filter((c) => !c.parent_id)
            .map((c) => (
              <View key={c.id} style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                <Avatar nombre={c.nombre} foto={c.foto_perfil} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, color: tokens.textSecondary }}>
                    <Text style={{ fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{c.nombre} </Text>
                    {c.comentario}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 3 }}>
                    <Text style={{ fontSize: 10.5, color: tokens.textMuted }}>{relativeTime(c.created_at)}</Text>
                    <Pressable onPress={() => likeComentario(c.id)} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <HeartIcon size={12} weight={c.yo_like ? "fill" : "regular"} color={c.yo_like ? tokens.danger : tokens.textMuted} />
                      {c.likes_count > 0 && <Text style={{ fontSize: 10.5, color: tokens.textMuted }}>{c.likes_count}</Text>}
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 8 }}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribe un comentario…"
          placeholderTextColor={tokens.textMuted}
          style={{ flex: 1, height: 40, borderRadius: 999, borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 14, fontSize: 13, color: tokens.textPrimary }}
        />
        <Pressable onPress={enviar} disabled={enviando || !texto.trim()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tokens.cyan, alignItems: "center", justifyContent: "center", opacity: enviando || !texto.trim() ? 0.5 : 1 }}>
          <PaperPlaneTiltIcon size={15} weight="fill" color={tokens.cyanInk} />
        </Pressable>
      </View>
    </Sheet>
  );
}
