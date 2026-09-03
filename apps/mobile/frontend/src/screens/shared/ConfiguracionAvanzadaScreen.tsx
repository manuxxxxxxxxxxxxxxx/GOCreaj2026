import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AtIcon,
  CaretLeftIcon,
  CreditCardIcon,
  GlobeIcon,
  HandshakeIcon,
  HeadsetIcon,
  MapPinLineIcon,
  MoonIcon,
  MonitorIcon,
  PlusIcon,
  ShieldCheckIcon,
  SignOutIcon,
  SunIcon,
  TrashIcon,
  WalletIcon,
} from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authApi, carritoApi, ApiError } from "../../lib/api";
import type { MetodoPago } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

type Props = NativeStackScreenProps<RootStackParamList, "Configuracion">;

export function ConfiguracionAvanzadaScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Configuración avanzada</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <AccesosRapidos navigation={navigation} />
        <PreferenciasSection />
        <InformacionPersonalSection />
        <CuentaSection />
        <PagosSection />
        <SeguridadSection navigation={navigation} />
        <RolSection navigation={navigation} />
        <SoporteSection navigation={navigation} />

        <View style={{ maxWidth: 400, width: "100%", alignSelf: "center", paddingTop: 4 }}>
          <Button variant="secondary" fullWidth icon={<SignOutIcon size={16} color={tokens.textPrimary} />} onPress={logout}>
            Cerrar sesión
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Accesos rápidos ────────────────────────────────────────────────────────
function AccesosRapidos({ navigation }: { navigation: Props["navigation"] }) {
  const { tokens } = useTheme();
  const items: { icon: React.ReactNode; label: string; onPress: () => void }[] = [
    { icon: <MapPinLineIcon size={15} color={tokens.textSecondary} />, label: "Direcciones", onPress: () => navigation.navigate("Direcciones") },
    { icon: <WalletIcon size={15} color={tokens.textSecondary} />, label: "Billetera", onPress: () => navigation.navigate("Wallet") },
    { icon: <ShieldCheckIcon size={15} color={tokens.textSecondary} />, label: "Seguridad", onPress: () => navigation.navigate("Seguridad") },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {items.map((it) => (
        <Pressable key={it.label} onPress={it.onPress} style={[styles.accesoChip, { borderColor: tokens.border, backgroundColor: tokens.surface1 }]}>
          {it.icon}
          <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.textSecondary }}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Card>
      <Text style={{ fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{title}</Text>
      {!!description && <Text style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 3, marginBottom: 14 }}>{description}</Text>}
      <View style={{ gap: 18, marginTop: description ? 0 : 14 }}>{children}</View>
    </Card>
  );
}

// ─── Información personal: nombre, correo (con confirmación), teléfono ─────
// Nombre y correo comparten un cooldown de 14 días; el correo requiere código.
function diasRestantesCooldown(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86_400_000);
  return dias < 14 ? 14 - dias : null;
}

function InformacionPersonalSection() {
  const { tokens } = useTheme();
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  if (!usuario) return null;

  const cooldown = diasRestantesCooldown(usuario.datos_changed_at);
  const bloqueado = cooldown !== null;

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await authApi.actualizarPerfil({ nombre, email, telefono });
      actualizarUsuarioLocal(r.usuario);
      if (r.email_verificacion_enviado) {
        toast.show(`Te enviamos un código a ${email}. Confírmalo abajo. ${r.codigo_dev ? `(simulado: ${r.codigo_dev})` : ""}`, "info");
      } else {
        toast.show("Perfil actualizado", "success");
      }
      setEditando(false);
    } catch (err) {
      if (err instanceof ApiError && err.payload?.error === "cooldown_datos") {
        toast.show(`Solo puedes cambiar tu nombre o correo cada 14 días. Podrás hacerlo de nuevo en ${err.payload.dias_restantes} día(s).`, "error");
      } else if (err instanceof ApiError && err.payload?.error === "email_en_uso") {
        toast.show("Ese correo ya está en uso por otra cuenta.", "error");
      } else {
        toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
      }
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCodigo = async () => {
    if (!codigo.trim()) return;
    setConfirmando(true);
    try {
      const r = await authApi.emailVerificar(codigo.trim());
      actualizarUsuarioLocal(r.usuario);
      toast.show("Correo confirmado", "success");
      setCodigo("");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setConfirmando(false);
    }
  };

  const reenviarCodigo = async () => {
    setReenviando(true);
    try {
      const r = await authApi.emailReenviarCodigo();
      toast.show(`Nuevo código enviado (simulado: ${r.codigo_dev})`, "info");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo reenviar.", "error");
    } finally {
      setReenviando(false);
    }
  };

  const cancelarCambioEmail = async () => {
    try {
      await authApi.emailCancelar();
      actualizarUsuarioLocal({ ...usuario, email_pendiente: null });
      toast.show("Cambio de correo cancelado", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo cancelar.", "error");
    }
  };

  const cancelar = () => {
    setNombre(usuario.nombre);
    setEmail(usuario.email ?? "");
    setTelefono(usuario.telefono ?? "");
    setEditando(false);
  };

  return (
    <Section title="Información personal" description={bloqueado ? `Nombre y correo se pueden volver a cambiar en ${cooldown} día(s).` : undefined}>
      <View>
        {!editando && (
          <Pressable onPress={() => setEditando(true)} style={{ alignSelf: "flex-end", marginBottom: 10 }}>
            <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Editar</Text>
          </Pressable>
        )}

        {editando ? (
          <View style={{ gap: 14 }}>
            <Input label="Nombre" value={nombre} onChangeText={bloqueado ? () => {} : setNombre} hint={bloqueado ? `Disponible en ${cooldown} día(s)` : undefined} />
            <Input
              label="Correo"
              value={email}
              onChangeText={bloqueado ? () => {} : setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              hint={bloqueado ? `Disponible en ${cooldown} día(s)` : "Te enviaremos un código para confirmar el cambio."}
            />
            <PhoneInput value={telefono} onChangeText={setTelefono} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button size="sm" onPress={guardar} loading={guardando}>
                Guardar cambios
              </Button>
              <Button size="sm" variant="ghost" onPress={cancelar} disabled={guardando}>
                Cancelar
              </Button>
            </View>
          </View>
        ) : (
          <View>
            <InfoRow label="Nombre" value={usuario.nombre} />
            <InfoRow label="Correo" value={usuario.email ?? "Sin registrar"} last={!usuario.email_pendiente} />
            {!usuario.email_pendiente && <InfoRow label="Teléfono" value={usuario.telefono || "Sin registrar"} last />}
            {!!usuario.email_pendiente && (
              <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: tokens.border }}>
                <Text style={{ fontSize: 12.5, color: tokens.warn, fontFamily: "Inter_600SemiBold", marginBottom: 8 }}>Confirma tu nuevo correo: {usuario.email_pendiente}</Text>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                  <Input label="Código de 6 dígitos" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" style={{ flex: 1 }} />
                  <Button size="sm" onPress={confirmarCodigo} loading={confirmando}>
                    Confirmar
                  </Button>
                </View>
                <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                  <Pressable onPress={reenviarCodigo} disabled={reenviando}>
                    <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Reenviar código</Text>
                  </Pressable>
                  <Pressable onPress={cancelarCambioEmail}>
                    <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.danger }}>Cancelar cambio</Text>
                  </Pressable>
                </View>
                <InfoRow label="Teléfono" value={usuario.telefono || "Sin registrar"} last />
              </View>
            )}
          </View>
        )}
      </View>
    </Section>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: tokens.border, borderBottomWidth: last ? 0 : 1 }]}>
      <Text style={{ fontSize: 12.5, color: tokens.textMuted }}>{label}</Text>
      <Text numberOfLines={1} style={{ flex: 1, textAlign: "right", marginLeft: 12, fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{value}</Text>
    </View>
  );
}

// ─── Cuenta: solo nombre de usuario (la contraseña vive en Seguridad) ──────
function CuentaSection() {
  const { tokens } = useTheme();
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [editUsername, setEditUsername] = useState(false);
  const [username, setUsername] = useState(usuario?.username ?? "");
  const [guardandoUsername, setGuardandoUsername] = useState(false);

  if (!usuario) return null;

  const guardarUsername = async () => {
    setGuardandoUsername(true);
    try {
      const r = await authApi.actualizarPerfil({ username });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Nombre de usuario actualizado", "success");
      setEditUsername(false);
    } catch (err) {
      if (err instanceof ApiError && err.payload?.error === "cooldown_username") {
        toast.show(`Podrás cambiarlo de nuevo en ${err.payload.dias_restantes} día(s).`, "error");
      } else if (err instanceof ApiError && err.payload?.error === "username_taken") {
        toast.show("Ese nombre de usuario ya está en uso.", "error");
      } else {
        toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
      }
    } finally {
      setGuardandoUsername(false);
    }
  };

  return (
    <Section title="Cuenta">
      <View>
        <Row icon={<AtIcon size={16} color={tokens.textMuted} />} label="Nombre de usuario" value={usuario.username ? `@${usuario.username}` : "Sin definir"} editing={editUsername} onEdit={() => setEditUsername((v) => !v)} />
        {editUsername && (
          <View style={{ gap: 10, marginTop: 10 }}>
            <Input label="Nombre de usuario" value={username} onChangeText={setUsername} placeholder="mi_usuario" hint="Solo puedes cambiarlo una vez cada 14 días." autoCapitalize="none" />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button size="sm" onPress={guardarUsername} loading={guardandoUsername}>
                Guardar
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setEditUsername(false)} disabled={guardandoUsername}>
                Cancelar
              </Button>
            </View>
          </View>
        )}
      </View>
    </Section>
  );
}

function Row({ icon, label, value, editing, onEdit }: { icon: React.ReactNode; label: string; value: string; editing: boolean; onEdit: () => void }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: tokens.textMuted }}>{label}</Text>
        <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{value}</Text>
      </View>
      <Pressable onPress={onEdit}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan }}>{editing ? "Cerrar" : "Editar"}</Text>
      </Pressable>
    </View>
  );
}

// ─── Seguridad: tarjeta compacta que enlaza a la pantalla dedicada ─────────
function SeguridadSection({ navigation }: { navigation: Props["navigation"] }) {
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  if (!usuario) return null;

  return (
    <Section title="Seguridad" description="Verificación de teléfono, contraseña y sesiones activas.">
      <Button variant="secondary" fullWidth icon={<ShieldCheckIcon size={16} color={tokens.textPrimary} />} onPress={() => navigation.navigate("Seguridad")}>
        Ver seguridad
      </Button>
    </Section>
  );
}

// ─── Preferencias ───────────────────────────────────────────────────────────
const IDIOMAS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
] as const;

function PreferenciasSection() {
  const { tokens, theme, setTheme } = useTheme();
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();

  if (!usuario) return null;

  const cambiarIdioma = async (idioma: "es" | "en" | "fr") => {
    actualizarUsuarioLocal({ ...usuario, idioma });
    try {
      await authApi.actualizarIdioma(idioma);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  return (
    <Section title="Preferencias">
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <GlobeIcon size={16} color={tokens.textMuted} />
          <Text style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>Idioma</Text>
        </View>
        <Text style={{ fontSize: 11.5, color: tokens.textMuted, marginBottom: 10, paddingLeft: 26 }}>Se usará para futuras comunicaciones de tu cuenta.</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {IDIOMAS.map((i) => (
            <Chip key={i.value} active={(usuario.idioma ?? "es") === i.value} onPress={() => cambiarIdioma(i.value)} label={i.label} />
          ))}
        </View>
      </View>

      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <SunIcon size={16} color={tokens.textMuted} />
          <Text style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>Apariencia</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip active={theme === "light"} onPress={() => setTheme("light")} label="Claro" icon={<SunIcon size={13} color={theme === "light" ? tokens.cyan : tokens.textSecondary} />} />
          <Chip active={theme === "dark"} onPress={() => setTheme("dark")} label="Oscuro" icon={<MoonIcon size={13} color={theme === "dark" ? tokens.cyan : tokens.textSecondary} />} />
          <Chip active={theme === "system"} onPress={() => setTheme("system")} label="Sistema" icon={<MonitorIcon size={13} color={theme === "system" ? tokens.cyan : tokens.textSecondary} />} />
        </View>
      </View>
    </Section>
  );
}

function Chip({ active, onPress, label, icon }: { active: boolean; onPress: () => void; label: string; icon?: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: active ? tokens.cyan : tokens.border, backgroundColor: active ? tokens.cyanBg : tokens.surface1 }]}>
      {icon}
      <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: active ? tokens.cyan : tokens.textSecondary }}>{label}</Text>
    </Pressable>
  );
}

// ─── Métodos de pago ────────────────────────────────────────────────────────
function PagosSection() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [metodos, setMetodos] = useState<MetodoPago[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [numero, setNumero] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<number | null>(null);

  const cargar = () => {
    carritoApi.metodosListar().then((r) => setMetodos(r.metodos)).catch(() => setMetodos([]));
  };
  useEffect(cargar, []);

  const agregar = async () => {
    if (numero.replace(/\D/g, "").length < 12 || !exp || cvv.length < 3) return toast.show("Completa los datos de la tarjeta.", "warning");
    setGuardando(true);
    try {
      await carritoApi.metodosGuardar({ tarjeta_numero: numero.replace(/\D/g, ""), tarjeta_exp: exp, tarjeta_cvv: cvv, predeterminado: !metodos?.length });
      toast.show("Tarjeta agregada", "success");
      setNumero("");
      setExp("");
      setCvv("");
      setFormOpen(false);
      cargar();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo agregar la tarjeta.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Section title="Métodos de pago">
      {metodos === null ? (
        <Skeleton height={50} />
      ) : metodos.length === 0 && !formOpen ? (
        <EmptyState icon={<CreditCardIcon size={22} color={tokens.textMuted} />} title="Sin tarjetas guardadas" description="Agrega una tarjeta para pagar más rápido." actionLabel="Agregar tarjeta" onAction={() => setFormOpen(true)} />
      ) : (
        <View style={{ gap: 10 }}>
          {metodos.map((m) => (
            <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <CreditCardIcon size={18} color={tokens.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary, textTransform: "capitalize" }}>
                  {m.marca} •••• {m.ultimos4}
                </Text>
                <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>
                  Vence {String(m.exp_mes).padStart(2, "0")}/{m.exp_anio}
                  {!!m.predeterminado && " · Predeterminada"}
                </Text>
              </View>
              {!m.predeterminado && (
                <Pressable onPress={() => carritoApi.metodosPredeterminado(m.id).then(cargar)}>
                  <Text style={{ fontSize: 11.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Usar</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setEliminando(m.id)}>
                <TrashIcon size={15} color={tokens.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {formOpen ? (
        <View style={{ gap: 10 }}>
          <Input label="Número de tarjeta" value={numero} onChangeText={setNumero} placeholder="4111 1111 1111 1111" keyboardType="number-pad" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Input label="MM/AA" value={exp} onChangeText={setExp} placeholder="12/28" style={{ flex: 1 }} />
            <Input label="CVV" value={cvv} onChangeText={setCvv} placeholder="123" keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button size="sm" onPress={agregar} loading={guardando}>
              Guardar tarjeta
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setFormOpen(false)} disabled={guardando}>
              Cancelar
            </Button>
          </View>
        </View>
      ) : (
        metodos !== null &&
        metodos.length > 0 && (
          <Button size="sm" variant="secondary" icon={<PlusIcon size={14} color={tokens.textPrimary} />} onPress={() => setFormOpen(true)} style={{ alignSelf: "flex-start" }}>
            Agregar tarjeta
          </Button>
        )
      )}

      <ConfirmDialog
        visible={eliminando !== null}
        title="¿Eliminar esta tarjeta?"
        description="No podrás deshacer esta acción."
        danger
        confirmLabel="Eliminar"
        onCancel={() => setEliminando(null)}
        onConfirm={async () => {
          if (eliminando === null) return;
          try {
            await carritoApi.metodosEliminar(eliminando);
            setEliminando(null);
            cargar();
          } catch (err) {
            toast.show(err instanceof ApiError ? err.message : "No se pudo eliminar.", "error");
          }
        }}
      />
    </Section>
  );
}

// ─── Convertirse en socio ────────────────────────────────────────────────
function RolSection({ navigation }: { navigation: Props["navigation"] }) {
  const { tokens } = useTheme();
  const { usuario } = useAuth();
  if (!usuario || usuario.rol !== "comprador") return null;

  return (
    <Section title="Convertirse en socio" description="Abre tu tienda o entrega pedidos y gana con SV[Go].">
      <Button variant="secondary" fullWidth icon={<HandshakeIcon size={16} color={tokens.textPrimary} />} onPress={() => navigation.navigate("Convertirse")}>
        Ver opciones
      </Button>
    </Section>
  );
}

// ─── Soporte ─────────────────────────────────────────────────────────────
function SoporteSection({ navigation }: { navigation: Props["navigation"] }) {
  const { tokens } = useTheme();
  return (
    <Section title="Soporte">
      <Pressable onPress={() => navigation.navigate("Soporte")} style={[styles.navRow, { borderColor: tokens.border }]}>
        <HeadsetIcon size={17} color={tokens.textMuted} />
        <Text style={{ flex: 1, fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>Contactar soporte</Text>
      </Pressable>
    </Section>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  accesoChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
});
