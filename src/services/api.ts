/**
 * Cliente API — MercaLocal / GOCreaj2026
 * Ruta: src/services/api.ts
 */
export const API_URL = 'https://ladder-barbell-mortally.ngrok-free.dev/mercalocal-backend/api';

const TIMEOUT_MS = 8000;

// Headers base — ngrok-skip-browser-warning evita la pantalla de advertencia
const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': '1',
};

async function fetchConTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error(
        `El servidor tardó más de ${TIMEOUT_MS / 1000}s en responder.\n` +
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
  const res = await fetchConTimeout(`${API_URL}/?${q}`, {
    headers: BASE_HEADERS,
  });
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

export type Usuario = {
  id: number;
  nombre: string;
  email: string;
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
};