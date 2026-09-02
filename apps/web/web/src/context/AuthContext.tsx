import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, getToken, setToken as persistToken, ApiError, type LoginResponse, type RegisterResponse } from "../lib/api";
import type { Usuario } from "../lib/types";

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (identificador: string, password: string) => Promise<void>;
  register: (data: Parameters<typeof authApi.register>[0]) => Promise<RegisterResponse>;
  confirmarEmailRegistro: (email: string, codigo: string) => Promise<LoginResponse>;
  loginSocial: (data: Parameters<typeof authApi.social>[0]) => Promise<LoginResponse>;
  logout: () => void;
  refrescar: () => Promise<void>;
  actualizarUsuarioLocal: (u: Usuario) => void;
  cambiarRol: (rol: "comprador" | "vendedor" | "repartidor") => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarSesion = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUsuario(null);
      setCargando(false);
      return;
    }
    try {
      const res = await authApi.me();
      setUsuario(res.usuario);
    } catch (e) {
      if (e instanceof ApiError) persistToken(null);
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarSesion();
  }, [cargarSesion]);

  const login = useCallback(async (identificador: string, password: string) => {
    const res = await authApi.login(identificador, password);
    persistToken(res.token);
    setUsuario(res.usuario);
  }, []);

  const register = useCallback(async (data: Parameters<typeof authApi.register>[0]) => {
    // La verificación de correo quedó opcional por el momento: el registro ya entra con
    // sesión iniciada (ver confirmarEmailRegistro para cuando se retome el flujo obligatorio).
    const res = await authApi.register(data);
    persistToken(res.token);
    setUsuario(res.usuario);
    return res;
  }, []);

  const confirmarEmailRegistro = useCallback(async (email: string, codigo: string) => {
    const res = await authApi.registroVerificarEmail(email, codigo);
    persistToken(res.token);
    setUsuario(res.usuario);
    return res;
  }, []);

  const loginSocial = useCallback(async (data: Parameters<typeof authApi.social>[0]) => {
    const res = await authApi.social(data);
    persistToken(res.token);
    setUsuario(res.usuario);
    return res;
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    setUsuario(null);
  }, []);

  const cambiarRol = useCallback(async (rol: "comprador" | "vendedor" | "repartidor") => {
    const res = await authApi.cambiarRol(rol);
    setUsuario(res.usuario);
  }, []);

  const value = useMemo(
    () => ({
      usuario,
      cargando,
      login,
      register,
      confirmarEmailRegistro,
      loginSocial,
      logout,
      refrescar: cargarSesion,
      actualizarUsuarioLocal: setUsuario,
      cambiarRol,
    }),
    [usuario, cargando, login, register, confirmarEmailRegistro, loginSocial, logout, cargarSesion, cambiarRol],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
