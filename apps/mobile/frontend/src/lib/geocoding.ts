/** Geocodificación vía Nominatim (OpenStreetMap) — sin API key, restringida a El Salvador. */

export interface DireccionGeocodificada {
  direccion: string;
  municipio: string;
  departamento: string;
}

function parseAddress(a: Record<string, string | undefined>, displayName: string): DireccionGeocodificada {
  const calle = [a.road, a.house_number].filter(Boolean).join(" ");
  const barrio = a.neighbourhood || a.suburb || a.quarter;
  const direccion = [calle, barrio].filter(Boolean).join(", ") || displayName || "";
  const municipio = a.city || a.town || a.village || a.municipality || "";
  const departamento = a.state || a.county || "";
  return { direccion, municipio, departamento };
}

/** Geocodificación inversa: coordenadas -> dirección legible. */
export async function geocodificarInverso(lat: number, lng: number): Promise<DireccionGeocodificada> {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("No se pudo geocodificar.");
  const data = await res.json();
  return parseAddress(data.address ?? {}, data.display_name);
}

export interface ResultadoBusquedaDireccion extends DireccionGeocodificada {
  label: string;
  lat: number;
  lng: number;
}

/** Geocodificación directa: texto escrito por el usuario -> lista de coincidencias en El Salvador. */
export async function buscarDireccion(query: string): Promise<ResultadoBusquedaDireccion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=sv&addressdetails=1&limit=6`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("No se pudo buscar la dirección.");
  const data = await res.json();
  return (data as any[]).map((r) => ({
    ...parseAddress(r.address ?? {}, r.display_name),
    label: r.display_name as string,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}
