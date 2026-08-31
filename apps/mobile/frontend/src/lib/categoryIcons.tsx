import {
  BasketIcon,
  BreadIcon,
  CarrotIcon,
  CoffeeIcon,
  CouchIcon,
  DeviceMobileIcon,
  ForkKnifeIcon,
  IceCreamIcon,
  LeafIcon,
  PackageIcon,
  PillIcon,
  SneakerIcon,
  TShirtIcon,
  TruckIcon,
  type IconProps,
} from "phosphor-react-native";
import type { ComponentType } from "react";

export const CATEGORIAS = [
  "comida",
  "mercado",
  "farmacia",
  "bebidas",
  "panaderia",
  "postres",
  "frutas",
  "verduras",
  "ropa",
  "calzado",
  "electronica",
  "hogar",
  "envios",
  "general",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  comida: "Comida",
  mercado: "Mercado",
  farmacia: "Farmacia",
  bebidas: "Bebidas",
  panaderia: "Panadería",
  postres: "Postres",
  frutas: "Frutas",
  verduras: "Verduras",
  ropa: "Ropa",
  calzado: "Calzado",
  electronica: "Electrónica",
  hogar: "Hogar",
  envios: "Envíos",
  general: "General",
};

export const CATEGORIA_ICON: Record<Categoria, ComponentType<IconProps>> = {
  comida: ForkKnifeIcon,
  mercado: BasketIcon,
  farmacia: PillIcon,
  bebidas: CoffeeIcon,
  panaderia: BreadIcon,
  postres: IceCreamIcon,
  frutas: LeafIcon,
  verduras: CarrotIcon,
  ropa: TShirtIcon,
  calzado: SneakerIcon,
  electronica: DeviceMobileIcon,
  hogar: CouchIcon,
  envios: TruckIcon,
  general: PackageIcon,
};

/** One accent hue per category so the category rail isn't monochrome (mirrors web). */
export const CATEGORIA_COLOR: Record<Categoria, string> = {
  comida: "#f97316",
  mercado: "#10b981",
  farmacia: "#14b8a6",
  bebidas: "#3b82f6",
  panaderia: "#d97706",
  postres: "#ec4899",
  frutas: "#84cc16",
  verduras: "#15803d",
  ropa: "#7c3aed",
  calzado: "#0891b2",
  electronica: "#475569",
  hogar: "#b45309",
  envios: "#6366f1",
  general: "#64748b",
};

export const CATEGORIA_EMOJI: Record<Categoria, string> = {
  comida: "🍔",
  mercado: "🛒",
  farmacia: "💊",
  bebidas: "🥤",
  panaderia: "🍞",
  postres: "🍰",
  frutas: "🍎",
  verduras: "🥕",
  ropa: "👕",
  calzado: "👟",
  electronica: "📱",
  hogar: "🛋️",
  envios: "🚚",
  general: "📦",
};

/**
 * Algunas tiendas antiguas guardaron su categoría con mayúsculas (ej. "Comida" en vez de
 * "comida") desde un flujo previo a que se normalizara al enum de CATEGORIAS -- sin
 * normalizar aquí, esas tiendas caen siempre al ícono/color "general" por un simple
 * desajuste de mayúsculas, no porque de verdad no tengan categoría.
 */
function normalizarCategoria(cat: string | undefined): Categoria {
  return (cat?.toLowerCase() as Categoria) ?? "general";
}

export function categoriaIcon(cat: string | undefined): ComponentType<IconProps> {
  return CATEGORIA_ICON[normalizarCategoria(cat)] ?? PackageIcon;
}

export function categoriaColor(cat: string | undefined): string {
  return CATEGORIA_COLOR[normalizarCategoria(cat)] ?? CATEGORIA_COLOR.general;
}

export function categoriaEmoji(cat: string | undefined): string {
  return CATEGORIA_EMOJI[normalizarCategoria(cat)] ?? CATEGORIA_EMOJI.general;
}
