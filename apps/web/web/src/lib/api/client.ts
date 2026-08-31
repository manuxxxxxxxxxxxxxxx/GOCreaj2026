const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost/GOCreaj2026/apps/mobile/backend";

const TOKEN_KEY = "gocreaj_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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

type Method = "GET" | "POST";

interface CallOptions {
  method?: Method;
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

export async function apiCall<T = Record<string, unknown>>(
  file: string,
  action: string,
  options: CallOptions = {},
): Promise<T> {
  const { method = "GET", params, body } = options;
  const qs = buildQuery(action, params);
  const url = `${API_BASE}/${file}.php?${qs}`;

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: body ? "POST" : method,
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

export const get = <T = Record<string, unknown>>(file: string, action: string, params?: CallOptions["params"]) =>
  apiCall<T>(file, action, { method: "GET", params });

export const post = <T = Record<string, unknown>>(file: string, action: string, body: Record<string, unknown> = {}) =>
  apiCall<T>(file, action, { body });

export function uploadsBaseUrl(): string {
  return `${API_BASE}/uploads/`;
}
