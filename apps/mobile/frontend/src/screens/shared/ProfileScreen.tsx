import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { CameraIcon, CaretRightIcon, HandshakeIcon, HeadsetIcon, MapPinLineIcon, MapTrifoldIcon, MoonIcon, SignOutIcon, StorefrontIcon, SunIcon, UserIcon, WalletIcon } from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authApi, ApiError } from "../../lib/api";
import { Avatar } from "../../components/ui/Avatar";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

export function ProfileScreen() {
  const { tokens, theme, setTheme } = useTheme();
  const { usuario, actualizarUsuarioLocal, cambiarRol, logout } = useAuth();
  const toast = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

  useEffect(() => {
    authApi.misRoles().then((r) => setRoles(r.roles)).catch(() => {});
  }, []);

  if (!usuario) return null;

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await authApi.actualizarPerfil({ nombre, email, telefono });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Perfil actualizado", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const subirFoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true, allowsEditing: true, aspect: [1, 1] });
    if (res.canceled || !res.assets[0].base64) return;
    const mime = res.assets[0].mimeType ?? "image/jpeg";
    try {
      const r = await authApi.actualizarPerfil({ foto_perfil: `data:${mime};base64,${res.assets[0].base64}` });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Foto actualizada", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo subir la foto.", "error");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View>
          <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={72} />
          <Pressable onPress={subirFoto} style={[styles.camBtn, { backgroundColor: tokens.cyan, borderColor: tokens.bg }]}>
            <CameraIcon size={13} weight="bold" color={tokens.cyanInk} />
          </Pressable>
        </View>
        <View>
          <Text style={{ fontSize: 19, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{usuario.nombre}</Text>
          <Text style={{ fontSize: 12, color: tokens.textMuted }}>{usuario.email}</Text>
        </View>
      </View>

      {roles.length > 1 && (
        <Card>
          <Text style={{ fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>Cambiar de rol</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {roles.map((r) => (
              <Pressable key={r} onPress={() => cambiarRol(r as "comprador" | "vendedor" | "repartidor")} style={[styles.roleChip, { borderColor: usuario.rol === r ? tokens.cyan : tokens.border, backgroundColor: usuario.rol === r ? tokens.cyanBg : tokens.surface1 }]}>
                <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: usuario.rol === r ? tokens.cyan : tokens.textSecondary, textTransform: "capitalize" }}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      <Card>
        <Text style={{ fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 14 }}>Información personal</Text>
        <View style={{ gap: 14 }}>
          <Input label="Nombre" value={nombre} onChangeText={setNombre} />
          <Input label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <PhoneInput value={telefono} onChangeText={setTelefono} />
          <Button size="sm" onPress={guardar} loading={guardando} style={{ alignSelf: "flex-start" }}>
            Guardar cambios
          </Button>
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>Apariencia</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <ThemeChip label="Claro" icon={<SunIcon size={14} color={theme === "light" ? tokens.cyan : tokens.textSecondary} />} active={theme === "light"} onPress={() => setTheme("light")} />
          <ThemeChip label="Oscuro" icon={<MoonIcon size={14} color={theme === "dark" ? tokens.cyan : tokens.textSecondary} />} active={theme === "dark"} onPress={() => setTheme("dark")} />
          <ThemeChip label="Sistema" icon={null} active={theme === "system"} onPress={() => setTheme("system")} />
        </View>
      </Card>

      <View>
        <NavRow icon={<MapPinLineIcon size={18} color={tokens.cyan} />} label="Direcciones" onPress={() => navigation.navigate("Direcciones")} />
        <NavRow icon={<WalletIcon size={18} color={tokens.cyan} />} label="Billetera" onPress={() => navigation.navigate("Wallet")} />
        {usuario.rol === "comprador" && <NavRow icon={<MapTrifoldIcon size={18} color={tokens.cyan} />} label="Mis pedidos" onPress={() => navigation.navigate("Orders")} />}
        {usuario.rol === "comprador" && <NavRow icon={<HandshakeIcon size={18} color={tokens.cyan} />} label="Convertirse en socio" onPress={() => navigation.navigate("Convertirse")} />}
        {usuario.rol === "vendedor" && <NavRow icon={<StorefrontIcon size={18} color={tokens.cyan} />} label="Mi tienda" onPress={() => navigation.navigate("VendedorTienda")} />}
        {usuario.rol === "repartidor" && <NavRow icon={<UserIcon size={18} color={tokens.cyan} />} label="Mi perfil de repartidor" onPress={() => navigation.navigate("RepartidorPerfil")} />}
        <NavRow icon={<HeadsetIcon size={18} color={tokens.cyan} />} label="Soporte" onPress={() => navigation.navigate("Soporte")} />
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" icon={<SignOutIcon size={16} color={tokens.textPrimary} />} onPress={logout}>
            Cerrar sesión
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            variant="danger"
            onPress={() =>
              Alert.alert("¿Eliminar tu cuenta?", "Esta acción desactiva tu cuenta de inmediato.", [
                { text: "Cancelar", style: "cancel" },
                { text: "Eliminar", style: "destructive", onPress: () => setConfirmandoEliminar(true) },
              ])
            }
          >
            Eliminar cuenta
          </Button>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmandoEliminar}
        title="Confirmar eliminación"
        description="Tu cuenta quedará desactivada. Contacta a soporte si cambias de opinión."
        confirmLabel="Eliminar cuenta"
        danger
        onCancel={() => setConfirmandoEliminar(false)}
        onConfirm={async () => {
          try {
            await authApi.eliminarCuenta();
            logout();
          } catch (err) {
            toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar la cuenta.", "error");
          }
        }}
      />
    </ScrollView>
  );
}

function ThemeChip({ label, icon, active, onPress }: { label: string; icon: React.ReactNode; active: boolean; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.themeChip, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}>
      {icon}
      <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: active ? tokens.cyan : tokens.textSecondary }}>{label}</Text>
    </Pressable>
  );
}

function NavRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.navRow, { borderBottomColor: tokens.border }]}>
      {icon}
      <Text style={{ flex: 1, fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{label}</Text>
      <CaretRightIcon size={14} color={tokens.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  camBtn: { position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1 },
  themeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
});
