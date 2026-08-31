import { get, post } from "./client";
import type { Pedido, Producto, Tienda, Usuario } from "../types";

export const vendedorApi = {
  misTiendas: () => get<{ ok: true; tiendas: Tienda[] }>("vendedor_dashboard", "mis_tiendas"),

  crearTienda: (data: {
    nombre: string;
    descripcion?: string;
    categoria?: string;
    telefono?: string;
    municipio: string;
    direccion?: string;
    lat: number;
    lng: number;
    hora_apertura?: string;
    hora_cierre?: string;
    logo?: string;
    portada?: string;
    metodos_pago?: string[];
  }) => post<{ ok: true; id: number }>("vendedor_dashboard", "crear_tienda", data),

  actualizarTienda: (data: { tienda_id: number } & Partial<Omit<Tienda, "metodos_pago">> & { metodos_pago?: string[] }) =>
    post<{ ok: true }>("vendedor_dashboard", "actualizar_tienda", data),

  misProductos: () => get<{ ok: true; productos: Producto[] }>("vendedor_dashboard", "mis_productos"),

  crearProducto: (data: {
    tienda_id: number;
    nombre: string;
    descripcion?: string;
    precio: number;
    precio_oferta?: number;
    stock?: number;
    imagen?: string;
    video?: string;
    categoria?: string;
    es_reel?: boolean;
    tiempo_preparacion?: string;
    hashtags?: string;
  }) => post<{ ok: true; id: number }>("vendedor_dashboard", "crear_producto", data),

  actualizarProducto: (data: { producto_id: number } & Record<string, unknown>) =>
    post<{ ok: true; estado_stock: string | null; imagen: string | null; video_url: string | null }>(
      "vendedor_dashboard",
      "actualizar_producto",
      data,
    ),

  misVentas: () => get<{ ok: true; pedidos: Pedido[] }>("vendedor_dashboard", "mis_ventas"),

  prepararPedido: (pedido_id: number, estado: "preparacion" | "en_camino") =>
    post<{ ok: true }>("vendedor_dashboard", "preparar_pedido", { pedido_id, estado }),

  rechazarPedido: (pedido_id: number) => post<{ ok: true; reembolso: number }>("vendedor_dashboard", "rechazar_pedido", { pedido_id }),

  repartidorPedido: (pedido_id: number) =>
    get<{ ok: true; repartidor: (Usuario & { pedido_estado: string; progreso_repartidor: string | null; tipo_vehiculo?: string }) | null }>(
      "vendedor_dashboard",
      "repartidor_pedido",
      { pedido_id },
    ),

  repartidoresCercanos: (pedido_id: number) =>
    get<{ ok: true; repartidores: (Usuario & { distancia_km?: number; tipo_vehiculo?: string })[] }>(
      "vendedor_dashboard",
      "repartidores_cercanos",
      { pedido_id },
    ),

  asignarRepartidor: (pedido_id: number, repartidor_id: number) =>
    post<{ ok: true }>("vendedor_dashboard", "asignar_repartidor", { pedido_id, repartidor_id }),

  confirmarRecogida: (pedido_id: number) =>
    post<{ ok: true; en_camino: boolean; qr_token: string }>("vendedor_dashboard", "confirmar_recogida", { pedido_id }),

  misResenas: () =>
    get<{ ok: true; resenas: { id: number; estrellas: number; comentario: string; respuesta_vendedor: string | null; respuesta_at: string | null; created_at: string; comprador_nombre: string }[] }>(
      "vendedor_dashboard",
      "mis_resenas",
    ),

  responderResena: (calificacion_id: number, respuesta: string) =>
    post<{ ok: true }>("vendedor_dashboard", "responder_resena", { calificacion_id, respuesta }),

  notificaciones: () =>
    get<{
      ok: true;
      pedidos: { id: number; titulo: string; cuerpo: string | null; leida: number; referencia_id: number | null; created_at: string }[];
      likes: { id: number; created_at: string; producto_id: number; producto_nombre: string; usuario_id: number; usuario_nombre: string; foto_perfil: string | null }[];
      comentarios: { id: number; created_at: string; producto_id: number; comentario: string; producto_nombre: string; usuario_id: number; usuario_nombre: string; foto_perfil: string | null }[];
    }>("vendedor_dashboard", "notificaciones"),

  ganancias: () =>
    get<{ ok: true; ganancias_por_dia: { fecha: string; monto: number }[]; producto_top: { id: number; nombre: string; total_vendido: number } | null }>(
      "vendedor_dashboard",
      "ganancias",
    ),
};
