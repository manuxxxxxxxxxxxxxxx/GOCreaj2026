import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { useLang } from '@/context/LangContext';
import { useTheme } from '@/context/ThemeContext';
import { api, Endpoints } from '@/services/api';
import { Spacing, Radius, Fonts } from '@/theme/colors';
import { RootStackParamList } from '@/types';
import Button from '@/components/Button';
import Input from '@/components/Input';
import ScreenHeader from '@/components/ScreenHeader';
import ScreenScroll from '@/components/ScreenScroll';
import EarningsChart from '@/components/EarningsChart';

type Nav = NavigationProp<RootStackParamList>;

const ROL_LABEL: Record<string, string> = { comprador: 'Usuario', vendedor: 'Vendedor', repartidor: 'Repartidor' };

function SectionLabel({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{label}</Text>;
}

function Row({
  icon, iconBg, iconColor, title, sub, onPress, right, colors,
}: {
  icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string;
  title: string; sub?: string; onPress?: () => void; right?: React.ReactNode;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: colors.muted }]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />)}
    </TouchableOpacity>
  );
}

export default function MiCuentaScreen() {
  const { colors: c, isDark, toggleTheme } = useTheme();
  const { usuario, cerrarSesion, refrescar } = useAuth();
  const { t, lang, cambiarIdioma } = useLang();
  const nav = useNavigation<Nav>();

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [username, setUsername] = useState(usuario?.username ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [roles, setRoles] = useState<string[]>([]);
  const [rolActivo, setRolActivo] = useState<string>(usuario?.rol ?? 'comprador');
  const [cambiandoRol, setCambiandoRol] = useState(false);

  // Privacidad y seguridad
  const [showPrivacidad, setShowPrivacidad] = useState(false);
  const [privTab, setPrivTab] = useState<'sesiones' | 'bloqueados' | 'cuenta'>('sesiones');
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [bloqueados, setBloqueados] = useState<any[]>([]);
  const [cargandoPriv, setCargandoPriv] = useState(false);
  const [perfilPublico, setPerfilPublico] = useState(true);
  const [showEliminarCuenta, setShowEliminarCuenta] = useState(false);
  const [passEliminar, setPassEliminar] = useState('');
  const [eliminando, setEliminando] = useState(false);

  // Métodos de pago guardados
  const [showMetodosPago, setShowMetodosPago] = useState(false);
  const [metodosPago, setMetodosPago] = useState<any[]>([]);
  const [cargandoMetodos, setCargandoMetodos] = useState(false);
  const [mostrarFormTarjeta, setMostrarFormTarjeta] = useState(false);
  const [mpNumero, setMpNumero] = useState('');
  const [mpExp, setMpExp] = useState('');
  const [mpCvv, setMpCvv] = useState('');
  const [guardandoTarjeta, setGuardandoTarjeta] = useState(false);

  const abrirMetodosPago = async () => {
    setShowMetodosPago(true);
    setCargandoMetodos(true);
    try {
      const r = await api<{ ok: boolean; metodos?: any[] }>(Endpoints.metodosPagoListar);
      if (r.ok) setMetodosPago(r.metodos ?? []);
    } catch {}
    setCargandoMetodos(false);
  };

  const guardarTarjetaNueva = async () => {
    setGuardandoTarjeta(true);
    try {
      const r = await api<{ ok: boolean; error?: string }>(Endpoints.metodosPagoGuardar, {
        body: { tarjeta_numero: mpNumero.replace(/\s/g, ''), tarjeta_cvv: mpCvv, tarjeta_exp: mpExp },
      });
      if (r.ok) {
        setMpNumero(''); setMpExp(''); setMpCvv('');
        setMostrarFormTarjeta(false);
        await abrirMetodosPago();
      } else {
        Alert.alert('Error', r.error ?? 'No se pudo guardar la tarjeta.');
      }
    } catch { Alert.alert('Error', 'Sin conexión.'); }
    setGuardandoTarjeta(false);
  };

  const eliminarTarjeta = async (id: number) => {
    await api(Endpoints.metodosPagoEliminar, { body: { id } });
    setMetodosPago(prev => prev.filter(m => m.id !== id));
  };

  const marcarPredeterminada = async (id: number) => {
    await api(Endpoints.metodosPagoPredeterminado, { body: { id } });
    setMetodosPago(prev => prev.map(m => ({ ...m, predeterminado: m.id === id ? 1 : 0 })));
  };

  useEffect(() => {
    (async () => {
      const r = await api<{ ok: boolean; roles?: string[]; rol_activo?: string }>(Endpoints.authMisRoles);
      if (r.ok) { setRoles(r.roles ?? []); setRolActivo(r.rol_activo ?? usuario?.rol ?? 'comprador'); }
    })();
  }, []);

  useEffect(() => { setPerfilPublico((usuario?.perfil_publico ?? 1) !== 0); }, [usuario?.perfil_publico]);

  // Ganancias / tiempo trabajado (vendedor y repartidor)
  const [gananciasPorDia, setGananciasPorDia] = useState<{ fecha: string; monto: number }[]>([]);
  const [productoTop, setProductoTop] = useState<{ nombre: string; total_vendido: number } | null>(null);
  const [minutosPorDia, setMinutosPorDia] = useState<{ fecha: string; minutos: number }[]>([]);
  const [cargandoGanancias, setCargandoGanancias] = useState(false);

  useEffect(() => {
    if (usuario?.rol === 'vendedor') {
      setCargandoGanancias(true);
      api<{ ok: boolean; ganancias_por_dia?: any[]; producto_top?: any }>(Endpoints.vendedorGanancias)
        .then(r => {
          if (r.ok) {
            setGananciasPorDia(r.ganancias_por_dia ?? []);
            setProductoTop(r.producto_top ?? null);
          }
        })
        .catch(() => {})
        .finally(() => setCargandoGanancias(false));
    } else if (usuario?.rol === 'repartidor') {
      setCargandoGanancias(true);
      api<{ ok: boolean; ganancias_por_dia?: any[]; minutos_por_dia?: any[] }>(Endpoints.repartidorGanancias)
        .then(r => {
          if (r.ok) {
            setGananciasPorDia(r.ganancias_por_dia ?? []);
            setMinutosPorDia(r.minutos_por_dia ?? []);
          }
        })
        .catch(() => {})
        .finally(() => setCargandoGanancias(false));
    }
  }, [usuario?.rol]);

  const fmtDia = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00');
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const abrirPrivacidad = async () => {
    setShowPrivacidad(true);
    setCargandoPriv(true);
    try {
      const [rs, rb] = await Promise.all([
        api<{ ok: boolean; sesiones?: any[] }>(Endpoints.authSesionesListar),
        api<{ ok: boolean; bloqueados?: any[] }>(Endpoints.authUsuariosBloqueados),
      ]);
      if (rs.ok) setSesiones(rs.sesiones ?? []);
      if (rb.ok) setBloqueados(rb.bloqueados ?? []);
    } catch {}
    setCargandoPriv(false);
  };

  const cerrarSesionRemota = async (id: number) => {
    await api(Endpoints.authSesionesCerrar, { body: { id } });
    setSesiones(prev => prev.filter(s => s.id !== id));
  };

  const cerrarOtrasSesiones = () => {
    Alert.alert('Cerrar otras sesiones', '¿Cerrar la sesión en todos tus otros dispositivos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar todas', style: 'destructive', onPress: async () => {
          await api(Endpoints.authSesionesCerrarOtras);
          setSesiones(prev => prev.filter(s => s.es_actual));
        },
      },
    ]);
  };

  const desbloquearUsuario = async (usuario_id: number) => {
    await api(Endpoints.authDesbloquearUsuario, { body: { usuario_id } });
    setBloqueados(prev => prev.filter(b => b.bloqueado_id !== usuario_id));
  };

  const cambiarVisibilidad = async (val: boolean) => {
    setPerfilPublico(val);
    await api(Endpoints.authActualizarVisibilidad, { body: { perfil_publico: val } });
    await refrescar();
  };

  const confirmarEliminarCuenta = async () => {
    if (usuario?.auth_provider === 'local' && !passEliminar) {
      Alert.alert('Falta tu contraseña', 'Ingresa tu contraseña actual para confirmar.');
      return;
    }
    setEliminando(true);
    try {
      const r = await api<{ ok: boolean; error?: string }>(Endpoints.authEliminarCuenta, { body: { password: passEliminar } });
      if (r.ok) {
        await cerrarSesion();
      } else {
        Alert.alert('Error', r.error === 'Contraseña incorrecta' ? 'Contraseña incorrecta.' : (r.error ?? 'No se pudo eliminar la cuenta.'));
      }
    } catch { Alert.alert('Error', 'Sin conexión.'); }
    setEliminando(false);
  };

  const diasRestantesUsername = (() => {
    if (!usuario?.username_changed_at) return 0;
    const changed = new Date(usuario.username_changed_at).getTime();
    const daysPassed = Math.floor((Date.now() - changed) / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - daysPassed);
  })();
  const usernameBloqueado = diasRestantesUsername > 0;

  async function guardarDatos() {
    setGuardando(true);
    try {
      const body: Record<string, unknown> = {};
      if (nombre !== usuario?.nombre) body.nombre = nombre;
      if (username !== (usuario?.username ?? '')) body.username = username;
      if (email !== (usuario?.email ?? '')) body.email = email;
      if (telefono !== (usuario?.telefono ?? '')) body.telefono = telefono;
      if (passNueva) { body.password_actual = passActual; body.password_nueva = passNueva; }

      const r = await api<{ ok: boolean; error?: string }>(Endpoints.authActualizarPerfil, { body });
      if (r.ok) {
        await refrescar();
        setEditando(false);
        setPassActual(''); setPassNueva('');
        Alert.alert('Listo', 'Tus datos se actualizaron correctamente.');
      } else {
        const msg = r.error === 'username_taken' ? 'Ese usuario ya está en uso.'
          : r.error === 'cooldown_username' ? 'Ya cambiaste tu usuario recientemente. Espera unos días más.'
          : (r.error ?? 'No se pudo guardar.');
        Alert.alert('Error', msg);
      }
    } catch { Alert.alert('Error', 'Sin conexión.'); }
    setGuardando(false);
  }

  async function cambiarRol(rol: string) {
    if (rol === rolActivo) return;
    setCambiandoRol(true);
    const r = await api<{ ok: boolean; error?: string; mensaje?: string }>(Endpoints.authCambiarRol, { body: { rol } });
    setCambiandoRol(false);
    if (r.ok) {
      setRolActivo(rol);
      await refrescar();
      Alert.alert('Listo', `Ahora estás usando la app como ${ROL_LABEL[rol] ?? rol}.`);
    } else if (r.error === 'no_habilitado') {
      Alert.alert(
        'Aún no tienes ese rol',
        r.mensaje ?? 'Necesitas solicitarlo primero.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Convertirme en socio', onPress: () => nav.navigate('BecomeSeller', { rol: rol === 'repartidor' ? 'repartidor' : 'vendedor' }) },
        ],
      );
    } else {
      Alert.alert('Error', r.error ?? 'No se pudo cambiar de rol.');
    }
  }

  const confirmarLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void cerrarSesion() },
    ]);
  };

  const rolesDisponibles = ['comprador', 'vendedor', 'repartidor'];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader title="Mi cuenta" />

      <ScreenScroll>
        <SectionLabel label="Datos de cuenta" color={c.muted} />
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {!editando ? (
            <>
              <Row icon="person-outline" iconBg={c.accentLight} iconColor={c.accent} title={usuario?.nombre ?? ''} sub="Nombre completo" colors={c} />
              <Row icon="at-outline" iconBg={c.accentLight} iconColor={c.accent} title={usuario?.username ?? '—'} sub="Usuario" colors={c} />
              <Row icon="mail-outline" iconBg={c.accentLight} iconColor={c.accent} title={usuario?.email || '—'} sub="Correo electrónico" colors={c} />
              <Row icon="call-outline" iconBg={c.accentLight} iconColor={c.accent} title={usuario?.telefono || '—'} sub="Teléfono" colors={c} />
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: c.accent }]} onPress={() => setEditando(true)} activeOpacity={0.85}>
                <Ionicons name="pencil-outline" size={16} color="#FFF" />
                <Text style={styles.editBtnTxt}>Editar datos de cuenta</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ padding: Spacing.md }}>
              <Input label="Nombre completo" icon="person-outline" value={nombre} onChangeText={setNombre} />
              <Input label="Usuario" icon="at-outline" value={username} onChangeText={setUsername} autoCapitalize="none" editable={!usernameBloqueado} />
              {usernameBloqueado && (
                <Text style={{ color: c.warning, fontSize: 12, marginBottom: 8 }}>
                  Podrás cambiar tu usuario de nuevo en {diasRestantesUsername} día{diasRestantesUsername === 1 ? '' : 's'}.
                </Text>
              )}
              <Input label="Correo electrónico" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Input label="Teléfono" icon="call-outline" value={telefono} onChangeText={setTelefono} inputType="phone" />
              <Input label="Contraseña actual" icon="lock-closed-outline" value={passActual} onChangeText={setPassActual} secureTextEntry />
              <Input label="Contraseña nueva" icon="lock-open-outline" value={passNueva} onChangeText={setPassNueva} secureTextEntry />
              <Button label="Guardar cambios" icon="checkmark-outline" onPress={guardarDatos} loading={guardando} />
              <TouchableOpacity onPress={() => setEditando(false)} style={{ alignItems: 'center', marginTop: 10 }}>
                <Text style={{ color: c.muted, fontWeight: '700' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {usuario?.rol === 'vendedor' && (
          <>
            <SectionLabel label="Ganancias" color={c.muted} />
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, padding: Spacing.md }]}>
              {cargandoGanancias ? <ActivityIndicator color={c.accent} /> : (
                <>
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 13, marginBottom: 4 }}>Dinero ganado por día</Text>
                  <EarningsChart
                    labels={gananciasPorDia.map(g => fmtDia(g.fecha))}
                    values={gananciasPorDia.map(g => Number(g.monto))}
                    accent={c.accent} cardBg={c.card} textColor={c.text} mutedColor={c.muted}
                    yPrefix="$" emptyText="Aún no tienes ventas entregadas para graficar."
                  />
                  {productoTop && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: 10 }}>
                      <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontWeight: '800', fontSize: 13 }}>Producto más vendido</Text>
                        <Text style={{ color: c.muted, fontSize: 12 }}>{productoTop.nombre} · {productoTop.total_vendido} vendidos</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {usuario?.rol === 'repartidor' && (
          <>
            <SectionLabel label="Ganancias y tiempo" color={c.muted} />
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, padding: Spacing.md }]}>
              {cargandoGanancias ? <ActivityIndicator color={c.accent} /> : (
                <>
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 13, marginBottom: 4 }}>Dinero ganado por día</Text>
                  <EarningsChart
                    labels={gananciasPorDia.map(g => fmtDia(g.fecha))}
                    values={gananciasPorDia.map(g => Number(g.monto))}
                    accent={c.accent} cardBg={c.card} textColor={c.text} mutedColor={c.muted}
                    yPrefix="$" emptyText="Aún no tienes entregas completadas para graficar."
                  />
                  <Text style={{ color: c.text, fontWeight: '800', fontSize: 13, marginTop: Spacing.md, marginBottom: 4 }}>Tiempo invertido por día (min)</Text>
                  <EarningsChart
                    labels={minutosPorDia.map(m => fmtDia(m.fecha))}
                    values={minutosPorDia.map(m => Number(m.minutos))}
                    accent="#8B5CF6" cardBg={c.card} textColor={c.text} mutedColor={c.muted}
                    ySuffix="m" emptyText="Aún no hay suficientes datos de tiempo de entrega."
                  />
                </>
              )}
            </View>
          </>
        )}

        <SectionLabel label="Historial" color={c.muted} />
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Row
            icon="receipt-outline" iconBg={c.accentLight} iconColor={c.accent}
            title="Historial de pedidos" sub="Todas tus compras"
            onPress={() => nav.navigate('Main', { screen: 'Pedidos' } as never)}
            colors={c}
          />
        </View>

        <SectionLabel label="Soporte" color={c.muted} />
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Row icon="help-circle-outline" iconBg={c.accentLight} iconColor={c.accent} title="Soporte y ayuda" sub="Tickets y reportes" onPress={() => nav.navigate('Support')} colors={c} />
          <Row
            icon="information-circle-outline" iconBg={c.accentLight} iconColor={c.accent}
            title="Más información de nosotros" sub="Quiénes somos y cómo funciona [SV]Go"
            onPress={() => Alert.alert(
              'Sobre [SV]Go',
              '[SV]Go conecta a comercios locales de El Salvador con compradores y repartidores de su misma zona. Nuestra misión es que cualquier negocio pequeño pueda vender en línea y que cada pedido llegue rápido, de mano de repartidores de la comunidad.',
            )}
            colors={c}
          />
        </View>

        <SectionLabel label="Configuración" color={c.muted} />
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Row
            icon={isDark ? 'moon' : 'sunny'} iconBg={isDark ? c.accentLight : 'rgba(251,191,36,0.12)'} iconColor={isDark ? c.accent : '#F59E0B'}
            title={`Modo ${isDark ? 'oscuro' : 'claro'}`} colors={c}
            right={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: c.border, true: c.accent }} thumbColor="#FFF" />}
          />
          <Row
            icon="globe-outline" iconBg={c.accentLight} iconColor={c.accent}
            title="Idioma" sub={lang === 'es' ? 'Español' : lang === 'en' ? 'English' : 'Français'}
            onPress={cambiarIdioma} colors={c}
          />
          {usuario?.rol === 'comprador' && (
            <Row icon="card-outline" iconBg={c.accentLight} iconColor={c.accent} title="Métodos de pago" sub="Tarjetas guardadas" onPress={abrirMetodosPago} colors={c} />
          )}
          <Row icon="shield-checkmark-outline" iconBg={c.accentLight} iconColor={c.accent} title="Privacidad y seguridad" onPress={abrirPrivacidad} colors={c} />

          <View style={{ padding: Spacing.md }}>
            <Text style={[styles.rowTitle, { color: c.text, marginBottom: 8 }]}>Cambiar de rol activo</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {rolesDisponibles.map(r => {
                const activo = r === rolActivo;
                const habilitado = roles.includes(r);
                return (
                  <TouchableOpacity
                    key={r}
                    disabled={cambiandoRol}
                    onPress={() => cambiarRol(r)}
                    style={[styles.rolChip, {
                      backgroundColor: activo ? c.accent : c.elevated,
                      borderColor: activo ? c.accent : c.border,
                    }]}
                  >
                    <Text style={{ color: activo ? '#FFF' : c.text, fontWeight: '700', fontSize: 12 }}>
                      {ROL_LABEL[r]}{!habilitado ? ' (solicitar)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {usuario?.rol === 'comprador' && (
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: c.accentLight, marginTop: Spacing.sm }]}
            onPress={() => nav.navigate('BecomeSeller')}
          >
            <Ionicons name="briefcase-outline" size={16} color={c.accent} />
            <Text style={[styles.editBtnTxt, { color: c.accent }]}>Convertirse en socio</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: 'rgba(239,68,68,0.1)', marginTop: Spacing.md }]}
          onPress={confirmarLogout}
        >
          <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          <Text style={[styles.editBtnTxt, { color: '#EF4444' }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScreenScroll>

      {/* ── Modal: Privacidad y seguridad ── */}
      <Modal visible={showPrivacidad} animationType="slide" onRequestClose={() => setShowPrivacidad(false)}>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <ScreenHeader title="Privacidad y seguridad" onBack={() => setShowPrivacidad(false)} />

          <View style={{ flexDirection: 'row', padding: Spacing.md, gap: 8 }}>
            {([
              { key: 'sesiones', label: 'Sesiones', icon: 'phone-portrait-outline' },
              { key: 'bloqueados', label: 'Bloqueados', icon: 'ban-outline' },
              { key: 'cuenta', label: 'Cuenta', icon: 'person-remove-outline' },
            ] as const).map(o => {
              const active = privTab === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  onPress={() => setPrivTab(o.key)}
                  style={{
                    flex: 1, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1.5,
                    borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accent : c.card,
                    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5,
                  }}
                >
                  <Ionicons name={o.icon as any} size={14} color={active ? '#FFF' : c.muted} />
                  <Text style={{ color: active ? '#FFF' : c.text, fontWeight: '700', fontSize: 12 }}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScreenScroll>
            {privTab === 'sesiones' && (
              cargandoPriv ? <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} /> : (
                <>
                  <Text style={{ color: c.muted, fontSize: 12, marginBottom: 10, lineHeight: 18 }}>
                    Estos son los dispositivos donde tu cuenta tiene sesión iniciada actualmente.
                  </Text>
                  <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                    {sesiones.length === 0 ? (
                      <Text style={{ color: c.muted, padding: Spacing.md, textAlign: 'center' }}>Sin sesiones activas.</Text>
                    ) : sesiones.map(s => (
                      <Row
                        key={s.id}
                        icon="phone-portrait-outline" iconBg={c.accentLight} iconColor={c.accent}
                        title={s.es_actual ? 'Este dispositivo' : (s.user_agent ? String(s.user_agent).slice(0, 40) : 'Dispositivo')}
                        sub={`Activo: ${new Date(s.last_seen_at).toLocaleString()}`}
                        colors={c}
                        right={s.es_actual
                          ? <Text style={{ color: c.success, fontWeight: '700', fontSize: 11 }}>Activa</Text>
                          : (
                            <TouchableOpacity onPress={() => cerrarSesionRemota(s.id)}>
                              <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Cerrar</Text>
                            </TouchableOpacity>
                          )}
                      />
                    ))}
                  </View>
                  {sesiones.some(s => !s.es_actual) && (
                    <TouchableOpacity style={[styles.editBtn, { backgroundColor: 'rgba(239,68,68,0.1)' }]} onPress={cerrarOtrasSesiones}>
                      <Ionicons name="log-out-outline" size={16} color="#EF4444" />
                      <Text style={[styles.editBtnTxt, { color: '#EF4444' }]}>Cerrar sesión en otros dispositivos</Text>
                    </TouchableOpacity>
                  )}
                </>
              )
            )}

            {privTab === 'bloqueados' && (
              cargandoPriv ? <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} /> : (
                <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                  {bloqueados.length === 0 ? (
                    <Text style={{ color: c.muted, padding: Spacing.md, textAlign: 'center' }}>No has bloqueado a nadie. Puedes bloquear a alguien desde su chat.</Text>
                  ) : bloqueados.map(b => (
                    <Row
                      key={b.id}
                      icon="person-outline" iconBg={c.accentLight} iconColor={c.accent}
                      title={b.nombre} sub={b.username ? `@${b.username}` : undefined}
                      colors={c}
                      right={
                        <TouchableOpacity onPress={() => desbloquearUsuario(b.bloqueado_id)}>
                          <Text style={{ color: c.accent, fontWeight: '700', fontSize: 12 }}>Desbloquear</Text>
                        </TouchableOpacity>
                      }
                    />
                  ))}
                </View>
              )
            )}

            {privTab === 'cuenta' && (
              <>
                <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Row
                    icon="eye-outline" iconBg={c.accentLight} iconColor={c.accent}
                    title="Perfil público" sub="Otros usuarios pueden ver tu perfil y tienda"
                    colors={c}
                    right={<Switch value={perfilPublico} onValueChange={cambiarVisibilidad} trackColor={{ false: c.border, true: c.accent }} thumbColor="#FFF" />}
                  />
                </View>

                <SectionLabel label="Zona de peligro" color="#EF4444" />
                <View style={[styles.card, { backgroundColor: c.card, borderColor: '#EF4444' }]}>
                  <Row
                    icon="trash-outline" iconBg="rgba(239,68,68,0.1)" iconColor="#EF4444"
                    title="Eliminar mi cuenta" sub="Esta acción desactiva tu cuenta de forma permanente"
                    onPress={() => setShowEliminarCuenta(true)}
                    colors={c}
                  />
                </View>
              </>
            )}
          </ScreenScroll>
        </View>
      </Modal>

      {/* ── Modal: Métodos de pago guardados ── */}
      <Modal visible={showMetodosPago} animationType="slide" onRequestClose={() => setShowMetodosPago(false)}>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <ScreenHeader title="Métodos de pago" onBack={() => setShowMetodosPago(false)} />

          <ScreenScroll>
            {cargandoMetodos ? <ActivityIndicator color={c.accent} style={{ marginTop: 30 }} /> : (
              <>
                <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                  {metodosPago.length === 0 ? (
                    <Text style={{ color: c.muted, padding: Spacing.md, textAlign: 'center' }}>No tienes tarjetas guardadas.</Text>
                  ) : metodosPago.map(m => (
                    <Row
                      key={m.id}
                      icon="card-outline" iconBg={c.accentLight} iconColor={c.accent}
                      title={`${String(m.marca).charAt(0).toUpperCase()}${String(m.marca).slice(1)} •••• ${m.ultimos4}`}
                      sub={`Vence ${String(m.exp_mes).padStart(2, '0')}/${String(m.exp_anio).slice(-2)}${m.predeterminado ? ' · Predeterminada' : ''}`}
                      colors={c}
                      right={
                        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                          {!m.predeterminado && (
                            <TouchableOpacity onPress={() => marcarPredeterminada(m.id)}>
                              <Text style={{ color: c.accent, fontWeight: '700', fontSize: 12 }}>Usar</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => eliminarTarjeta(m.id)}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      }
                    />
                  ))}
                </View>

                {!mostrarFormTarjeta ? (
                  <TouchableOpacity style={[styles.editBtn, { backgroundColor: c.accent }]} onPress={() => setMostrarFormTarjeta(true)}>
                    <Ionicons name="add-outline" size={18} color="#FFF" />
                    <Text style={styles.editBtnTxt}>Agregar tarjeta</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border, padding: Spacing.md }]}>
                    <Input label="Número de tarjeta" icon="card-outline" value={mpNumero} onChangeText={setMpNumero} inputType="card" />
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Input label="MM/AA" icon="calendar-outline" value={mpExp} onChangeText={setMpExp} inputType="expiry" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label="CVV" icon="lock-closed-outline" value={mpCvv} onChangeText={setMpCvv} inputType="cvv" secureTextEntry />
                      </View>
                    </View>
                    <Text style={{ color: c.muted, fontSize: 11, marginBottom: 10 }}>
                      No almacenamos tu número completo: solo guardamos un token seguro y los últimos 4 dígitos.
                    </Text>
                    <Button label="Guardar tarjeta" icon="checkmark-outline" onPress={guardarTarjetaNueva} loading={guardandoTarjeta} />
                    <TouchableOpacity onPress={() => setMostrarFormTarjeta(false)} style={{ alignItems: 'center', marginTop: 10 }}>
                      <Text style={{ color: c.muted, fontWeight: '700' }}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScreenScroll>
        </View>
      </Modal>

      {/* ── Modal: Confirmar eliminación de cuenta ── */}
      <Modal visible={showEliminarCuenta} animationType="fade" transparent onRequestClose={() => setShowEliminarCuenta(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: Spacing.lg }}>
          <View style={{ backgroundColor: c.card, borderRadius: Radius.lg, padding: Spacing.lg }}>
            <Text style={{ color: c.text, fontWeight: '900', fontSize: Fonts.title - 2, marginBottom: 8 }}>Eliminar cuenta</Text>
            <Text style={{ color: c.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>
              Tu cuenta será desactivada de inmediato y cerrarás sesión en todos tus dispositivos. Contacta a soporte si quieres reactivarla más adelante.
            </Text>
            {usuario?.auth_provider === 'local' && (
              <Input label="Confirma tu contraseña" icon="lock-closed-outline" value={passEliminar} onChangeText={setPassEliminar} secureTextEntry />
            )}
            <Button label="Eliminar mi cuenta" icon="trash-outline" onPress={confirmarEliminarCuenta} loading={eliminando} />
            <TouchableOpacity onPress={() => { setShowEliminarCuenta(false); setPassEliminar(''); }} style={{ alignItems: 'center', marginTop: 10 }}>
              <Text style={{ color: c.muted, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.lg, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: Radius.md, borderWidth: 1.5, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, margin: Spacing.md, borderRadius: Radius.pill },
  editBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  rolChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1.5 },
});
