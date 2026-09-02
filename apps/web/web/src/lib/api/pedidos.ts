import { get, post } from "./client";
import type { Pedido } from "../types";

export const pedidosApi = {
  misPedidos: () => get<{ ok: true; pedidos: Pedido[] }>("carrito_pagos", "mis_pedidos"),

  cancelar: (pedido_id: number) => post<{ ok: true }>("carrito_pagos", "cancelar", { pedido_id }),

  calificar: (data: { pedido_id: number; estrellas: number; comentario?: string; estrellas_repartidor?: number; comentario_repartidor?: string }) =>
    post<{ ok: true; promedio: number; total: number; promedio_repartidor: number | null; total_repartidor: number | null }>(
      "carrito_pagos",
      "calificar",
      data,
    ),

  estado: (pedido_id: number) => get<{ ok: true; pedido: Pedido }>("pedidos_tracking", "estado", { pedido_id }),

  confirmarEntrega: (pedido_id: number, codigo: { qr_token: string } | { pin: string }) =>
    post<{ ok: true; comision: number; ganancia_repartidor: number; ganancia_vendedor: number }>(
      "pedidos_tracking",
      "confirmar_entrega",
      { pedido_id, ...codigo },
    ),

  actualizarUbicacionRepartidor: (data: { pedido_id: number; lat: number; lng: number }) =>
    post<{ ok: true; tracking: { tiempo_estimado: number | null; trafico: string | null } }>(
      "pedidos_tracking",
      "actualizar_ubicacion",
      data,
    ),
};
