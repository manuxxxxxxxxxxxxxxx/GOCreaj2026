import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import { api, Endpoints, setToken, getToken } from '@/services/api';
import { Usuario } from '@/types';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  iniciar: (u: Usuario, token: string) => Promise<void>;
  refrescar: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
  rolCambio: { anterior: string | null; nuevo: string | null } | null;
  limpiarNotifRol: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface MeResponse {
  ok: boolean;
  usuario?: Usuario;
  error?: string;
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  // Notificación de cambio de rol (admin aprobó solicitud)
  const [rolCambio, setRolCambio] = useState<{ anterior: string | null; nuevo: string | null } | null>(null);
  const rolAnteriorRef = useRef<string | null>(null);

  const refrescar = useCallback(async (): Promise<void> => {
    const token = await getToken();
    if (!token) { setUsuario(null); setCargando(false); return; }
    try {
      const r = await api<MeResponse>(Endpoints.authMe);
      if (r.ok && r.usuario) {
        const nuevoRol = (r.usuario as any)?.rol ?? null;
        // Detectar cambio de rol → disparar notificación
        if (rolAnteriorRef.current && rolAnteriorRef.current !== nuevoRol) {
          setRolCambio({ anterior: rolAnteriorRef.current, nuevo: nuevoRol });
        }
        rolAnteriorRef.current = nuevoRol;
        setUsuario(r.usuario);
      } else {
        await setToken(null); setUsuario(null);
      }
    } catch {
      // No tocar usuario si hay error de red — preserva sesión
    } finally {
      setCargando(false);
    }
  }, []);

  const iniciar = useCallback(async (u: Usuario, token: string): Promise<void> => {
    await setToken(token);
    rolAnteriorRef.current = (u as any)?.rol ?? null;
    setUsuario(u);
  }, []);

  const cerrarSesion = useCallback(async (): Promise<void> => {
    await setToken(null);
    rolAnteriorRef.current = null;
    setRolCambio(null);
    setUsuario(null);
  }, []);

  const limpiarNotifRol = useCallback(() => setRolCambio(null), []);

  // Refresca al arrancar
  useEffect(() => { void refrescar(); }, [refrescar]);

  // Refresca cuando la app vuelve a primer plano (detecta aprobaciones del admin)
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void refrescar();
    });
    return () => sub.remove();
  }, [refrescar]);

  // Polling silencioso cada 30s para detectar cambios de rol en tiempo real
  useEffect(() => {
    if (!usuario) return;
    const iv = setInterval(() => { void refrescar(); }, 30000);
    return () => clearInterval(iv);
  }, [usuario, refrescar]);

  return (
    <AuthContext.Provider value={{ usuario, cargando, iniciar, refrescar, cerrarSesion, rolCambio, limpiarNotifRol }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
