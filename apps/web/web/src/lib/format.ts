import type { Usuario } from "./types";

const currencyFmt = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" });
const dateFmt = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("es-SV", { hour: "numeric", minute: "2-digit" });

export function money(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return currencyFmt.format(Number.isFinite(n) ? n : 0);
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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
