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

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
