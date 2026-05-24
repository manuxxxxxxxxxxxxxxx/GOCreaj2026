import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api, Endpoints, setToken, getToken } from '@/services/api';
import { Usuario } from '@/types';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  iniciar: (u: Usuario, token: string) => Promise<void>;
  refrescar: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
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

  const refrescar = useCallback(async (): Promise<void> => {
    const token = await getToken();
    if (!token) { setUsuario(null); setCargando(false); return; }
    try {
      const r = await api<MeResponse>(Endpoints.authMe);
      if (r.ok && r.usuario) setUsuario(r.usuario);
      else { await setToken(null); setUsuario(null); }
    } catch {
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  const iniciar = useCallback(async (u: Usuario, token: string): Promise<void> => {
    await setToken(token);
    setUsuario(u);
  }, []);

  const cerrarSesion = useCallback(async (): Promise<void> => {
    await setToken(null);
    setUsuario(null);
  }, []);

  useEffect(() => { void refrescar(); }, [refrescar]);

  return (
    <AuthContext.Provider value={{ usuario, cargando, iniciar, refrescar, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
