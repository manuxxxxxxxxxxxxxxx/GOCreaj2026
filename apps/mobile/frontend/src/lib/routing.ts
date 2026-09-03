import type { Coordinate } from "./mapcn/types";

/** Dos instancias públicas de OSRM (mismo software, misma API) -- gratis, sin API key.
 * El servidor demo oficial a veces tira 403/50x o se cuelga bajo uso normal; en vez de
 * caer directo a línea recta ante CUALQUIER falla, se intenta el segundo antes de rendirse
 * -- así "por las calles" es la norma y la línea recta queda solo para cuando de verdad
 * ningún servicio responde. */
const OSRM_HOSTS = ["https://router.project-osrm.org", "https://routing.openstreetmap.de/routed-car"];
const OSRM_TIMEOUT_MS = 6000;

async function pedirRutaOsrm(host: string, origen: Coordinate, destino: Coordinate): Promise<Coordinate[] | null> {
  const url = `${host}/route/v1/driving/${origen[0]},${origen[1]};${destino[0]},${destino[1]}?overview=full&geometries=geojson`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);
  try {
    // El servidor demo de OSRM devuelve 403 sin User-Agent (confirmado probando el
    // endpoint directamente) -- mismo motivo que en pedidos_tracking.php (backend).
    const res = await fetch(url, { headers: { "User-Agent": "SVGoApp/1.0" }, signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates as Coordinate[] | undefined;
    return coords && coords.length >= 2 ? coords : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Ruteo por calles vía OSRM público -- gratis, sin API key, mismo criterio que
 * geocoding.ts (Nominatim): servicios públicos sin autenticación. Prueba cada host de
 * OSRM_HOSTS en orden y solo cae a la línea recta [origen, destino] si NINGUNO respondió
 * con una ruta válida. Migrable a un OSRM propio o a un proveedor de pago después sin
 * tocar los llamadores, solo esta función. */
export async function obtenerRutaCalles(origen: Coordinate, destino: Coordinate): Promise<Coordinate[]> {
  for (const host of OSRM_HOSTS) {
    const coords = await pedirRutaOsrm(host, origen, destino);
    if (coords) return coords;
  }
  return [origen, destino];
}

/** ¿Se movió lo suficiente como para justificar pedir la ruta de nuevo? Evita golpear el
 * servicio público de OSRM en cada ping de ubicación (cada ~8s) -- solo si el objetivo
 * cambió o el repartidor se movió más de ~100m desde la última consulta. */
export function seMovioLoSuficiente(a: Coordinate | null, b: Coordinate | null, metros = 100): boolean {
  if (!a || !b) return true;
  return distanciaKm(a[1], a[0], b[1], b[0]) * 1000 > metros;
}

/** Distancia en línea recta (km) entre dos puntos -- compartida por las pantallas de
 * repartidor, comprador y vendedor para calcular distancia/ETA a partir de
 * repartidor_lat/lng, tienda_lat/lng, lat_entrega/lng_entrega (todas vienen del pedido). */
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Velocidad promedio urbana más optimista y creíble para una moto/carro de reparto --
 * el piso de tiempo por debajo del cual un estimado ya no es físicamente creíble (p. ej.
 * "1 min" para 3.9km). Si el tiempo que vino del backend/OSRM cae por debajo de ese piso
 * (dato viejo, corte de OSRM a mitad de camino, etc.), se usa el piso en su lugar -- nunca
 * se muestra un número que implique ir más rápido que esto. */
const VELOCIDAD_MAX_CREIBLE_KMH = 35;

export function minutosCoherentes(km: number | null | undefined, minutosBackend: number | null | undefined): number | null {
  if (km == null) return minutosBackend ?? null;
  const piso = Math.max(1, Math.ceil((km / VELOCIDAD_MAX_CREIBLE_KMH) * 60));
  if (minutosBackend == null) return piso;
  return Math.max(minutosBackend, piso);
}
