import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { PlusIcon, TagIcon, TrashIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { cuponesApi, ApiError } from "../../lib/api";
import type { Cupon } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Sheet } from "../../components/ui/Sheet";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminCupones.tsx. */
export function AdminCuponesScreen() {
  const { tokens } = useTheme();
  const [cupones, setCupones] = useState<Cupon[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [eliminando, setEliminando] = useState<Cupon | null>(null);

  const cargar = () => {
    cuponesApi.listar().then((r) => setCupones(r.cupones)).catch(() => setCupones([]));
  };

  useEffect(cargar, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Cupones</Text>
        <Button size="sm" icon={<PlusIcon size={14} color={tokens.cyanInk} />} onPress={() => setFormOpen(true)}>
          Nuevo
        </Button>
      </View>

      {cupones === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={70} radius={14} />
        </View>
      ) : cupones.length === 0 ? (
        <EmptyState icon={<TagIcon size={22} color={tokens.textMuted} />} title="Sin cupones" actionLabel="Crear cupón" onAction={() => setFormOpen(true)} />
      ) : (
        <FlatList
          data={cupones}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 10, paddingBottom: 24 }}
          renderItem={({ item: c }) => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: tokens.surface1, borderWidth: 1, borderColor: tokens.border, borderRadius: 14 }}>
              <View style={{ backgroundColor: tokens.cyanBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                <Text style={{ fontFamily: "IBMPlexMono_500Medium", fontWeight: "700", fontSize: 13, color: tokens.cyan }}>{c.codigo}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: tokens.textSecondary }}>
                  {c.tipo === "porcentaje" ? `${c.valor}% de descuento` : `$${c.valor} de descuento`} · min. ${c.min_compra}
                </Text>
                <Text style={{ fontSize: 11, color: tokens.textMuted, marginTop: 2 }}>
                  {c.usos_actuales}{c.usos_max ? `/${c.usos_max}` : ""} usos{c.expira_at ? ` · vence ${formatDate(c.expira_at)}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => cuponesApi.toggleActivo(c.id).then(cargar)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.activo ? tokens.okBg : tokens.surface2 }}>
                <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: c.activo ? tokens.okInk : tokens.textMuted }}>{c.activo ? "Activo" : "Inactivo"}</Text>
              </Pressable>
              <Pressable onPress={() => setEliminando(c)} accessibilityLabel="Eliminar" hitSlop={8}>
                <TrashIcon size={16} color={tokens.danger} />
              </Pressable>
            </View>
          )}
        />
      )}

      <CuponForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); cargar(); }} />

      <ConfirmDialog
        visible={!!eliminando}
        title="¿Eliminar cupón?"
        description="Los compradores ya no podrán usar este código."
        danger
        confirmLabel="Eliminar"
        onCancel={() => setEliminando(null)}
        onConfirm={async () => {
          if (!eliminando) return;
          await cuponesApi.eliminar(eliminando.id);
          setEliminando(null);
          cargar();
        }}
      />
    </View>
  );
}

function CuponForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"porcentaje" | "monto">("porcentaje");
  const [valor, setValor] = useState("");
  const [minCompra, setMinCompra] = useState("0");
  const [usosMax, setUsosMax] = useState("");
  const [expiraAt, setExpiraAt] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { tokens } = useTheme();

  const guardar = async () => {
    if (!codigo.trim() || !valor) return toast.show("Completa código y valor.", "warning");
    setGuardando(true);
    try {
      await cuponesApi.crear({ codigo: codigo.toUpperCase(), tipo, valor: Number(valor), min_compra: Number(minCompra) || 0, usos_max: usosMax ? Number(usosMax) : undefined, expira_at: expiraAt || undefined });
      setCodigo("");
      setValor("");
      setMinCompra("0");
      setUsosMax("");
      setExpiraAt("");
      onSaved();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo crear el cupón.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet visible={open} onClose={onClose} title="Nuevo cupón">
      <View style={{ gap: 14, paddingBottom: 20 }}>
        <Input label="Código" value={codigo} onChangeText={(v) => setCodigo(v.toUpperCase())} placeholder="BIENVENIDO10" autoCapitalize="characters" />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => setTipo("porcentaje")} style={[styles.tipoChip, { backgroundColor: tipo === "porcentaje" ? tokens.cyanBg : tokens.surface2, borderColor: tipo === "porcentaje" ? tokens.cyan : tokens.border }]}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tipo === "porcentaje" ? tokens.cyan : tokens.textSecondary }}>Porcentaje</Text>
          </Pressable>
          <Pressable onPress={() => setTipo("monto")} style={[styles.tipoChip, { backgroundColor: tipo === "monto" ? tokens.cyanBg : tokens.surface2, borderColor: tipo === "monto" ? tokens.cyan : tokens.border }]}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tipo === "monto" ? tokens.cyan : tokens.textSecondary }}>Monto fijo</Text>
          </Pressable>
        </View>
        <Input label={tipo === "porcentaje" ? "Porcentaje (%)" : "Monto ($)"} value={valor} onChangeText={setValor} keyboardType="numeric" />
        <Input label="Compra mínima ($)" value={minCompra} onChangeText={setMinCompra} keyboardType="numeric" />
        <Input label="Usos máximos (opcional)" value={usosMax} onChangeText={setUsosMax} keyboardType="numeric" />
        <Input label="Expira (opcional, AAAA-MM-DD)" value={expiraAt} onChangeText={setExpiraAt} placeholder="2026-12-31" />
        <Button fullWidth onPress={guardar} loading={guardando}>
          Crear cupón
        </Button>
      </View>
    </Sheet>
  );
}

const styles = { tipoChip: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center" as const, justifyContent: "center" as const } };
