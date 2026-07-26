import { API_URL } from '../services/api';

/**
 * Reescribe CUALQUIER URL de imagen/video/audio guardada en la BD para que apunte
 * al host actual (API_URL), sin importar qué host quedó grabado originalmente
 * (p. ej. "http://localhost/..." de cuando se subió desde la web, inalcanzable
 * desde Expo Go en un dispositivo físico o emulador que usa la IP de la LAN).
 */
export function resolveMediaUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  if (raw.startsWith('data:')) return raw;

  const match = raw.match(/\/uploads\/(.+)$/);
  if (match) return `${API_URL}/uploads/${match[1]}`;

  // Ya es solo el nombre de archivo (sin host ni /uploads/ delante)
  if (!raw.startsWith('http')) return `${API_URL}/uploads/${raw}`;

  return raw;
}
