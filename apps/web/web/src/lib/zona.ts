const KEY = "gocreaj_zona_municipio";

/** Zona elegida manualmente por un invitado (sin cuenta), persistida en este navegador. */
export function getZonaGuardada(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setZonaGuardada(municipio: string | null): void {
  try {
    if (municipio) localStorage.setItem(KEY, municipio);
    else localStorage.removeItem(KEY);
  } catch {
    // localStorage inaccesible (modo privado, etc.) -- la zona simplemente no persiste.
  }
}
