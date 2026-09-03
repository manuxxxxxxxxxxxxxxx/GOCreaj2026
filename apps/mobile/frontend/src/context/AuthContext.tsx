import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, getToken, setToken as persistToken, ApiError } from "../lib/api";
import type { Usuario } from "../lib/types";

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (identificador: string, password: string) => Promise<void>;
  register: (data: Parameters<typeof authApi.register>[0]) => Promise<void>;
  loginSocial: (data: Parameters<typeof authApi.social>[0]) => Promise<void>;
  logout: () => void;
  refrescar: () => Promise<void>;
  actualizarUsuarioLocal: (u: Usuario) => void;
  cambiarRol: (rol: "comprador" | "vendedor" | "repartidor") => Promise<void>;
  /** true justo después de un registro/login social que creó una cuenta nueva sin username -- dispara el onboarding de username + foto. */
  mostrarOnboarding: boolean;
  /** Sugerencia de @username generada por el backend a partir del nombre, para prellenar el paso de onboarding. */
  usernameSugerido: string | null;
  /** Cierra el onboarding (se llama al terminar o al saltarlo). */
  cerrarOnboarding: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  const [usernameSugerido, setUsernameSugerido] = useState<string | null>(null);

  const cargarSesion = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUsuario(res.usuario);
    } catch (e) {
      if (e instanceof ApiError && getToken()) await persistToken(null);
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarSesion();
  }, [cargarSesion]);

  // Un admin puede aprobar la solicitud de rol (vendedor/repartidor) del usuario en
  // cualquier momento -- sin este poll, un comprador con la app abierta no vería
  // desbloquearse el menú de vendedor/repartidor hasta recargar la app a mano.
  useEffect(() => {
    if (!usuario || usuario.rol !== "comprador") return;
    const id = setInterval(async () => {
      try {
        const res = await authApi.me();
        if (res.usuario.rol !== "comprador") setUsuario(res.usuario);
      } catch {
        // chequeo de fondo -- un error de red pasajero no debe afectar la sesión
      }
    }, 20000);
    return () => clearInterval(id);
  }, [usuario?.id, usuario?.rol]);

  const login = useCallback(async (identificador: string, password: string) => {
    const res = await authApi.login(identificador, password);
    await persistToken(res.token);
    setUsuario(res.usuario);
  }, []);

  const register = useCallback(async (data: Parameters<typeof authApi.register>[0]) => {
    const res = await authApi.register(data);
    await persistToken(res.token);
    setUsuario(res.usuario);
    if (res.es_nuevo && !res.usuario.username) {
      setUsernameSugerido(res.username_sugerido ?? null);
      setMostrarOnboarding(true);
    }
  }, []);

  const loginSocial = useCallback(async (data: Parameters<typeof authApi.social>[0]) => {
    const res = await authApi.social(data);
    await persistToken(res.token);
    setUsuario(res.usuario);
    if (res.es_nuevo && !res.usuario.username) {
      setUsernameSugerido(res.username_sugerido ?? null);
      setMostrarOnboarding(true);
    }
  }, []);

  const logout = useCallback(() => {
    void persistToken(null);
    setUsuario(null);
    setMostrarOnboarding(false);
  }, []);

  const cambiarRol = useCallback(async (rol: "comprador" | "vendedor" | "repartidor") => {
    const res = await authApi.cambiarRol(rol);
    setUsuario(res.usuario);
  }, []);

  const cerrarOnboarding = useCallback(() => setMostrarOnboarding(false), []);

  const value = useMemo(
    () => ({
      usuario,
      cargando,
      login,
      register,
      loginSocial,
      logout,
      refrescar: cargarSesion,
      actualizarUsuarioLocal: setUsuario,
      cambiarRol,
      mostrarOnboarding,
      usernameSugerido,
      cerrarOnboarding,
    }),
    [usuario, cargando, login, register, loginSocial, logout, cargarSesion, cambiarRol, mostrarOnboarding, usernameSugerido, cerrarOnboarding],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
