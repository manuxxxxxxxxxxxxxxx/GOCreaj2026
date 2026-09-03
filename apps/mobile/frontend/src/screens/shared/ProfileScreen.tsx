import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import {
  BellIcon,
  BookmarkSimpleIcon,
  CameraIcon,
  CaretRightIcon,
  EyeIcon,
  GearSixIcon,
  HandshakeIcon,
  HeartIcon,
  HeadsetIcon,
  MapPinLineIcon,
  MapTrifoldIcon,
  MopedIcon,
  PencilSimpleIcon,
  ShieldCheckIcon,
  SignOutIcon,
  StarIcon,
  StorefrontIcon,
  TrophyIcon,
  UserIcon,
  WalletIcon,
  XIcon,
} from "phosphor-react-native";
import type { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import type { ThemeTokens } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { authApi, pedidosApi, vendedorApi, interaccionesApi, ApiError } from "../../lib/api";
import type { Pedido, Producto, Tienda } from "../../lib/types";
import { calcularPerfilCompleto } from "../../lib/format";
import { Avatar } from "../../components/ui/Avatar";
import { AvatarRing } from "../../components/ui/AvatarRing";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { GlowBackground } from "../../components/ui/GlowBackground";
import { ScreenReveal } from "../../components/ui/Motion";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import { ProductGrid } from "../../components/domain/ProductGrid";
import { ProfileBadges, type ProfileBadge } from "../../components/domain/ProfileBadges";

/** Cuántos productos se muestran en el grid de vista previa (Me gusta / Guardados) antes de "Ver todo". */
const COLECCION_PREVIEW = 9;

const ROLE_META: Record<string, { label: string; fg: (t: ThemeTokens) => string; bg: (t: ThemeTokens) => string; icon: (color: string) => React.ReactNode }> = {
  comprador: { label: "Comprador", fg: (t) => t.cyan, bg: (t) => t.cyanBg, icon: (c) => <UserIcon size={12} weight="bold" color={c} /> },
  vendedor: { label: "Vendedor", fg: (t) => t.violet, bg: (t) => t.violetBg, icon: (c) => <StorefrontIcon size={12} weight="bold" color={c} /> },
  repartidor: { label: "Repartidor", fg: (t) => t.coral, bg: (t) => t.coralBg, icon: (c) => <MopedIcon size={12} weight="bold" color={c} /> },
};

export function ProfileScreen() {
  const { tokens } = useTheme();
  const { usuario, actualizarUsuarioLocal, cambiarRol, logout } = useAuth();
  const toast = useToast();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [stats, setStats] = useState<{ label: string; value: number }[] | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [tab, setTab] = useState<"likes" | "guardados">("likes");
  const [likes, setLikes] = useState<Producto[] | null>(null);
  const [likesTotal, setLikesTotal] = useState(0);
  const [guardados, setGuardados] = useState<Producto[] | null>(null);
  const [guardadosTotal, setGuardadosTotal] = useState(0);
  const [productosVendedor, setProductosVendedor] = useState<Producto[] | null>(null);
  const [ventasCount, setVentasCount] = useState<number | null>(null);
  const [tienda, setTienda] = useState<Tienda | null>(null);

  useEffect(() => {
    authApi.misRoles().then((r) => setRoles(r.roles)).catch(() => {});
  }, []);

  // Se cargan ambas de una vez (no solo la pestaña activa): el hero del comprador
  // ya necesita los conteos de Favoritos/Guardados apenas entra al perfil. Solo se
  // trae una vista previa (COLECCION_PREVIEW) — "Ver todo" lleva a la lista completa paginada.
  const cargarColecciones = useCallback(() => {
    interaccionesApi
      .misLikes(1, COLECCION_PREVIEW)
      .then((r) => {
        setLikes(r.productos);
        setLikesTotal(r.total);
      })
      .catch(() => setLikes([]));
    interaccionesApi
      .misGuardados(1, COLECCION_PREVIEW)
      .then((r) => {
        setGuardados(r.productos);
        setGuardadosTotal(r.total);
      })
      .catch(() => setGuardados([]));
  }, []);

  useEffect(cargarColecciones, [cargarColecciones]);

  // Los tabs no desmontan las pantallas -- sin refrescar al recuperar el foco, un like o
  // guardado hecho en Reels/Explorar no aparecía aquí hasta recargar toda la app.
  useEffect(() => {
    const unsub = navigation.addListener("focus", cargarColecciones);
    return unsub;
  }, [navigation, cargarColecciones]);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.rol === "comprador") {
      pedidosApi
        .misPedidos()
        .then((r) => {
          setPedidos(r.pedidos);
          setStats([{ label: "Pedidos", value: r.pedidos.length }]);
        })
        .catch(() => {
          setPedidos([]);
          setStats(null);
        });
    } else if (usuario.rol === "vendedor") {
      Promise.all([vendedorApi.misProductos(), vendedorApi.misVentas()])
        .then(([p, v]) => {
          setProductosVendedor(p.productos);
          setVentasCount(v.pedidos.length);
          setStats([
            { label: "Productos", value: p.productos.filter((x) => !x.es_reel).length },
            { label: "Reels", value: p.productos.filter((x) => x.es_reel).length },
            { label: "Ventas", value: v.pedidos.length },
          ]);
        })
        .catch(() => setStats(null));
      vendedorApi.misTiendas().then((r) => setTienda(r.tiendas[0] ?? null)).catch(() => setTienda(null));
    } else {
      setStats(null);
    }
  }, [usuario?.rol]);

  // Vuelve a pedir la tienda cada vez que la pantalla recupera el foco -- así el botón
  // "Configurar mi tienda" pasa a "Visualizar"/"Configurar" apenas se crea, sin tener que
  // recargar toda la app (crear/editar la tienda hace goBack() a este mismo Perfil).
  useEffect(() => {
    if (usuario?.rol !== "vendedor") return;
    const unsub = navigation.addListener("focus", () => {
      vendedorApi.misTiendas().then((r) => setTienda(r.tiendas[0] ?? null)).catch(() => {});
    });
    return unsub;
  }, [navigation, usuario?.rol]);

  if (!usuario) return null;

  const guardar = async () => {
    setGuardando(true);
    try {
      const r = await authApi.actualizarPerfil({ nombre, email, telefono });
      actualizarUsuarioLocal(r.usuario);
      toast.show("Perfil actualizado", "success");
      setEditando(false);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "No se pudo actualizar.", "error");
    } finally {
      setGuardando(false);
    }
  };

  const cancelarEdicion = () => {
    setNombre(usuario.nombre);
    setEmail(usuario.email ?? "");
    setTelefono(usuario.telefono ?? "");
    setEditando(false);
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

  const roleMeta = ROLE_META[usuario.rol] ?? ROLE_META.comprador;
  const pedidosCount = stats?.find((s) => s.label === "Pedidos")?.value;
  const heroStats: { label: string; value: string }[] | null =
    usuario.rol === "repartidor"
      ? [
          { label: "Calificación", value: usuario.repartidor_calificacion_promedio ? usuario.repartidor_calificacion_promedio.toFixed(1) : "Nuevo" },
          { label: "Reseñas", value: String(usuario.repartidor_total_resenas ?? 0) },
        ]
      : usuario.rol === "comprador"
        ? [
            { label: "Pedidos", value: pedidosCount !== undefined ? String(pedidosCount) : "-" },
            { label: "Favoritos", value: likes !== null ? String(likesTotal) : "-" },
            { label: "Guardados", value: guardados !== null ? String(guardadosTotal) : "-" },
          ]
        : stats
          ? stats.map((s) => ({ label: s.label, value: String(s.value) }))
          : null;

  const ahora = new Date();
  const pedidosEsteMes = pedidos?.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  }).length ?? 0;
  const productosNoReel = productosVendedor?.filter((p) => !p.es_reel) ?? [];

  const compradorBadges: ProfileBadge[] = [
    { icon: <TrophyIcon size={16} weight="fill" color={tokens.cyan} />, label: "Primera compra", current: pedidosCount ?? 0, target: 1, accent: "cyan" },
    { icon: <TrophyIcon size={16} weight="fill" color={tokens.cyan} />, label: "Comprador frecuente", current: pedidosEsteMes, target: 10, accent: "cyan", nota: "Se reinicia cada mes" },
  ];

  const vendedorBadges: ProfileBadge[] = [
    { icon: <TrophyIcon size={16} weight="fill" color={tokens.violet} />, label: "Primera venta", current: ventasCount ?? 0, target: 1, accent: "violet" },
    { icon: <TrophyIcon size={16} weight="fill" color={tokens.violet} />, label: "Catálogo activo", current: productosNoReel.length, target: 5, accent: "violet" },
    { icon: <TrophyIcon size={16} weight="fill" color={tokens.violet} />, label: "Vendedor establecido", current: ventasCount ?? 0, target: 25, accent: "violet" },
  ];

  const badgesListas = usuario.rol === "vendedor" ? productosVendedor !== null : pedidos !== null;
  const badgesActivas = usuario.rol === "vendedor" ? vendedorBadges : usuario.rol === "comprador" ? compradorBadges : [];

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 20 }}>
      <View style={[styles.hero, { borderColor: tokens.border }]}>
        <GlowBackground />
        <Pressable onPress={() => navigation.navigate("Configuracion")} style={[styles.gearBtn, { backgroundColor: tokens.surface2, borderColor: tokens.border }]}>
          <GearSixIcon size={16} color={tokens.textSecondary} />
        </Pressable>
        <ScreenReveal style={{ gap: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            <View>
              {usuario.rol === "comprador" ? (
                <AvatarRing nombre={usuario.nombre} foto={usuario.foto_perfil} size={84} progress={calcularPerfilCompleto(usuario)} color="cyan" />
              ) : (
                <Avatar nombre={usuario.nombre} foto={usuario.foto_perfil} size={84} />
              )}
              <Pressable
                onPress={subirFoto}
                style={[styles.camBtn, { backgroundColor: tokens.cyan, borderColor: tokens.surface1 }, usuario.rol === "comprador" && { bottom: 3, right: 3 }]}
              >
                <CameraIcon size={14} weight="bold" color={tokens.cyanInk} />
              </Pressable>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text numberOfLines={1} style={{ fontSize: 20, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{usuario.nombre}</Text>
              {!!usuario.username && <Text style={{ fontSize: 12.5, color: tokens.textMuted }}>@{usuario.username}</Text>}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View style={[styles.pill, { backgroundColor: roleMeta.bg(tokens) }]}>
                  {roleMeta.icon(roleMeta.fg(tokens))}
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: roleMeta.fg(tokens) }}>{roleMeta.label}</Text>
                </View>
                <Pressable onPress={() => navigation.navigate("Direcciones")} style={[styles.pill, { borderWidth: 1, borderColor: tokens.border }]}>
                  <MapPinLineIcon size={12} color={tokens.textSecondary} />
                  <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: tokens.textSecondary }}>{usuario.municipio ?? "Sin ubicación"}</Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 12, color: tokens.textMuted }}>{usuario.email}</Text>
            </View>
            {badgesListas && badgesActivas.length > 0 && <ProfileBadges badges={badgesActivas} size={44} roleLabel={roleMeta.label} />}
          </View>

          {heroStats && (
            <View style={[styles.statsRow, { borderTopColor: tokens.border }]}>
              {heroStats.map((s, i) => (
                <View key={s.label} style={[styles.statItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: tokens.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {s.label === "Calificación" && <StarIcon size={14} weight="fill" color={tokens.warn} />}
                    <Text style={{ fontSize: 17, fontFamily: "SpaceGrotesk_700Bold", color: tokens.textPrimary }}>{s.value}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: tokens.textMuted }}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
        </ScreenReveal>
      </View>

      {usuario.rol === "vendedor" && (
        <View style={[styles.tiendaCard, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
          <View style={[styles.tiendaPortada, { backgroundColor: tokens.surface2 }]}>
            {tienda?.portada ? (
              <Image source={{ uri: tienda.portada }} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                <StorefrontIcon size={22} color={tokens.textMuted} />
              </View>
            )}
          </View>
          <View style={{ padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.tiendaLogo, { backgroundColor: tokens.surface2, borderColor: tokens.surface1 }]}>
                {tienda?.logo ? <Image source={{ uri: tienda.logo }} style={StyleSheet.absoluteFill} /> : <StorefrontIcon size={18} color={tokens.textMuted} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>{tienda?.nombre ?? "Aún no tienes tienda"}</Text>
                {tienda ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <StarIcon size={11} weight="fill" color={tokens.warn} />
                    <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>
                      {tienda.calificacion_promedio ? tienda.calificacion_promedio.toFixed(1) : "Nuevo"} · Vista previa pública
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11.5, color: tokens.textMuted }}>Créala en un par de minutos y empieza a vender</Text>
                )}
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {tienda && (
                <View style={{ flex: 1 }}>
                  <Button size="sm" variant="secondary" fullWidth icon={<EyeIcon size={14} color={tokens.textPrimary} />} onPress={() => navigation.navigate("StoreDetail", { id: tienda.id })}>
                    Visualizar
                  </Button>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button size="sm" fullWidth icon={<PencilSimpleIcon size={14} color={tokens.cyanInk} />} onPress={() => navigation.navigate("VendedorTienda")}>
                  {tienda ? "Configurar" : "Configurar mi tienda"}
                </Button>
              </View>
            </View>
          </View>
        </View>
      )}

      <View>
        <View style={[styles.tabsRow, { borderBottomColor: tokens.border }]}>
          <TabButton active={tab === "likes"} icon={<HeartIcon size={16} weight={tab === "likes" ? "fill" : "regular"} color={tab === "likes" ? tokens.cyan : tokens.textMuted} />} label="Me gusta" onPress={() => setTab("likes")} />
          <TabButton
            active={tab === "guardados"}
            icon={<BookmarkSimpleIcon size={16} weight={tab === "guardados" ? "fill" : "regular"} color={tab === "guardados" ? tokens.cyan : tokens.textMuted} />}
            label="Guardados"
            onPress={() => setTab("guardados")}
          />
        </View>
        <View style={{ paddingTop: 12 }}>
          {tab === "likes" &&
            (likes === null ? (
              <Skeleton height={160} />
            ) : likes.length === 0 ? (
              <EmptyState icon={<HeartIcon size={22} color={tokens.textMuted} />} title="Sin likes todavía" description="Los productos y reels que te gusten aparecerán aquí." />
            ) : (
              <>
                <ProductGrid productos={likes} />
                {likesTotal > likes.length && <VerTodoButton onPress={() => navigation.navigate("MiColeccion", { tipo: "likes" })} total={likesTotal} />}
              </>
            ))}
          {tab === "guardados" &&
            (guardados === null ? (
              <Skeleton height={160} />
            ) : guardados.length === 0 ? (
              <EmptyState icon={<BookmarkSimpleIcon size={22} color={tokens.textMuted} />} title="Sin guardados todavía" description="Guarda productos y reels para verlos aquí." />
            ) : (
              <>
                <ProductGrid productos={guardados} />
                {guardadosTotal > guardados.length && <VerTodoButton onPress={() => navigation.navigate("MiColeccion", { tipo: "guardados" })} total={guardadosTotal} />}
              </>
            ))}
        </View>
      </View>

      {/* El vendedor no puede cambiar de rol -- una vez que administra una tienda, se queda
          en ese rol; la sección ni siquiera debe aparecer. Comprador y repartidor sí pueden. */}
      {usuario.rol !== "vendedor" && roles.length > 1 && (
        <Card>
          <Text style={{ fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary, marginBottom: 10 }}>Cambiar de rol</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {roles.map((r) => {
              const meta = ROLE_META[r] ?? ROLE_META.comprador;
              const active = usuario.rol === r;
              return (
                <Pressable
                  key={r}
                  onPress={() =>
                    cambiarRol(r as "comprador" | "vendedor" | "repartidor").catch((err) =>
                      toast.show(err instanceof ApiError ? err.message : "No se pudo cambiar de rol.", "error")
                    )
                  }
                  style={[styles.roleChip, { borderColor: active ? meta.fg(tokens) : tokens.border, backgroundColor: active ? meta.bg(tokens) : tokens.surface1 }]}
                >
                  {meta.icon(active ? meta.fg(tokens) : tokens.textSecondary)}
                  <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: active ? meta.fg(tokens) : tokens.textSecondary }}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: editando ? 14 : 4 }}>
          <Text style={{ fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: tokens.textPrimary }}>Información personal</Text>
          {!editando && (
            <Pressable onPress={() => setEditando(true)} style={{ flexDirection: "row", alignItems: "center", gap: 5, padding: 4 }}>
              <PencilSimpleIcon size={13} weight="bold" color={tokens.cyan} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Editar</Text>
            </Pressable>
          )}
        </View>

        {editando ? (
          <View style={{ gap: 14 }}>
            <Input label="Nombre" value={nombre} onChangeText={setNombre} />
            <Input label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <PhoneInput value={telefono} onChangeText={setTelefono} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button size="sm" onPress={guardar} loading={guardando}>
                Guardar cambios
              </Button>
              <Button size="sm" variant="ghost" icon={<XIcon size={14} color={tokens.textPrimary} />} onPress={cancelarEdicion} disabled={guardando}>
                Cancelar
              </Button>
            </View>
          </View>
        ) : (
          <View>
            <InfoRow label="Nombre" value={usuario.nombre} />
            <InfoRow label="Correo" value={usuario.email ?? "Sin registrar"} />
            <InfoRow label="Teléfono" value={usuario.telefono || "Sin registrar"} last />
          </View>
        )}
      </Card>

      <NavSection
        title="Cuenta"
        items={[
          { icon: <MapPinLineIcon size={18} color={tokens.cyan} />, label: "Direcciones", onPress: () => navigation.navigate("Direcciones") },
          { icon: <WalletIcon size={18} color={tokens.cyan} />, label: "Billetera", onPress: () => navigation.navigate("Wallet") },
          { icon: <BellIcon size={18} color={tokens.cyan} />, label: "Notificaciones", onPress: () => navigation.navigate("Notifications") },
        ]}
      />

      <NavSection
        title="Actividad"
        items={[
          ...(usuario.rol === "comprador" ? [{ icon: <MapTrifoldIcon size={18} color={tokens.cyan} />, label: "Mis pedidos", onPress: () => navigation.navigate("Orders") }] : []),
          ...(usuario.rol === "comprador" ? [{ icon: <HandshakeIcon size={18} color={tokens.cyan} />, label: "Convertirse en socio", onPress: () => navigation.navigate("Convertirse") }] : []),
          ...(usuario.rol === "repartidor" ? [{ icon: <MopedIcon size={18} color={tokens.cyan} />, label: "Mi perfil de repartidor", onPress: () => navigation.navigate("RepartidorPerfil") }] : []),
        ]}
      />

      <NavSection
        title="Más"
        items={[
          { icon: <GearSixIcon size={18} color={tokens.cyan} />, label: "Configuración avanzada", onPress: () => navigation.navigate("Configuracion") },
          { icon: <ShieldCheckIcon size={18} color={tokens.cyan} />, label: "Seguridad", onPress: () => navigation.navigate("Seguridad") },
          { icon: <HeadsetIcon size={18} color={tokens.cyan} />, label: "Soporte", onPress: () => navigation.navigate("Soporte") },
        ]}
      />

      <View style={{ gap: 12, alignItems: "center" }}>
        <Button variant="secondary" fullWidth icon={<SignOutIcon size={16} color={tokens.textPrimary} />} onPress={logout}>
          Cerrar sesión
        </Button>
      </View>
    </ScrollView>
  );
}

function VerTodoButton({ onPress, total }: { onPress: () => void; total: number }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 10, alignItems: "center" }}>
      <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: tokens.cyan }}>Ver todo ({total})</Text>
    </Pressable>
  );
}

function TabButton({ active, icon, label, onPress }: { active: boolean; icon: React.ReactNode; label: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, { borderBottomColor: active ? tokens.cyan : "transparent" }]}>
      {icon}
      <Text style={{ fontSize: 12.5, fontFamily: "Inter_700Bold", color: active ? tokens.cyan : tokens.textMuted }}>{label}</Text>
    </Pressable>
  );
}

function NavSection({ title, items }: { title: string; items: { icon: React.ReactNode; label: string; onPress: () => void }[] }) {
  const { tokens } = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.textMuted, paddingHorizontal: 2 }}>{title}</Text>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        {items.map((item, i) => (
          <NavRow key={item.label} icon={item.icon} label={item.label} onPress={item.onPress} last={i === items.length - 1} />
        ))}
      </Card>
    </View>
  );
}

function NavRow({ icon, label, onPress, last }: { icon: React.ReactNode; label: string; onPress: () => void; last?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.navRow, { borderBottomColor: tokens.border, borderBottomWidth: last ? 0 : 1 }]}>
      <View style={[styles.navIconBadge, { backgroundColor: tokens.cyanBg }]}>{icon}</View>
      <Text style={{ flex: 1, fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{label}</Text>
      <CaretRightIcon size={14} color={tokens.textMuted} />
    </Pressable>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: tokens.border, borderBottomWidth: last ? 0 : 1 }]}>
      <Text style={{ fontSize: 12, color: tokens.textMuted }}>{label}</Text>
      <Text numberOfLines={1} style={{ flex: 1, textAlign: "right", marginLeft: 12, fontSize: 13.5, fontFamily: "Inter_600SemiBold", color: tokens.textPrimary }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, borderWidth: 1, overflow: "hidden", padding: 22 },
  gearBtn: { position: "absolute", top: 14, right: 14, zIndex: 1, width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  camBtn: { position: "absolute", bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statsRow: { flexDirection: "row", borderTopWidth: 1, paddingTop: 16 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  tabsRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2 },
  navRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  navIconBadge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11 },
  tiendaCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  tiendaPortada: { height: 72 },
  tiendaLogo: { width: 40, height: 40, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
