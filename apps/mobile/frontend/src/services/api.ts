import AsyncStorage from '@react-native-async-storage/async-storage';

// EXPO_PUBLIC_API_URL se lee del archivo .env automáticamente (Expo SDK 49+)
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://192.168.0.11/GOCreaj2026/apps/mobile/backend';

let cachedToken: string | null = null;
let isOnline = true;
const OFFLINE_BUFFER_KEY = 'svgo_offline_buffer';

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) await AsyncStorage.setItem('svgo_token', token);
  else        await AsyncStorage.removeItem('svgo_token');
}

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem('svgo_token');
  return cachedToken;
}

export function setNetworkOnline(value: boolean): void { isOnline = value; }
export function getNetworkOnline(): boolean { return isOnline; }

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  /** Si está activo y no hay red, la petición se encola para reintentar cuando vuelva la señal */
  buffered?: boolean;
}

interface BufferedRequest {
  endpoint: string;
  options: RequestOptions;
  ts: number;
}

async function readBuffer(): Promise<BufferedRequest[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_BUFFER_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as BufferedRequest[]; } catch { return []; }
}
async function writeBuffer(list: BufferedRequest[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(list));
}

export async function pushOffline(endpoint: string, options: RequestOptions): Promise<void> {
  const list = await readBuffer();
  list.push({ endpoint, options, ts: Date.now() });
  await writeBuffer(list);
}

export async function flushOfflineBuffer(): Promise<void> {
  if (!isOnline) return;
  const list = await readBuffer();
  if (!list.length) return;
  const remaining: BufferedRequest[] = [];
  for (const req of list) {
    try { await api(req.endpoint, req.options); }
    catch { remaining.push(req); }
  }
  await writeBuffer(remaining);
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  // Si está sin red y la petición es bufferable, la encolamos y devolvemos ok diferido
  if (!isOnline && options.buffered) {
    await pushOffline(endpoint, options);
    return { ok: true, queued: true } as unknown as T;
  }

  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    console.log(`[API] ${res.status} ${endpoint}:`, text.slice(0, 200));
    throw new Error(`HTTP ${res.status}`);
  }
}

/** Traduce mensajes de error conocidos del PHP a la clave i18n del frontend */
export function traducirError(raw: string | undefined, fallbackLang: 'es' | 'en' | 'fr'): string {
  if (!raw) return '';
  const dict: Record<string, Record<'es' | 'en' | 'fr', string>> = {
    'Credenciales inválidas': {
      es: 'Credenciales inválidas',
      en: 'Invalid credentials',
      fr: 'Identifiants invalides',
    },
    'Usuario ya existe': {
      es: 'Este usuario ya está registrado',
      en: 'User already exists',
      fr: 'Cet utilisateur existe déjà',
    },
    'Campo requerido': {
      es: 'Faltan campos requeridos',
      en: 'Required fields missing',
      fr: 'Champs requis manquants',
    },
    'No autorizado': {
      es: 'No autorizado',
      en: 'Unauthorized',
      fr: 'Non autorisé',
    },
    'Sin stock': {
      es: 'Producto agotado',
      en: 'Out of stock',
      fr: 'Rupture de stock',
    },
    'Pedido no encontrado': {
      es: 'Pedido no encontrado',
      en: 'Order not found',
      fr: 'Commande introuvable',
    },
  };
  for (const k of Object.keys(dict)) {
    if (raw.toLowerCase().includes(k.toLowerCase())) return dict[k][fallbackLang];
  }
  return raw;
}

export const Endpoints = {
  authLogin: 'auth.php?action=login',
  authRegister: 'auth.php?action=register',
  authSocial: 'auth.php?action=social',
  authSms: 'auth.php?action=telefono_sms',
  authSmsVerify: 'auth.php?action=telefono_verificar',
  authMe: 'auth.php?action=me',
  authUbicacion: 'auth.php?action=actualizar_ubicacion',
  productosListar: 'productos.php?action=listar',
  productosReels: 'productos.php?action=reels',
  productosDetalle: (id: number): string => `productos.php?action=detalle&id=${id}`,
  productosMunicipios: 'productos.php?action=municipios',
  productosNuevasTiendas: 'productos.php?action=nuevas_tiendas',
  productosTiendasDestacadas: 'productos.php?action=tiendas_destacadas',
  productosCercanos: 'productos.php?action=cercanos',
  productosBuscar: (q: string): string => `productos.php?action=buscar&q=${encodeURIComponent(q)}`,
  carritoListar: 'carrito_pagos.php?action=listar',
  carritoAgregar: 'carrito_pagos.php?action=agregar',
  carritoActualizar: 'carrito_pagos.php?action=actualizar',
  carritoEliminar: 'carrito_pagos.php?action=eliminar',
  carritoCheckout: 'carrito_pagos.php?action=checkout',
  carritoCancelar: 'carrito_pagos.php?action=cancelar',
  carritoCalificar: 'carrito_pagos.php?action=calificar',
  misPedidos: 'carrito_pagos.php?action=mis_pedidos',
  interToggleLike: 'interacciones.php?action=toggle_like',
  interToggleGuardar: 'interacciones.php?action=toggle_guardar',
  interCompartir: 'interacciones.php?action=compartir',
  interComentar: 'interacciones.php?action=comentar',
  interListarComentarios: (pid: number): string => `interacciones.php?action=listar_comentarios&producto_id=${pid}`,
  interLikeComentario: 'interacciones.php?action=like_comentario',
  interSeguirTienda: 'interacciones.php?action=seguir_tienda',
  misLikes: 'interacciones.php?action=mis_likes',
  misGuardados: 'interacciones.php?action=mis_guardados',
  misCompartidos: 'interacciones.php?action=mis_compartidos',
  solicitudCrear: 'perfil_solicitudes.php?action=crear',
  misSolicitudes: 'perfil_solicitudes.php?action=mis_solicitudes',
  adminSolicitudes: (estado: string): string => `admin_dashboard.php?action=solicitudes&estado=${estado}`,
  adminResolver: 'admin_dashboard.php?action=resolver',
  adminStats: 'admin_dashboard.php?action=stats',
  adminSoporte: 'admin_dashboard.php?action=soporte',
  adminResponderSoporte: 'admin_dashboard.php?action=responder_soporte',
  adminArbol: 'admin_dashboard.php?action=arbol_control',
  adminBanearUsuario: 'admin_dashboard.php?action=banear_usuario',
  adminEliminarProducto: 'admin_dashboard.php?action=eliminar_producto',
  adminEliminarReel: 'admin_dashboard.php?action=eliminar_reel',
  vendedorTiendas: 'vendedor_dashboard.php?action=mis_tiendas',
  vendedorCrearTienda: 'vendedor_dashboard.php?action=crear_tienda',
  vendedorActualizarTienda: 'vendedor_dashboard.php?action=actualizar_tienda',
  vendedorProductos: 'vendedor_dashboard.php?action=mis_productos',
  vendedorCrearProducto: 'vendedor_dashboard.php?action=crear_producto',
  vendedorActualizarProducto: 'vendedor_dashboard.php?action=actualizar_producto',
  vendedorVentas: 'vendedor_dashboard.php?action=mis_ventas',
  vendedorPreparar: 'vendedor_dashboard.php?action=preparar_pedido',
  vendedorRechazar: 'vendedor_dashboard.php?action=rechazar_pedido',
  vendedorRepartidorPedido: (pid: number): string => `vendedor_dashboard.php?action=repartidor_pedido&pedido_id=${pid}`,
  repartidorDisponibles: 'repartidor_dashboard.php?action=disponibles',
  repartidorAceptar: 'repartidor_dashboard.php?action=aceptar',
  repartidorRechazar: 'repartidor_dashboard.php?action=rechazar',
  repartidorEntregas: 'repartidor_dashboard.php?action=mis_entregas',
  repartidorCompletar: 'repartidor_dashboard.php?action=completar',
  repartidorWallet: 'repartidor_dashboard.php?action=wallet',
  trackingActualizar: 'pedidos_tracking.php?action=actualizar_ubicacion',
  trackingEstado: (pid: number): string => `pedidos_tracking.php?action=estado&pedido_id=${pid}`,
  chatConversaciones: 'chat_multi.php?action=conversaciones',
  chatConversacionesTab: (tab: string, q?: string): string => {
    let url = `chat_multi.php?action=conversaciones&tab=${tab}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    return url;
  },
  chatMensajes: (otroId: number): string => `chat_multi.php?action=mensajes&otro_id=${otroId}`,
  chatEnviar: 'chat_multi.php?action=enviar',
  chatToggleArchivado: 'chat_multi.php?action=toggle_archivado',
  chatToggleFavorito: 'chat_multi.php?action=toggle_favorito',
  chatUnreadTotal: 'chat_multi.php?action=unread_total',
  chatReaccionar: 'chat_multi.php?action=reaccionar',
  chatEliminarMensaje: 'chat_multi.php?action=eliminar_mensaje',
  chatContactos: 'chat_multi.php?action=contactos',
  chatIniciarLlamada: 'chat_multi.php?action=iniciar_llamada',
  chatResponderLlamada: 'chat_multi.php?action=responder_llamada',
  chatFinalizarLlamada: 'chat_multi.php?action=finalizar_llamada',
  chatLlamadasEntrantes: 'chat_multi.php?action=llamadas_entrantes',
  chatDesdeProducto: 'chat_multi.php?action=desde_producto',
  chatBuscarUsuarios: (q: string, rol?: string): string => {
    let url = `chat_multi.php?action=buscar_usuarios&q=${encodeURIComponent(q)}`;
    if (rol) url += `&rol=${rol}`;
    return url;
  },
  soporteCrear: 'soporte.php?action=crear',
  soporteMis: 'soporte.php?action=mis_tickets',
  authEnviarSms:           'auth.php?action=enviar_sms',
  authVerificarSms:        'auth.php?action=verificar_sms',
  authCheckUsername:       'auth.php?action=check_username',
  authActualizarPerfil:    'auth.php?action=actualizar_perfil',
  repartidorToggleEnLinea: 'repartidor_dashboard.php?action=toggle_en_linea',
  adminUsuarios: (q?: string, rol?: string): string => {
    let url = 'admin_dashboard.php?action=usuarios';
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (rol && rol !== 'todos') url += `&rol=${rol}`;
    return url;
  },
  adminActualizarUsuario: 'admin_dashboard.php?action=actualizar_usuario',
  adminPedidos: (estado?: string): string =>
    estado && estado !== 'todos'
      ? `admin_dashboard.php?action=pedidos&estado=${estado}`
      : 'admin_dashboard.php?action=pedidos',
  adminActualizarPedido: 'admin_dashboard.php?action=actualizar_pedido',
} as const;
