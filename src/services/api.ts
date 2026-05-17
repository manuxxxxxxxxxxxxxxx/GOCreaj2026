/**
 * Cliente API — MercaLocal / GOCreaj2026
 * Ruta: src/services/api.ts
 */
export const API_URL = 'https://exemplify-hardening-trusting.ngrok-free.dev/mercalocal-backend/api';

const TIMEOUT_MS = 8000;

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': '1',
};

async function fetchConTimeout(url: string, options?: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error(
        `El servidor tardó más de ${timeoutMs / 1000}s en responder.\n` +
        `Verifica que XAMPP esté corriendo y ngrok activo.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function get(ruta: string, params: Record<string, any> = {}) {
  const q = new URLSearchParams({ r: ruta, ...params }).toString();
  const res = await fetchConTimeout(`${API_URL}/?${q}`, { headers: BASE_HEADERS });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function post(ruta: string, body: any) {
  const res = await fetchConTimeout(`${API_URL}/?r=${encodeURIComponent(ruta)}`, {
    method: 'POST',
    headers: BASE_HEADERS,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function postFile(ruta: string, form: FormData) {
  const res = await fetchConTimeout(
    `${API_URL}/?r=${encodeURIComponent(ruta)}`,
    {
      method: 'POST',
      headers: {
        // ¡No incluir Content-Type aquí! fetch añade el boundary correcto
        'ngrok-skip-browser-warning': '1',
        Accept: 'application/json',
      },
      body: form,
    },
    20000
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

export type Usuario = {
  id: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  tipo: 'cliente' | 'vendedor' | 'repartidor' | 'soporte' | 'admin';
  avatar?: string | null;
};

export type AuthResponse = {
  ok: boolean;
  usuario?: Usuario;
  id?: number;
  token: string;
  error?: string;
};

export type PerfilResponse = {
  ok: boolean;
  usuario: Usuario;
  error?: string;
};

export type SimpleResponse = {
  ok: boolean;
  error?: string;
};

/** Tipo del payload de actualización: solo los campos que se van a cambiar. */
export type CambiosPerfil = {
  nombre?: string;
  email?: string;
  /** "" o null para borrar el teléfono */
  telefono?: string | null;
};

export const api = {
  ping: () => get('ping'),
  login: (email: string, password: string): Promise<AuthResponse> =>
    post('auth/login', { email, password }),
  registro: (data: {
    nombre: string;
    email: string;
    password: string;
    telefono?: string;
  }): Promise<AuthResponse> => post('auth/registro', data),

  categorias: (tipo?: string) => get('categorias', tipo ? { tipo } : {}),
  banners:     () => get('banners'),
  tiendas:     (params: any = {}) => get('tiendas', params),
  tiendasCercanas: () => get('tiendas/cercanas'),
  productos:   (params: any = {}) => get('productos', params),

  reels:    () => get('reels'),
  likeReel: (reel_id: number, usuario_id: number) =>
    post('reels/like', { reel_id, usuario_id }),

  pedidos:     (usuario_id: number) => get('pedidos', { usuario_id }),
  crearPedido: (data: {
    usuario_id: number;
    tienda_id: number;
    items: Array<{ producto_id: number; cantidad: number }>;
    metodo_pago?: string;
    direccion?: string;
  }) => post('pedidos', data),

  chats:     (usuario_id: number) => get('chats', { usuario_id }),
  mensajes:  (chat_id: number, usuario_id?: number) =>
    get('chats/mensajes', { chat_id, usuario_id }),
  enviarMsg: (chat_id: number, remitente_id: number, texto: string) =>
    post('chats/enviar', { chat_id, remitente_id, texto }),

  favoritos:  (usuario_id: number) => get('favoritos', { usuario_id }),
  toggleFav:  (usuario_id: number, producto_id: number) =>
    post('favoritos/toggle', { usuario_id, producto_id }),
  carrito:    (usuario_id: number) => get('carrito', { usuario_id }),
  addCarrito: (usuario_id: number, producto_id: number, cantidad = 1) =>
    post('carrito/agregar', { usuario_id, producto_id, cantidad }),

  proyectos: () => get('proyectos'),
  cursos:    () => get('cursos'),
  perfil:    (usuario_id: number) => get('perfil', { usuario_id }),

  // ============================================================
  // PERFIL — actualizar datos, foto y contraseña
  // ============================================================

  /**
   * Actualiza uno o varios campos del perfil.
   * Solo envía los que vayan en `cambios`. Para BORRAR el teléfono manda "" o null.
   */
  actualizarPerfil: (usuario_id: number, cambios: CambiosPerfil): Promise<PerfilResponse> =>
    post('perfil/actualizar', { usuario_id, ...cambios }),

  /** Cambia la contraseña. Verifica la actual antes de aplicar la nueva. */
  cambiarPassword: (
    usuario_id: number,
    password_actual: string,
    password_nueva: string
  ): Promise<SimpleResponse> =>
    post('perfil/password', { usuario_id, password_actual, password_nueva }),

  /** Sube la foto de perfil. */
  subirAvatar: async (
    usuario_id: number,
    imagen: { uri: string; mimeType?: string | null; fileName?: string | null }
  ): Promise<PerfilResponse> => {
    const form = new FormData();
    form.append('usuario_id', String(usuario_id));

    const uri = imagen.uri;
    const extEnUri = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const inferType =
      imagen.mimeType ||
      (extEnUri === 'png'  ? 'image/png'
       : extEnUri === 'webp' ? 'image/webp'
       : extEnUri === 'gif'  ? 'image/gif'
       : 'image/jpeg');
    const inferName =
      imagen.fileName || `avatar_${usuario_id}_${Date.now()}.${extEnUri}`;

    form.append('avatar', {
      uri,
      name: inferName,
      type: inferType,
    } as any);

    return postFile('perfil/avatar', form);
  },

  /** Elimina la foto de perfil. */
  eliminarAvatar: (usuario_id: number): Promise<PerfilResponse> =>
    post('perfil/avatar', { usuario_id, eliminar: true }),
};
