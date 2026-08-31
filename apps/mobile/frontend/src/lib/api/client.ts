import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Localhost no es alcanzable desde un dispositivo/emulador real. El emulador de Android
 * mapea el host de la PC a 10.0.2.2; iOS Simulator sí puede usar localhost. Un teléfono físico
 * con Expo Go no puede usar ninguno de los dos — necesita la IP de LAN real de la PC.
 *
 * En vez de pedirle esa IP al usuario, la sacamos de `Constants.expoConfig.hostUri`: es la
 * misma IP:puerto que Expo Go ya usó para descargar el bundle de Metro, así que por
 * definición es alcanzable desde el teléfono. Si por algún motivo no está disponible
 * (build standalone, web), se cae a los valores fijos de siempre.
 */
function resolveDevHost(): string {
  if (Platform.OS === "web") return "http://localhost";
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}`;
  return Platform.OS === "android" ? "http://10.0.2.2" : "http://localhost";
}

const API_BASE = `${resolveDevHost()}/GOCreaj2026/apps/mobile/backend`;

const TOKEN_KEY = "gocreaj_token";
let cachedToken: string | null = null;
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

async function hydrateToken(): Promise<void> {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = AsyncStorage.getItem(TOKEN_KEY).then((v) => {
      cachedToken = v;
      hydrated = true;
    });
  }
  await hydratePromise;
}

export function getToken(): string | null {
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  hydrated = true;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  payload: Record<string, unknown>;
  constructor(message: string, status: number, payload: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface CallOptions {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: Record<string, unknown>;
}

function buildQuery(action: string, params?: CallOptions["params"]): string {
  const usp = new URLSearchParams();
  usp.set("action", action);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
    }
  }
  return usp.toString();
}

export async function apiCall<T = Record<string, unknown>>(file: string, action: string, options: CallOptions = {}): Promise<T> {
  await hydrateToken();
  const { params, body } = options;
  const qs = buildQuery(action, params);
  const url = `${API_BASE}/${file}.php?${qs}`;

  const headers: Record<string, string> = {};
  if (cachedToken) headers.Authorization = `Bearer ${cachedToken}`;
  if (body) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0, {});
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("Respuesta inválida del servidor.", res.status, {});
  }

  if (!res.ok || json.ok === false) {
    const message = typeof json.error === "string" ? json.error : "Ocurrió un error inesperado.";
    throw new ApiError(message, res.status, json);
  }

  return json as T;
}

export const get = <T = Record<string, unknown>>(file: string, action: string, params?: CallOptions["params"]) => apiCall<T>(file, action, { params });

export const post = <T = Record<string, unknown>>(file: string, action: string, body: Record<string, unknown> = {}) => apiCall<T>(file, action, { body });

/**
 * Sube un archivo (ej. video de reel) como multipart/form-data en vez de meterlo en base64
 * dentro de un JSON: evita el ~33% de overhead de base64 y, sobre todo, permite reportar
 * progreso real de subida — con fetch normal (usado en `apiCall`) React Native no expone
 * eventos de progreso de subida, así que aquí se usa XMLHttpRequest directamente.
 */
export function apiUpload<T = Record<string, unknown>>(
  file: string,
  action: string,
  fields: Record<string, string | number | boolean | undefined>,
  filePart: { field: string; uri: string; name: string; type: string },
  onProgress?: (fraccion: number) => void,
): Promise<T> {
  return hydrateToken().then(
    () =>
      new Promise<T>((resolve, reject) => {
        const url = `${API_BASE}/${file}.php?${buildQuery(action)}`;
        const form = new FormData();
        for (const [k, v] of Object.entries(fields)) {
          if (v !== undefined) form.append(k, String(v));
        }
        // React Native's FormData acepta este shape especial para adjuntar un archivo local por uri.
        form.append(filePart.field, { uri: filePart.uri, name: filePart.name, type: filePart.type } as unknown as Blob);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);
        if (cachedToken) xhr.setRequestHeader("Authorization", `Bearer ${cachedToken}`);
        xhr.upload.onprogress = (e) => {
          if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total);
        };
        xhr.onerror = () => reject(new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0, {}));
        xhr.onload = () => {
          let json: Record<string, unknown>;
          try {
            json = JSON.parse(xhr.responseText);
          } catch {
            reject(new ApiError("Respuesta inválida del servidor.", xhr.status, {}));
            return;
          }
          if (xhr.status < 200 || xhr.status >= 300 || json.ok === false) {
            const message = typeof json.error === "string" ? json.error : "Ocurrió un error inesperado.";
            reject(new ApiError(message, xhr.status, json));
            return;
          }
          resolve(json as T);
        };
        xhr.send(form);
      }),
  );
}

export function uploadsBaseUrl(): string {
  return `${API_BASE}/uploads/`;
}
