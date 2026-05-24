export type Rol = 'admin' | 'comprador' | 'vendedor' | 'repartidor';
export type AuthProvider = 'local' | 'google' | 'apple' | 'telefono';

export interface Usuario {
  id: number;
  nombre: string;
  username?: string | null;
  username_changed_at?: string | null;
  email?: string | null;
  telefono?: string | null;
  telefono_verificado?: number;
  auth_provider: AuthProvider;
  rol: Rol;
  foto_perfil?: string | null;
  municipio?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface Tienda {
  id: number;
  vendedor_id: number;
  nombre: string;
  descripcion?: string;
  municipio: string;
  direccion?: string;
  lat: number;
  lng: number;
  logo?: string | null;
  rating?: number;
  activo: number;
  portada?: string | null;
  hora_apertura?: string | null;
  hora_cierre?: string | null;
  categoria?: string | null;
}

export interface Producto {
  id: number;
  tienda_id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  imagen?: string | null;
  video?: string | null;
  categoria?: string;
  es_reel: number;
  activo: number;
  tienda_nombre?: string;
  municipio?: string;
  vendedor_id?: number;
  likes_count?: number;
  comentarios_count?: number;
  compartidos_count?: number;
}

export interface CarritoItem {
  id: number;
  producto_id: number;
  nombre: string;
  precio: number;
  imagen?: string | null;
  cantidad: number;
  tienda_id: number;
  tienda_nombre?: string;
  vendedor_id: number;
}

export type EstadoPedido = 'preparacion' | 'en_camino' | 'entregado' | 'rechazado_repartidor' | 'cancelado';
export type MetodoPago = 'efectivo' | 'tarjeta' | 'paypal';

export interface Pedido {
  id: number;
  comprador_id: number;
  vendedor_id: number;
  repartidor_id?: number | null;
  total: number;
  metodo_pago: MetodoPago;
  estado: EstadoPedido;
  direccion_entrega: string;
  lat_entrega?: number | null;
  lng_entrega?: number | null;
  lat_repartidor?: number | null;
  lng_repartidor?: number | null;
  tiempo_estimado?: number | null;
  trafico?: string | null;
  vendedor_nombre?: string;
  comprador_nombre?: string;
  repartidor_nombre?: string;
  tienda_lat?: number;
  tienda_lng?: number;
  tienda_direccion?: string;
  items?: PedidoItem[];
}

export interface PedidoItem {
  id: number;
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  nombre?: string;
  imagen?: string | null;
}

export interface Comentario {
  id: number;
  usuario_id: number;
  producto_id: number;
  comentario: string;
  created_at: string;
  nombre: string;
  foto_perfil?: string | null;
}

export interface Mensaje {
  id: number;
  emisor_id: number;
  receptor_id: number;
  pedido_id?: number | null;
  mensaje: string;
  leido: number;
  created_at: string;
}

export interface Conversacion {
  id: number;
  nombre: string;
  foto_perfil?: string | null;
  rol: Rol;
  ultimo_mensaje?: { mensaje: string; created_at: string } | null;
}

export interface SolicitudRol {
  id: number;
  usuario_id: number;
  rol_solicitado: 'vendedor' | 'repartidor';
  nombre_completo: string;
  dui_numero: string;
  dui_frente: string;
  dui_reverso: string;
  credenciales?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  notas_admin?: string;
  created_at: string;
  usuario_nombre?: string;
  email?: string;
  telefono?: string;
  nombre_negocio?: string | null;
  foto_negocio?: string | null;
  licencia_frente?: string | null;
  licencia_reverso?: string | null;
  tipo_vehiculo?: string | null;
}

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  username?: string | null;
  email?: string | null;
  telefono?: string | null;
  rol: string;
  foto_perfil?: string | null;
  municipio?: string | null;
  activo: number;
  en_linea: number;
  created_at: string;
}

export interface ReporteSoporte {
  id: number;
  usuario_id: number;
  asunto: string;
  descripcion: string;
  estado: 'abierto' | 'en_proceso' | 'cerrado';
  respuesta_admin?: string;
  created_at: string;
  usuario_nombre?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export type RootStackParamList = {
  OnboardingRole: undefined;
  Benefits: undefined;
  Location: undefined;
  OnboardingPhone: undefined;
  Auth: undefined;
  UsernameSetup: undefined;
  Main: undefined;
  Admin: undefined;
  Seller: undefined;
  Driver: undefined;
  Product: { productoId: number };
  Cart: undefined;
  Tracking: { pedidoId: number };
  Chat: { otroId: number; nombre: string; pedidoId?: number };
  BecomeSeller: undefined;
  Support: undefined;
};

export type TabParamList = {
  Home: undefined;
  Reels: undefined;
  Cart: undefined;
  Chats: undefined;
  Profile: undefined;
};
