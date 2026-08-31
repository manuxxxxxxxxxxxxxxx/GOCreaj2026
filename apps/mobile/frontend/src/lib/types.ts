export type Rol = "comprador" | "vendedor" | "repartidor" | "admin";

export interface Usuario {
  id: number;
  nombre: string;
  username: string | null;
  email: string | null;
  telefono: string | null;
  telefono_verificado?: number;
  rol: Rol;
  foto_perfil: string | null;
  municipio: string | null;
  lat?: number | null;
  lng?: number | null;
  auth_provider?: string;
  en_linea?: number;
  descripcion?: string | null;
  repartidor_calificacion_promedio?: number;
  repartidor_total_resenas?: number;
  idioma?: string;
  perfil_publico?: number;
  activo?: number;
  created_at?: string;
}

export interface Tienda {
  id: number;
  vendedor_id: number;
  nombre: string;
  descripcion?: string | null;
  categoria: string | null;
  telefono?: string | null;
  municipio: string;
  direccion?: string | null;
  lat: number | null;
  lng: number | null;
  hora_apertura?: string | null;
  hora_cierre?: string | null;
  logo: string | null;
  portada: string | null;
  foto_negocio?: string | null;
  metodos_pago?: string | null;
  calificacion_promedio: number;
  total_resenas: number;
  ventas_completadas?: number;
  activo?: number;
  vendedor_nombre?: string;
  seguidores_count?: number;
  yo_sigo?: number;
}

export type EstadoStock = "disponible" | "agotado";

export interface Producto {
  id: number;
  tienda_id: number;
  nombre: string;
  descripcion?: string | null;
  precio: number;
  precio_oferta?: number | null;
  oferta_hasta?: string | null;
  stock: number;
  estado_stock: EstadoStock;
  imagen: string | null;
  video_url?: string | null;
  categoria: string;
  es_reel?: number;
  vistas_count?: number;
  tiempo_preparacion?: string | null;
  activo?: number;
  tienda_nombre?: string;
  municipio?: string;
  tienda_lat?: number | null;
  tienda_lng?: number | null;
  tienda_calificacion?: number | null;
  tienda_logo?: string | null;
  tienda_total_resenas?: number;
  vendedor_id?: number;
  hashtags?: string | null;
  likes_count?: number;
  comentarios_count?: number;
  compartidos_count?: number;
  seguidores_count?: number;
  yo_like?: number;
  yo_guardado?: number;
  yo_sigo?: number;
}

export interface CarritoItem {
  id: number;
  cantidad: number;
  producto_id: number;
  nombre: string;
  precio: number;
  precio_oferta: number | null;
  oferta_hasta: string | null;
  precio_efectivo: number;
  imagen: string | null;
  stock: number;
  estado_stock: EstadoStock;
  tienda_id: number;
  tienda_nombre: string;
  vendedor_id: number;
}

export type EstadoPedido =
  | "pendiente_confirmacion"
  | "preparacion"
  | "en_camino"
  | "entregado"
  | "cancelado"
  | "rechazado_repartidor";

export type ProgresoRepartidor = "camino_tienda" | "recolectado" | "camino_cliente" | "entregado" | null;

export interface PedidoItem {
  id?: number;
  pedido_id?: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  nombre: string;
  imagen: string | null;
  categoria?: string;
  stock?: number;
  estado_stock?: EstadoStock;
}

export interface Pedido {
  id: number;
  comprador_id: number;
  vendedor_id: number;
  repartidor_id: number | null;
  total: number;
  metodo_pago: "efectivo" | "tarjeta" | "paypal";
  direccion_entrega: string;
  lat_entrega?: number | null;
  lng_entrega?: number | null;
  municipio_entrega?: string | null;
  departamento_entrega?: string | null;
  estado: EstadoPedido;
  progreso_repartidor?: ProgresoRepartidor;
  pago_estado: "pendiente" | "pagado" | "contraentrega" | "reembolsado";
  pago_referencia?: string | null;
  efectivo_paga_con?: number | null;
  comision_plataforma?: number;
  total_repartidor?: number;
  total_vendedor?: number;
  cupon_codigo?: string | null;
  descuento_cupon?: number;
  repartidor_lat?: number | null;
  repartidor_lng?: number | null;
  tiempo_estimado?: number | null;
  trafico?: "fluido" | "moderado" | "pesado" | null;
  qr_recogida_token?: string | null;
  qr_entrega_token?: string | null;
  confirmado_vendedor_recogida?: number;
  confirmado_repartidor_recogida?: number;
  created_at: string;
  updated_at?: string;
  items: PedidoItem[];
  vendedor_nombre?: string;
  repartidor_nombre?: string;
  comprador_nombre?: string;
  comprador_telefono?: string;
  tienda_nombre?: string;
  tienda_lat?: number | null;
  tienda_lng?: number | null;
  tienda_direccion?: string;
  repartidor_foto?: string | null;
  repartidor_telefono?: string | null;
  repartidor_calificacion_promedio?: number;
  repartidor_total_resenas?: number;
  repartidor_entregas_completadas?: number;
  mi_calificacion?: number | null;
  mi_comentario?: string | null;
  mi_calificacion_repartidor?: number | null;
  ganancia_repartidor?: number;
  distancia_km?: number | null;
}

export interface ChatMensaje {
  id: number;
  pedido_id?: number | null;
  emisor_id: number;
  receptor_id: number;
  mensaje: string;
  tipo: "texto" | "imagen" | "video" | "ubicacion" | "pdf" | "audio" | "producto";
  adjunto?: string | null;
  adjunto_nombre?: string | null;
  adjunto_tamano?: number | null;
  adjunto_duracion?: number | null;
  lat?: number | null;
  lng?: number | null;
  leido: number;
  reply_to_id?: number | null;
  reply_snapshot?: Record<string, unknown> | null;
  reacciones?: { emoji: string; count: number; mio: boolean }[];
  created_at: string;
}

export interface Conversacion {
  id: number;
  nombre: string;
  username: string | null;
  foto_perfil: string | null;
  rol: Rol;
  en_linea: number;
  ultimo_mensaje: ChatMensaje | null;
  no_leidos: number;
  archivado: number;
  favorito: number;
}

export interface Notificacion {
  id: number;
  usuario_id: number;
  titulo: string;
  cuerpo: string | null;
  tipo: "pedido" | "chat" | "sistema" | "promocion";
  leida: number;
  referencia_id: number | null;
  created_at: string;
}

export interface Cupon {
  id: number;
  codigo: string;
  tipo: "porcentaje" | "monto";
  valor: number;
  min_compra: number;
  usos_max: number | null;
  usos_actuales: number;
  activo: number;
  expira_at: string | null;
  created_at: string;
}

export interface WalletMovimiento {
  id: number;
  usuario_id: number;
  tipo: "venta" | "entrega" | "reembolso" | "retiro_solicitado" | "retiro_rechazado";
  monto: number;
  referencia: string | null;
  pedido_id: number | null;
  created_at: string;
}

export interface Retiro {
  id: number;
  usuario_id: number;
  monto: number;
  metodo: string;
  datos_cuenta: string;
  estado: "pendiente" | "aprobado" | "rechazado" | "pagado";
  notas_admin: string | null;
  created_at: string;
  resuelto_at: string | null;
  usuario_nombre?: string;
  usuario_rol?: Rol;
}

export interface DireccionUsuario {
  id: number;
  usuario_id: number;
  alias: string;
  municipio: string;
  departamento: string;
  direccion: string;
  referencia: string | null;
  lat: number | null;
  lng: number | null;
  es_principal: number;
  created_at: string;
}

export interface MetodoPago {
  id: number;
  marca: "visa" | "mastercard" | "amex" | "tarjeta";
  ultimos4: string;
  exp_mes: number;
  exp_anio: number;
  predeterminado: number;
}

export interface SolicitudRol {
  id: number;
  usuario_id: number;
  rol_solicitado: "vendedor" | "repartidor";
  nombre_completo: string;
  municipio?: string | null;
  estado: "pendiente" | "aprobado" | "rechazado";
  notas_admin?: string | null;
  created_at: string;
  usuario_nombre?: string;
  email?: string;
  telefono?: string;
}

export interface Municipio {
  id: number;
  nombre: string;
  departamento: string;
  lat: number;
  lng: number;
  cobertura_activa?: number;
}

export interface ReporteSoporte {
  id: number;
  usuario_id: number;
  asunto: string;
  descripcion: string;
  estado: "abierto" | "resuelto" | "cerrado";
  respuesta_admin?: string | null;
  created_at: string;
}
