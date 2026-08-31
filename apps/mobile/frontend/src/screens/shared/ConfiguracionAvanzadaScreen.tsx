import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import {
  AtIcon,
  CaretLeftIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeIcon,
  KeyIcon,
  LaptopIcon,
  MoonIcon,
  MonitorIcon,
  PlusIcon,
  ProhibitIcon,
  ShieldCheckIcon,
  SunIcon,
  TrashIcon,
} from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authApi, carritoApi, ApiError } from "../../lib/api";
import type { MetodoPago } from "../../lib/types";
import { formatDateTime, relativeTime } from "../../lib/format";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

type Props = NativeStackScreenProps<RootStackParamList, "Configuracion">;

export function ConfiguracionAvanzadaScreen({ navigation }: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={navigation.goBack} style={[styles.backBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <CaretLeftIcon size={16} color={tokens.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Configuración avanzada</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <CuentaSection />
        <PrivacidadSection />
        <SeguridadSection />
        <PreferenciasSection />
        <PagosSection />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { tokens } = useTheme();
  return (
    <Card>
      <Text style={{ fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 14 }}>{title}</Text>
      <View style={{ gap: 18 }}>{children}</View>
    </Card>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const { tokens } = useTheme();
  const x = useSharedValue(on ? 1 : 0);
  x.value = withTiming(on ? 1 : 0, { duration: 180 });
  const knobStyle = useAnimatedStyle(() => ({ left: 3 + x.value * 18 }));

  return (
    <Pressable onPress={onToggle} style={[styles.switchTrack, { backgroundColor: on ? tokens.cyan : tokens.surface3 }]}>
      <Animated.View style={[styles.switchKnob, knobStyle]} />
    </Pressable>
  );
}

// ─── Cuenta ─────────────────────────────────────────────────────────────────
function CuentaSection() {
  const { tokens } = useTheme();
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [editUsername, setEditUsername] = useState(false);
  const [username, setUsername] = useState(usuario?.username ?? "");
  const [guardandoUsername, setGuardandoUsername] = useState(false);

  const [editPassword, setEditPassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);

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

  const guardarPassword = async () => {
    if (passwordNueva.length < 6) return toast.show("La nueva contraseña debe tener al menos 6 caracteres.", "warning");
    if (passwordNueva !== passwordConfirmar) return toast.show("Las contraseñas no coinciden.", "warning");
    setGuardandoPassword(true);
    try {
      await authApi.actualizarPerfil({ password_actual: passwordActual, password_nueva: passwordNueva });
      toast.show("Contraseña actualizada", "success");
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
      setEditPassword(false);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar la contraseña.", "error");
    } finally {
      setGuardandoPassword(false);
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

      {usuario.auth_provider === "local" && (
        <View>
          <Row icon={<KeyIcon size={16} color={tokens.textMuted} />} label="Contraseña" value="••••••••" editing={editPassword} onEdit={() => setEditPassword((v) => !v)} />
          {editPassword && (
            <View style={{ gap: 10, marginTop: 10 }}>
              <Input label="Contraseña actual" value={passwordActual} onChangeText={setPasswordActual} secureTextEntry />
              <Input label="Contraseña nueva" value={passwordNueva} onChangeText={setPasswordNueva} secureTextEntry />
              <Input label="Confirmar contraseña nueva" value={passwordConfirmar} onChangeText={setPasswordConfirmar} secureTextEntry />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button size="sm" onPress={guardarPassword} loading={guardandoPassword}>
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" onPress={() => setEditPassword(false)} disabled={guardandoPassword}>
                  Cancelar
                </Button>
              </View>
            </View>
          )}
        </View>
      )}
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

// ─── Privacidad ─────────────────────────────────────────────────────────────
function PrivacidadSection() {
  const { tokens } = useTheme();
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [bloqueados, setBloqueados] = useState<{ id: number; bloqueado_id: number; created_at: string; nombre: string; username: string | null; foto_perfil: string | null }[] | null>(null);

  useEffect(() => {
    authApi.usuariosBloqueados().then((r) => setBloqueados(r.bloqueados)).catch(() => setBloqueados([]));
  }, []);

  if (!usuario) return null;

  const togglePublico = async () => {
    const nuevo = !usuario.perfil_publico;
    actualizarUsuarioLocal({ ...usuario, perfil_publico: nuevo ? 1 : 0 });
    try {
      await authApi.actualizarVisibilidad(nuevo);
    } catch (err) {
      actualizarUsuarioLocal(usuario);
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    }
  };

  const desbloquear = async (bloqueadoId: number) => {
    setBloqueados((prev) => prev?.filter((b) => b.bloqueado_id !== bloqueadoId) ?? null);
    try {
      await authApi.desbloquearUsuario(bloqueadoId);
      toast.show("Usuario desbloqueado", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo desbloquear.", "error");
    }
  };

  return (
    <Section title="Privacidad">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {usuario.perfil_publico ? <EyeIcon size={16} color={tokens.textMuted} /> : <EyeSlashIcon size={16} color={tokens.textMuted} />}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>Perfil público</Text>
          <Text style={{ fontSize: 12, color: tokens.textSecondary }}>Otros usuarios pueden ver tu perfil y reseñas.</Text>
        </View>
        <Switch on={!!usuario.perfil_publico} onToggle={togglePublico} />
      </View>

      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: bloqueados?.length ? 10 : 0 }}>
          <ProhibitIcon size={16} color={tokens.textMuted} />
          <Text style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>Usuarios bloqueados {bloqueados ? `(${bloqueados.length})` : ""}</Text>
        </View>
        {bloqueados === null ? (
          <Skeleton height={40} />
        ) : bloqueados.length === 0 ? (
          <Text style={{ fontSize: 12, color: tokens.textMuted, paddingLeft: 26 }}>No has bloqueado a nadie.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {bloqueados.map((b) => (
              <View key={b.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar nombre={b.nombre} foto={b.foto_perfil} size={30} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{b.nombre}</Text>
                  <Text style={{ fontSize: 11, color: tokens.textMuted }}>Bloqueado el {formatDateTime(b.created_at)}</Text>
                </View>
                <Pressable onPress={() => desbloquear(b.bloqueado_id)}>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Desbloquear</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </Section>
  );
}

// ─── Seguridad ──────────────────────────────────────────────────────────────
function SeguridadSection() {
  const { tokens } = useTheme();
  const { usuario, actualizarUsuarioLocal } = useAuth();
  const toast = useToast();
  const [enviandoSms, setEnviandoSms] = useState(false);
  const [codigoEnviado, setCodigoEnviado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);

  const [sesiones, setSesiones] = useState<{ id: number; user_agent: string; ip: string; created_at: string; last_seen_at: string; es_actual: boolean }[] | null>(null);
  const [cerrandoOtras, setCerrandoOtras] = useState(false);

  const cargarSesiones = () => {
    authApi.sesionesListar().then((r) => setSesiones(r.sesiones)).catch(() => setSesiones([]));
  };
  useEffect(() => {
    cargarSesiones();
  }, []);

  if (!usuario) return null;

  const enviarSms = async () => {
    setEnviandoSms(true);
    try {
      const r = await authApi.enviarSms();
      setCodigoEnviado(r.codigo);
      toast.show(`Código: ${r.codigo} (simulado, no hay proveedor SMS real)`, "info");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo enviar el código.", "error");
    } finally {
      setEnviandoSms(false);
    }
  };

  const verificar = async () => {
    if (!codigo.trim()) return;
    setVerificando(true);
    try {
      const r = await authApi.verificarSms(codigo.trim());
      actualizarUsuarioLocal(r.usuario);
      toast.show("Teléfono verificado", "success");
      setCodigoEnviado(null);
      setCodigo("");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Código inválido.", "error");
    } finally {
      setVerificando(false);
    }
  };

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
      cargarSesiones();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo completar.", "error");
    } finally {
      setCerrandoOtras(false);
    }
  };

  return (
    <Section title="Seguridad">
      {!!usuario.telefono && (
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <DeviceMobileIcon size={16} color={tokens.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{usuario.telefono}</Text>
              <Text style={{ fontSize: 12, color: usuario.telefono_verificado ? tokens.ok : tokens.textSecondary }}>{usuario.telefono_verificado ? "Verificado" : "Sin verificar"}</Text>
            </View>
            {!usuario.telefono_verificado && (
              <Button size="sm" variant="secondary" onPress={enviarSms} loading={enviandoSms}>
                Verificar
              </Button>
            )}
          </View>
          {codigoEnviado && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignItems: "flex-end" }}>
              <Input label="Código de 6 dígitos" value={codigo} onChangeText={setCodigo} keyboardType="number-pad" style={{ flex: 1 }} />
              <Button size="sm" onPress={verificar} loading={verificando}>
                Confirmar
              </Button>
            </View>
          )}
        </View>
      )}

      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <ShieldCheckIcon size={16} color={tokens.textMuted} />
          <Text style={{ flex: 1, fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>Sesiones activas</Text>
          {!!sesiones?.length && sesiones.length > 1 && (
            <Pressable onPress={cerrarOtras} disabled={cerrandoOtras}>
              <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.danger }}>Cerrar las demás</Text>
            </Pressable>
          )}
        </View>
        {sesiones === null ? (
          <Skeleton height={60} />
        ) : (
          <View style={{ gap: 10 }}>
            {sesiones.map((s) => (
              <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {/Mobi|Android|iPhone/i.test(s.user_agent) ? <DeviceMobileIcon size={16} color={tokens.textMuted} /> : <LaptopIcon size={16} color={tokens.textMuted} />}
                <View style={{ flex: 1 }}>
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
          </View>
        )}
      </View>
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

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  switchTrack: { width: 42, height: 24, borderRadius: 12, justifyContent: "center" },
  switchKnob: { position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
