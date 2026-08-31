import { get, post } from "./client";
import type { CarritoItem, MetodoPago } from "../types";

export const carritoApi = {
  listar: () => get<{ ok: true; items: CarritoItem[]; total: number }>("carrito_pagos", "listar"),

  agregar: (producto_id: number, cantidad = 1) =>
    post<{ ok: true }>("carrito_pagos", "agregar", { producto_id, cantidad }),

  actualizar: (carrito_id: number, cantidad: number) =>
    post<{ ok: true }>("carrito_pagos", "actualizar", { carrito_id, cantidad }),

  eliminar: (carrito_id: number) => post<{ ok: true }>("carrito_pagos", "eliminar", { carrito_id }),

  checkout: (data: {
    metodo_pago: "efectivo" | "tarjeta" | "paypal";
    direccion_entrega: string;
    lat?: number;
    lng?: number;
    municipio?: string;
    departamento?: string;
    metodo_pago_id?: number;
    tarjeta_numero?: string;
    tarjeta_cvv?: string;
    tarjeta_exp?: string;
    guardar_tarjeta?: boolean;
    paypal_codigo_2fa?: string;
    efectivo_paga_con?: number;
    envio_modo?: "estandar" | "express";
    cupon_codigo?: string;
  }) =>
    post<{ ok: true; pedidos: number[]; numeros_pedido: string[]; pago_estado: string; pago_referencia: string; descuento_aplicado: number }>(
      "carrito_pagos",
      "checkout",
      data,
    ),

  metodosListar: () => get<{ ok: true; metodos: MetodoPago[] }>("carrito_pagos", "metodos_listar"),

  metodosGuardar: (data: { tarjeta_numero: string; tarjeta_cvv: string; tarjeta_exp: string; predeterminado?: boolean }) =>
    post<{ ok: true; id: number }>("carrito_pagos", "metodos_guardar", data),

  metodosEliminar: (id: number) => post<{ ok: true }>("carrito_pagos", "metodos_eliminar", { id }),

  metodosPredeterminado: (id: number) => post<{ ok: true }>("carrito_pagos", "metodos_predeterminado", { id }),
};
