import { get, post } from "./client";
import type { Pedido, WalletMovimiento } from "../types";

export const repartidorApi = {
  disponibles: () => get<{ ok: true; pedidos: (Pedido & { distancia_km?: number; ganancia_repartidor: number })[]; en_linea: boolean; bloqueado_por_entrega_activa?: boolean }>(
    "repartidor_dashboard",
    "disponibles",
  ),

  aceptar: (pedido_id: number) => post<{ ok: true }>("repartidor_dashboard", "aceptar", { pedido_id }),

  confirmarRecogida: (pedido_id: number, codigo: { qr_token: string } | { pin: string }) =>
    post<{ ok: true; en_camino: boolean }>("repartidor_dashboard", "confirmar_recogida", { pedido_id, ...codigo }),

  generarQrEntrega: (pedido_id: number) => post<{ ok: true; qr_token: string; pin: string }>("repartidor_dashboard", "generar_qr_entrega", { pedido_id }),

  rechazar: (pedido_id: number) => post<{ ok: true }>("repartidor_dashboard", "rechazar", { pedido_id }),

  misEntregas: () => get<{ ok: true; pedidos: Pedido[] }>("repartidor_dashboard", "mis_entregas"),

  avanzarEstado: (data: { pedido_id: number; lat?: number; lng?: number }) =>
    post<{ ok: true; progreso_repartidor: string }>("repartidor_dashboard", "avanzar_estado", data),

  completar: (pedido_id: number) =>
    post<{ ok: true; comision: number; ganancia_repartidor: number; ganancia_vendedor: number }>("repartidor_dashboard", "completar", { pedido_id }),

  toggleEnLinea: (en_linea: boolean) => post<{ ok: true; en_linea: boolean }>("repartidor_dashboard", "toggle_en_linea", { en_linea }),

  wallet: () =>
    get<{ ok: true; saldo: number; movimientos: WalletMovimiento[]; stats: { hoy: number; semana: number; entregas_hoy: number } }>(
      "repartidor_dashboard",
      "wallet",
    ),

  miPerfil: () =>
    get<{
      ok: true;
      perfil: { id: number; nombre: string; foto_perfil: string | null; descripcion: string | null; telefono: string; repartidor_calificacion_promedio: number; repartidor_total_resenas: number; entregas_completadas: number };
    }>("repartidor_dashboard", "mi_perfil"),

  actualizarPerfil: (data: { descripcion?: string; foto_perfil?: string }) =>
    post<{ ok: true; foto_perfil: string | null }>("repartidor_dashboard", "actualizar_perfil", data),

  misResenas: () =>
    get<{ ok: true; resenas: { id: number; estrellas: number; comentario: string; created_at: string; comprador_nombre: string }[] }>(
      "repartidor_dashboard",
      "mis_resenas",
    ),

  ganancias: () =>
    get<{ ok: true; ganancias_por_dia: { fecha: string; monto: number }[]; minutos_por_dia: { fecha: string; minutos: number }[] }>(
      "repartidor_dashboard",
      "ganancias",
    ),
};
