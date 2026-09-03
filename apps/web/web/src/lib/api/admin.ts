import { get, post } from "./client";
import type { Pedido, Producto, ReporteSoporte, Retiro, SolicitudRol, Usuario } from "../types";

export const adminApi = {
  solicitudes: (estado: "pendiente" | "aprobado" | "rechazado" = "pendiente") =>
    get<{ ok: true; solicitudes: SolicitudRol[] }>("admin_dashboard", "solicitudes", { estado }),

  resolver: (solicitud_id: number, decision: "aprobado" | "rechazado", notas?: string) =>
    post<{ ok: true }>("admin_dashboard", "resolver", { solicitud_id, decision, notas }),

  stats: () =>
    get<{
      ok: true;
      stats: {
        usuarios: number;
        compradores: number;
        vendedores: number;
        repartidores: number;
        admins: number;
        pedidos: number;
        pedidos_hoy: number;
        ingresos_total: number;
        solicitudes_pendientes: number;
        soporte_abiertos: number;
        productos_activos: number;
        tiendas_activas: number;
      };
    }>("admin_dashboard", "stats"),

  usuarios: (params: { page?: number; limit?: number; q?: string; rol?: string } = {}) =>
    get<{ ok: true; usuarios: Usuario[]; total: number; page: number; limit: number }>("admin_dashboard", "usuarios", params),

  actualizarUsuario: (data: { usuario_id: number } & Record<string, unknown>) =>
    post<{ ok: true }>("admin_dashboard", "actualizar_usuario", data),

  pedidos: (estado?: string) => get<{ ok: true; pedidos: Pedido[] }>("admin_dashboard", "pedidos", { estado }),

  actualizarPedido: (pedido_id: number, estado: string) => post<{ ok: true }>("admin_dashboard", "actualizar_pedido", { pedido_id, estado }),

  productos: (categoria?: string) => get<{ ok: true; productos: Producto[] }>("admin_dashboard", "productos", { categoria }),

  actualizarProducto: (data: { producto_id: number } & Record<string, unknown>) => post<{ ok: true }>("admin_dashboard", "actualizar_producto", data),

  eliminarProducto: (producto_id: number) => post<{ ok: true }>("admin_dashboard", "eliminar_producto", { producto_id }),

  soporte: () => get<{ ok: true; reportes: ReporteSoporte[] }>("admin_dashboard", "soporte"),

  responderSoporte: (reporte_id: number, respuesta: string, estado: string) =>
    post<{ ok: true }>("admin_dashboard", "responder_soporte", { reporte_id, respuesta, estado }),

  actividadReciente: () =>
    get<{ ok: true; actividad: { tipo: string; descripcion: string; fecha: string }[] }>("admin_dashboard", "actividad_reciente"),

  arbolControl: () =>
    get<{
      ok: true;
      arbol: {
        vendedores: Usuario[];
        repartidores: Usuario[];
        compradores: Usuario[];
        productos: (Producto & { tienda_id: number })[];
        tiendas: { id: number; nombre: string; municipio: string; logo: string | null; activo: number; calificacion_promedio: number; vendedor_id: number; vendedor_nombre: string }[];
        reels: (Producto & { reportes: number })[];
      };
    }>("admin_dashboard", "arbol_control"),

  banearUsuario: (usuario_id: number, razon?: string) => post<{ ok: true; activo: number }>("admin_dashboard", "banear_usuario", { usuario_id, razon }),

  toggleTiendaActiva: (tienda_id: number) => post<{ ok: true; activo: number }>("admin_dashboard", "toggle_tienda_activa", { tienda_id }),

  metricasFinancieras: () =>
    get<{
      ok: true;
      metricas: {
        ventas_totales: number;
        comision_plataforma: number;
        pagado_vendedores: number;
        pagado_repartidores: number;
        retiros_pendientes: number;
        saldo_en_wallets: number;
        por_estado: { estado: string; total: number; monto: number }[];
        ultimos_30_dias: { fecha: string; pedidos: number; ventas: number }[];
        top_tiendas: { nombre: string; pedidos: number; ventas: number }[];
      };
    }>("admin_dashboard", "metricas_financieras"),

  municipiosCobertura: () =>
    get<{ ok: true; municipios: { id: number; nombre: string; departamento: string; cobertura_activa: number }[] }>(
      "admin_dashboard",
      "municipios_cobertura",
    ),

  toggleCobertura: (municipio_id: number) =>
    post<{ ok: true; cobertura_activa: number }>("admin_dashboard", "toggle_cobertura", { municipio_id }),

  repartidoresActivos: () =>
    get<{
      ok: true;
      repartidores: (Usuario & {
        lat: number | null;
        lng: number | null;
        pedido_activo: (Pedido & { tienda_lat?: number; tienda_lng?: number }) | null;
      })[];
    }>("admin_dashboard", "repartidores_activos"),

  repartidorDetalle: (repartidor_id: number) =>
    get<{ ok: true; repartidor: Usuario & { comentarios: unknown[]; entregas_hoy: number; pedido_activo: Pedido | null } }>(
      "admin_dashboard",
      "repartidor_detalle",
      { repartidor_id },
    ),

  retiros: (estado?: string) => get<{ ok: true; retiros: Retiro[] }>("admin_dashboard", "retiros", { estado }),

  resolverRetiro: (retiro_id: number, decision: "aprobado" | "rechazado" | "pagado", notas?: string) =>
    post<{ ok: true }>("admin_dashboard", "resolver_retiro", { retiro_id, decision, notas }),

  eliminarReel: (producto_id: number) => post<{ ok: true }>("admin_dashboard", "eliminar_reel", { producto_id }),

  reportesReel: (producto_id: number) =>
    get<{ ok: true; reportes: { id: number; motivo: string; created_at: string; estado: string; usuario_nombre: string }[] }>(
      "admin_dashboard",
      "reportes_reel",
      { producto_id },
    ),

  descartarReportes: (producto_id: number) => post<{ ok: true }>("admin_dashboard", "descartar_reportes", { producto_id }),

  advertirVendedorReel: (producto_id: number, motivo?: string) =>
    post<{ ok: true }>("admin_dashboard", "advertir_vendedor_reel", { producto_id, motivo }),

  // Moderación genérica (tiendas, comentarios de reels y chats reportados) -- reels y
  // productos siguen con reportesReel/eliminarReel de arriba, que ya usan productos_reportes.
  reportesGenerales: (tipo?: "tienda" | "comentario" | "chat") =>
    get<{
      ok: true;
      reportes: {
        id: number;
        tipo: "tienda" | "comentario" | "chat";
        entidad_id: number;
        motivo: string;
        detalle: string | null;
        estado: string;
        created_at: string;
        usuario_nombre: string;
        objetivo: string;
        producto_id?: number | null;
      }[];
    }>("admin_dashboard", "reportes_generales", tipo ? { tipo } : {}),

  resolverReporteGeneral: (id: number, estado: "resuelto" | "descartado") =>
    post<{ ok: true }>("admin_dashboard", "resolver_reporte_general", { id, estado }),

  eliminarComentarioReel: (comentario_id: number) =>
    post<{ ok: true }>("admin_dashboard", "eliminar_comentario_reel", { comentario_id }),
};
