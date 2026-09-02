import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowCounterClockwiseIcon, CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon, ProhibitIcon } from "phosphor-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { adminApi, ApiError } from "../../lib/api";
import type { Rol, Usuario } from "../../lib/types";
import { formatDate } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

const ROLES: (Rol | "")[] = ["", "comprador", "vendedor", "repartidor", "admin"];
const ROLE_LABEL: Record<Rol | "", string> = { "": "Todos los roles", comprador: "Comprador", vendedor: "Vendedor", repartidor: "Repartidor", admin: "Admin" };
const LIMIT = 15;

/** Portado 1:1 desde apps/web/web/src/pages/admin/AdminUsuarios.tsx: mismo cambio de
 * rol al instante, mismo bloqueo de auto-cambiarse el rol, mismo ícono de
 * suspender/reactivar según el estado real de la cuenta. */
export function AdminUsuariosScreen() {
  const { tokens } = useTheme();
  const { usuario: admin } = useAuth();
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [rolFiltro, setRolFiltro] = useState<Rol | "">("");
  const [baneando, setBaneando] = useState<Usuario | null>(null);
  const [baneandoLoading, setBaneandoLoading] = useState(false);

  const cargar = () => {
    adminApi.usuarios({ page, limit: LIMIT, q: q || undefined, rol: rolFiltro || undefined }).then((r) => {
      setUsuarios(r.usuarios);
      setTotal(r.total);
    });
  };

  useEffect(cargar, [page, rolFiltro]);

  const buscar = () => {
    setPage(1);
    cargar();
  };

  const banear = async () => {
    if (!baneando) return;
    setBaneandoLoading(true);
    try {
      const r = await adminApi.banearUsuario(baneando.id);
      toast.show(r.activo ? "Usuario reactivado" : "Usuario suspendido", "success");
      setBaneando(null);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    } finally {
      setBaneandoLoading(false);
    }
  };

  const cambiarRol = async (u: Usuario, nuevoRol: Rol) => {
    const anterior = u.rol;
    setUsuarios((prev) => prev && prev.map((x) => (x.id === u.id ? { ...x, rol: nuevoRol } : x)));
    try {
      await adminApi.actualizarUsuario({ usuario_id: u.id, rol: nuevoRol });
      toast.show("Rol actualizado", "success");
    } catch (err) {
      setUsuarios((prev) => prev && prev.map((x) => (x.id === u.id ? { ...x, rol: anterior } : x)));
      toast.show(err instanceof ApiError ? err.message : "No se pudo cambiar el rol.", "error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 20, paddingBottom: 12, gap: 10 }}>
        <Text style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Usuarios</Text>
        <View style={[styles.searchBox, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <MagnifyingGlassIcon size={15} color={tokens.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={buscar}
            placeholder="Buscar por nombre o correo"
            placeholderTextColor={tokens.textMuted}
            style={{ flex: 1, fontSize: 13.5, color: tokens.textPrimary, fontFamily: "Inter_400Regular" }}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {ROLES.map((r) => {
            const active = rolFiltro === r;
            return (
              <Pressable
                key={r || "todos"}
                onPress={() => setRolFiltro(r)}
                style={[styles.roleChip, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}
              >
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: active ? tokens.cyan : tokens.textSecondary }}>{ROLE_LABEL[r]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {usuarios === null ? (
        <View style={{ padding: 20, gap: 10 }}>
          <Skeleton height={90} radius={14} />
          <Skeleton height={90} radius={14} />
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 10, paddingBottom: 24 }}
          renderItem={({ item: u }) => {
            const esYoMismo = u.id === admin?.id;
            return (
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar nombre={u.nombre} foto={u.foto_perfil} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: "Inter_700Bold", color: tokens.textPrimary }}>{u.nombre}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11.5, color: tokens.textMuted }}>{u.email ?? u.telefono}</Text>
                  </View>
                  {esYoMismo ? (
                    <Text style={{ fontSize: 11, color: tokens.textMuted }}>—</Text>
                  ) : u.activo ? (
                    <Pressable onPress={() => setBaneando(u)} accessibilityLabel="Suspender usuario" style={[styles.actionBtn, { backgroundColor: tokens.dangerBg }]}>
                      <ProhibitIcon size={15} color={tokens.danger} />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setBaneando(u)} accessibilityLabel="Reactivar usuario" style={[styles.actionBtn, { backgroundColor: tokens.okBg }]}>
                      <ArrowCounterClockwiseIcon size={15} color={tokens.okInk} />
                    </Pressable>
                  )}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 }}>
                    {(["comprador", "vendedor", "repartidor", "admin"] as Rol[]).map((r) => {
                      const active = u.rol === r;
                      return (
                        <Pressable
                          key={r}
                          disabled={esYoMismo}
                          onPress={() => cambiarRol(u, r)}
                          style={[
                            styles.miniChip,
                            { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : "transparent", opacity: esYoMismo ? 0.4 : 1 },
                          ]}
                        >
                          <Text style={{ fontSize: 10.5, fontFamily: "Inter_600SemiBold", color: active ? tokens.cyan : tokens.textSecondary, textTransform: "capitalize" }}>{r}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={{ fontSize: 10.5, fontFamily: "Inter_700Bold", color: u.activo ? tokens.okInk : tokens.danger }}>{u.activo ? "Activo" : "Suspendido"}</Text>
                </View>
                {u.created_at && <Text style={{ fontSize: 10.5, color: tokens.textMuted, marginTop: 8 }}>Desde {formatDate(u.created_at)}</Text>}
              </Card>
            );
          }}
        />
      )}

      {totalPages > 1 && (
        <View style={[styles.pager, { borderTopColor: tokens.border }]}>
          <Pressable disabled={page === 1} onPress={() => setPage((p) => p - 1)} style={[styles.pagerBtn, { opacity: page === 1 ? 0.35 : 1 }]}>
            <CaretLeftIcon size={14} color={tokens.textPrimary} />
          </Pressable>
          <Text style={{ fontSize: 12.5, color: tokens.textSecondary, fontFamily: "Inter_600SemiBold" }}>
            Página {page} de {totalPages}
          </Text>
          <Pressable disabled={page === totalPages} onPress={() => setPage((p) => p + 1)} style={[styles.pagerBtn, { opacity: page === totalPages ? 0.35 : 1 }]}>
            <CaretRightIcon size={14} color={tokens.textPrimary} />
          </Pressable>
        </View>
      )}

      <ConfirmDialog
        visible={!!baneando}
        title={baneando?.activo ? "¿Suspender usuario?" : "¿Reactivar usuario?"}
        description={baneando?.activo ? "El usuario no podrá acceder a la plataforma hasta que lo reactives." : "El usuario recuperará acceso normal."}
        danger={!!baneando?.activo}
        confirmLabel={baneando?.activo ? "Suspender" : "Reactivar"}
        loading={baneandoLoading}
        onCancel={() => setBaneando(null)}
        onConfirm={banear}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  miniChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, paddingVertical: 12, borderTopWidth: 1 },
  pagerBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
