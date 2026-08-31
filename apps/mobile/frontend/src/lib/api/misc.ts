import { get, post } from "./client";
import type {
  Cupon,
  DireccionUsuario,
  Municipio,
  Notificacion,
  Producto,
  ReporteSoporte,
  Retiro,
  SolicitudRol,
  WalletMovimiento,
} from "../types";

export const cuponesApi = {
  validar: (codigo: string, monto: number) => post<{ ok: true; cupon: Cupon; descuento: number }>("cupones", "validar", { codigo, monto }),
  listar: () => get<{ ok: true; cupones: Cupon[] }>("cupones", "listar"),
  crear: (data: { codigo: string; tipo: "porcentaje" | "monto"; valor: number; min_compra?: number; usos_max?: number; expira_at?: string }) =>
    post<{ ok: true; id: number }>("cupones", "crear", data),
  actualizar: (data: { id: number } & Record<string, unknown>) => post<{ ok: true }>("cupones", "actualizar", data),
  eliminar: (id: number) => post<{ ok: true }>("cupones", "eliminar", { id }),
  toggleActivo: (id: number) => post<{ ok: true }>("cupones", "toggle_activo", { id }),
};

export const walletApi = {
  saldo: () =>
    get<{ ok: true; saldo: number; retiros_pendientes: number; movimientos: WalletMovimiento[] }>("wallet", "saldo"),
  movimientos: (page = 1, limit = 30) => get<{ ok: true; movimientos: WalletMovimiento[]; page: number }>("wallet", "movimientos", { page, limit }),
  solicitarRetiro: (data: { monto: number; metodo: string; datos_cuenta: string }) =>
    post<{ ok: true; mensaje: string }>("wallet", "solicitar_retiro", data),
  misRetiros: () => get<{ ok: true; retiros: Retiro[] }>("wallet", "mis_retiros"),
};

export const notificacionesApi = {
  listar: (page = 1, limit = 30) => get<{ ok: true; notificaciones: Notificacion[] }>("notificaciones", "listar", { page, limit }),
  contador: () => get<{ ok: true; no_leidas: number }>("notificaciones", "contador"),
  marcarLeida: (id: number) => post<{ ok: true }>("notificaciones", "marcar_leida", { id }),
  marcarTodasLeidas: () => post<{ ok: true }>("notificaciones", "marcar_todas_leidas"),
  eliminar: (id: number) => post<{ ok: true }>("notificaciones", "eliminar", { id }),
};

export const interaccionesApi = {
  toggleLike: (producto_id: number) =>
    post<{ ok: true; accion: "like" | "unlike"; contadores: Record<string, number> }>("interacciones", "toggle_like", { producto_id }),
  toggleGuardar: (producto_id: number) =>
    post<{ ok: true; accion: "guardar" | "unguardar"; contadores: Record<string, number> }>("interacciones", "toggle_guardar", { producto_id }),
  registrarVista: (producto_id: number) => post<{ ok: true }>("interacciones", "registrar_vista", { producto_id }),
  compartir: (producto_id: number, canal = "app") =>
    post<{ ok: true; contadores: Record<string, number> }>("interacciones", "compartir", { producto_id, canal }),
  comentar: (producto_id: number, comentario: string, parent_id?: number) =>
    post<{ ok: true; contadores: Record<string, number> }>("interacciones", "comentar", { producto_id, comentario, parent_id }),
  listarComentarios: (producto_id: number) =>
    get<{
      ok: true;
      comentarios: { id: number; producto_id: number; comentario: string; created_at: string; parent_id: number | null; likes_count: number; usuario_id: number; nombre: string; foto_perfil: string | null; yo_like: number }[];
    }>("interacciones", "listar_comentarios", { producto_id }),
  likeComentario: (comentario_id: number) => post<{ ok: true; accion: "like" | "unlike" }>("interacciones", "like_comentario", { comentario_id }),
  seguirTienda: (tienda_id: number) =>
    post<{ ok: true; accion: "follow" | "unfollow"; total_seguidores: number }>("interacciones", "seguir_tienda", { tienda_id }),
  misLikes: () => get<{ ok: true; productos: Producto[] }>("interacciones", "mis_likes"),
  misGuardados: () => get<{ ok: true; productos: Producto[] }>("interacciones", "mis_guardados"),
  misCompartidos: () => get<{ ok: true; productos: Producto[] }>("interacciones", "mis_compartidos"),
};

export const direccionesApi = {
  listar: () => get<{ ok: true; direcciones: DireccionUsuario[] }>("direcciones", "listar"),
  crear: (data: Omit<DireccionUsuario, "id" | "usuario_id" | "created_at">) => post<{ ok: true; id: number }>("direcciones", "crear", data),
  actualizar: (data: { id: number } & Partial<DireccionUsuario>) => post<{ ok: true }>("direcciones", "actualizar", data),
  eliminar: (id: number) => post<{ ok: true }>("direcciones", "eliminar", { id }),
  marcarPrincipal: (id: number) => post<{ ok: true }>("direcciones", "marcar_principal", { id }),
};

export const solicitudesApi = {
  crear: (data: {
    rol_solicitado: "vendedor" | "repartidor";
    nombre_completo: string;
    municipio?: string;
    dui_numero: string;
    dui_frente: string;
    dui_reverso: string;
    nombre_negocio?: string;
    foto_negocio?: string;
    licencia_frente?: string;
    licencia_reverso?: string;
    tipo_vehiculo?: string;
    credenciales?: string;
  }) => post<{ ok: true; solicitud_id: number }>("perfil_solicitudes", "crear", data),
  misSolicitudes: () => get<{ ok: true; solicitudes: SolicitudRol[] }>("perfil_solicitudes", "mis_solicitudes"),
};

export const soporteApi = {
  crear: (asunto: string, descripcion: string) => post<{ ok: true; id: number }>("soporte", "crear", { asunto, descripcion }),
  misTickets: () => get<{ ok: true; reportes: ReporteSoporte[] }>("soporte", "mis_tickets"),
};

export const municipiosApi = {
  catalogo: (): Promise<{ ok: true; municipios: Municipio[] }> => get("productos", "municipios_catalogo"),
};
