import AsyncStorage from '@react-native-async-storage/async-storage';

// EXPO_PUBLIC_API_URL se lee del archivo .env automáticamente (Expo SDK 49+)
export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://192.168.0.16/GOCreaj2026/apps/mobile/backend';

let cachedToken: string | null = null;

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) {
    await AsyncStorage.setItem('svgo_token', token);
  } else {
    await AsyncStorage.removeItem('svgo_token');
  }
}

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem('svgo_token');
  return cachedToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // ¡ESTO ES CLAVE! Salta la pantalla de advertencia de ngrok automáticamente
    'ngrok-skip-browser-warning': 'true'
  };
  
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    console.log(`[API] ${res.status} ${endpoint}:`, text.slice(0, 200));
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function uploadReel(
  file: { uri: string; type: string; name: string },
  meta: { titulo?: string; descripcion?: string; producto_id?: number }
): Promise<{ ok: boolean; reel_id?: number; url?: string; tipo?: string; error?: string }> {
  const token = await getToken();
  const formData = new FormData();
  formData.append('archivo', { uri: file.uri, type: file.type, name: file.name } as unknown as Blob);
  if (meta.titulo)      formData.append('titulo',      meta.titulo);
  if (meta.descripcion) formData.append('descripcion', meta.descripcion);
  if (meta.producto_id) formData.append('producto_id', String(meta.producto_id));

  const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/reels.php?action=subir`, { method: 'POST', headers, body: formData });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`); }
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
  carritoListar: 'carrito_pagos.php?action=listar',
  carritoAgregar: 'carrito_pagos.php?action=agregar',
  carritoActualizar: 'carrito_pagos.php?action=actualizar',
  carritoEliminar: 'carrito_pagos.php?action=eliminar',
  carritoCheckout: 'carrito_pagos.php?action=checkout',
  misPedidos: 'carrito_pagos.php?action=mis_pedidos',
  interToggleLike: 'interacciones.php?action=toggle_like',
  interToggleGuardar: 'interacciones.php?action=toggle_guardar',
  interCompartir: 'interacciones.php?action=compartir',
  interComentar: 'interacciones.php?action=comentar',
  interListarComentarios: (pid: number): string => `interacciones.php?action=listar_comentarios&producto_id=${pid}`,
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
  vendedorTiendas: 'vendedor_dashboard.php?action=mis_tiendas',
  vendedorCrearTienda: 'vendedor_dashboard.php?action=crear_tienda',
  vendedorActualizarTienda: 'vendedor_dashboard.php?action=actualizar_tienda',
  vendedorProductos: 'vendedor_dashboard.php?action=mis_productos',
  vendedorCrearProducto: 'vendedor_dashboard.php?action=crear_producto',
  vendedorActualizarProducto: 'vendedor_dashboard.php?action=actualizar_producto',
  vendedorVentas: 'vendedor_dashboard.php?action=mis_ventas',
  vendedorPreparar: 'vendedor_dashboard.php?action=preparar_pedido',
  repartidorDisponibles: 'repartidor_dashboard.php?action=disponibles',
  repartidorAceptar: 'repartidor_dashboard.php?action=aceptar',
  repartidorRechazar: 'repartidor_dashboard.php?action=rechazar',
  repartidorEntregas: 'repartidor_dashboard.php?action=mis_entregas',
  repartidorCompletar: 'repartidor_dashboard.php?action=completar',
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
  chatIniciarLlamada: 'chat_multi.php?action=iniciar_llamada',
  chatResponderLlamada: 'chat_multi.php?action=responder_llamada',
  chatFinalizarLlamada: 'chat_multi.php?action=finalizar_llamada',
  chatLlamadasEntrantes: 'chat_multi.php?action=llamadas_entrantes',
  reelsFeed: (page: number): string => `reels.php?action=feed&page=${page}`,
  reelsToggleLike: 'reels.php?action=toggle_like',
  reelsToggleGuardado: 'reels.php?action=toggle_guardado',
  reelsComentarios: (reelId: number): string => `reels.php?action=comentarios&reel_id=${reelId}`,
  reelsComentar: 'reels.php?action=comentar',
  reelsToggleLikeComentario: 'reels.php?action=toggle_like_comentario',
  reelsEliminar: 'reels.php?action=eliminar',
  reelsMisReels: 'reels.php?action=mis_reels',
  soporteCrear: 'soporte.php?action=crear',
  soporteMis: 'soporte.php?action=mis_tickets',
  authEnviarSms:           'auth.php?action=enviar_sms',
  authVerificarSms:        'auth.php?action=verificar_sms',
  authCheckUsername:       'auth.php?action=check_username',
  authActualizarPerfil:    'auth.php?action=actualizar_perfil',
  authBuscarUsuarios:      'auth.php?action=buscar_usuarios',
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