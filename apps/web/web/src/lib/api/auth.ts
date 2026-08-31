import { get, post } from "./client";
import type { Usuario } from "../types";

export interface LoginResponse {
  ok: true;
  usuario: Usuario;
  token: string;
}

export const authApi = {
  login: (identificador: string, password: string) =>
    post<LoginResponse>("auth", "login", { identificador, password }),

  register: (data: { nombre: string; email?: string; telefono?: string; username?: string; password: string; municipio?: string }) =>
    post<LoginResponse>("auth", "register", data),

  social: (data: { provider: "google" | "apple"; id_token?: string; provider_uid?: string; nombre?: string; email?: string }) =>
    post<LoginResponse>("auth", "social", data),

  me: () => get<{ ok: true; usuario: Usuario }>("auth", "me"),

  checkUsername: (username: string, excludeId?: number) =>
    post<{ ok: true; disponible: boolean }>("auth", "check_username", { username, exclude_id: excludeId }),

  actualizarPerfil: (data: Partial<Usuario> & { password_actual?: string; password_nueva?: string; foto_perfil?: string }) =>
    post<{ ok: true; usuario: Usuario }>("auth", "actualizar_perfil", data),

  actualizarUbicacion: (data: { municipio: string; lat?: number; lng?: number }) =>
    post<{ ok: true; usuario: Usuario }>("auth", "actualizar_ubicacion", data),

  misRoles: () => get<{ ok: true; roles: string[]; rol_activo: string }>("auth", "mis_roles"),

  cambiarRol: (rol: "comprador" | "vendedor" | "repartidor") =>
    post<{ ok: true; usuario: Usuario }>("auth", "cambiar_rol", { rol }),

  recuperarSolicitar: (identificador: string) =>
    post<{ ok: true; enviado: boolean; codigo_dev?: string }>("auth", "recuperar_solicitar", { identificador }),

  recuperarConfirmar: (data: { identificador: string; codigo: string; password_nueva: string }) =>
    post<{ ok: true }>("auth", "recuperar_confirmar", data),

  eliminarCuenta: (password?: string) => post<{ ok: true }>("auth", "eliminar_cuenta", { password }),

  sesionesListar: () => get<{ ok: true; sesiones: Array<{ id: number; user_agent: string; ip: string; created_at: string; last_seen_at: string; es_actual: boolean }> }>("auth", "sesiones_listar"),

  sesionesCerrar: (id: number) => post<{ ok: true }>("auth", "sesiones_cerrar", { id }),

  sesionesCerrarOtras: () => post<{ ok: true }>("auth", "sesiones_cerrar_otras"),

  enviarSms: () => post<{ ok: true; codigo: string; telefono: string }>("auth", "enviar_sms"),

  verificarSms: (codigo: string) => post<{ ok: true; usuario: Usuario }>("auth", "verificar_sms", { codigo }),

  actualizarIdioma: (idioma: "es" | "en" | "fr") => post<{ ok: true }>("auth", "actualizar_idioma", { idioma }),

  actualizarVisibilidad: (perfil_publico: boolean) => post<{ ok: true }>("auth", "actualizar_visibilidad", { perfil_publico }),

  usuariosBloqueados: () =>
    get<{ ok: true; bloqueados: { id: number; bloqueado_id: number; created_at: string; nombre: string; username: string | null; foto_perfil: string | null }[] }>(
      "auth",
      "usuarios_bloqueados",
    ),

  bloquearUsuario: (usuario_id: number) => post<{ ok: true }>("auth", "bloquear_usuario", { usuario_id }),

  desbloquearUsuario: (usuario_id: number) => post<{ ok: true }>("auth", "desbloquear_usuario", { usuario_id }),
};
