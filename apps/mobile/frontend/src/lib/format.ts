import type { Usuario } from "./types";

const currencyFmt = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
const dateFmt = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("es-SV", { hour: "numeric", minute: "2-digit" });

export function money(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return currencyFmt.format(Number.isFinite(n) ? n : 0);
}

/** DUI salvadoreño: 8 dígitos + 1 verificador, se escribe/muestra como "########-#".
 * Sin esto el campo aceptaba cualquier cantidad de caracteres sin límite. */
export function formatDui(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  return digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
}

/** Convierte texto libre en hashtags mientras se escribe: cada palabra separada por
 * espacio se prefija con "#" (o se conserva "#carro-nuevo" si el usuario unió dos
 * palabras con guion) -- así nunca se guardan etiquetas sin el "#". */
export function formatHashtags(raw: string): string {
  const terminaEnEspacio = /\s$/.test(raw);
  const tags = raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/#/g, "").replace(/[^\p{L}\p{N}_-]/gu, ""))
    .filter(Boolean)
    .map((t) => `#${t}`);
  return tags.join(" ") + (terminaEnEspacio && tags.length ? " " : "");
}

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso.replace(" ", "T")));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso.replace(" ", "T")));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso.replace(" ", "T")));
}

export function relativeTime(iso: string): string {
  const then = new Date(iso.replace(" ", "T")).getTime();
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `hace ${day} d`;
  return formatDate(iso);
}

/** Número de pedido visible al comprador. Usa el código aleatorio del backend;
 * si el pedido es de antes de que existiera esa columna, cae al id (mismo
 * formato "SV-" que ya se usaba). */
export function numeroPedido(p: { id: number; numero_pedido?: string | null }): string {
  return p.numero_pedido || `SV-${p.id}`;
}

/** % de perfil completo (0–1) para el anillo de avatar del comprador: foto, teléfono
 * verificado, municipio y correo pesan igual — son los campos que ya pedimos en Perfil. */
export function calcularPerfilCompleto(usuario: Usuario): number {
  const campos = [!!usuario.foto_perfil, !!usuario.telefono_verificado, !!usuario.municipio, !!usuario.email];
  return campos.filter(Boolean).length / campos.length;
}
