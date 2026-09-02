import { get } from "./client";
import type { Producto, Tienda } from "../types";

export const productosApi = {
  listar: (params: { municipio?: string; departamento?: string; categoria?: string; tienda_id?: number; con_coordenadas?: boolean; stock_min?: number; page?: number; limit?: number }) =>
    get<{ ok: true; productos: Producto[]; page: number; limit: number; total: number; has_more: boolean }>("productos", "listar", params),

  nuevasTiendas: (params: { municipio?: string; departamento?: string; limit?: number } = {}) =>
    get<{ ok: true; tiendas: Tienda[] }>("productos", "nuevas_tiendas", params),

  tiendasDestacadas: (params: { municipio?: string; departamento?: string; limit?: number } = {}) =>
    get<{ ok: true; tiendas: Tienda[] }>("productos", "tiendas_destacadas", params),

  cercanos: (params: { lat: number; lng: number; categoria?: string; limit?: number }) =>
    get<{ ok: true; tiendas: (Tienda & { distancia_km: number })[] }>("productos", "cercanos", params),

  buscar: (params: { q?: string; municipio?: string; departamento?: string; categoria?: string; tienda_id?: number; page?: number; limit?: number; con_coordenadas?: boolean }) =>
    get<{ ok: true; productos: Producto[]; q: string; page: number; limit: number; total: number }>("productos", "buscar", params),

  buscarTiendas: (params: { q: string; limit?: number }) =>
    get<{ ok: true; tiendas: Tienda[] }>("productos", "tiendas_buscar", params),

  reels: (params: { municipio?: string; tienda_id?: number } = {}) => get<{ ok: true; reels: Producto[] }>("productos", "reels", params),

  detalle: (id: number) => get<{ ok: true; producto: Producto }>("productos", "detalle", { id }),

  tiendaDetalle: (tienda_id: number) => get<{ ok: true; tienda: Tienda }>("productos", "tienda_detalle", { tienda_id }),

  tiendaResenas: (tienda_id: number) =>
    get<{
      ok: true;
      resenas: { id: number; estrellas: number; comentario: string; respuesta_vendedor: string | null; respuesta_at: string | null; created_at: string; comprador_nombre: string }[];
    }>("productos", "tienda_resenas", { tienda_id }),

  municipios: () => get<{ ok: true; municipios: string[] }>("productos", "municipios"),

  municipiosCatalogo: () =>
    get<{ ok: true; municipios: { id: number; nombre: string; departamento: string; lat: number; lng: number; cobertura_activa?: number }[] }>(
      "productos",
      "municipios_catalogo",
    ),

  tiendasPorDepartamento: () => get<{ ok: true; conteo: Record<string, number> }>("productos", "tiendas_por_departamento"),
};
