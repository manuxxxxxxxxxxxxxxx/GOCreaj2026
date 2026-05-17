/**
 * AuthContext — guarda el usuario logueado y persiste la sesión.
 * Ruta: src/context/AuthContext.tsx
 *
 * Requiere: @react-native-async-storage/async-storage
 *   npx expo install @react-native-async-storage/async-storage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, Usuario } from '../services/api';

type AuthState = {
  user: Usuario | null;
  token: string | null;
  loading: boolean;                       // true mientras leemos AsyncStorage al arrancar
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { nombre: string; email: string; password: string; telefono?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Actualiza el usuario en memoria y en AsyncStorage (sin llamar al server). */
  updateUser: (cambios: Partial<Usuario>) => Promise<void>;
};

const AuthContext = createContext<AuthState>({} as AuthState);
const STORAGE_KEY = '@mercalocal_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Al arrancar la app, intentamos recuperar la sesión guardada
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const { user, token } = JSON.parse(raw);
          setUser(user);
          setToken(token);
        }
      } catch (e) {
        console.warn('Auth restore error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (u: Usuario | null, t: string | null) => {
    if (u && t) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, token: t }));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  const signIn = async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (!res.ok || !res.usuario) throw new Error(res.error || 'Login fallido');
    setUser(res.usuario);
    setToken(res.token);
    await persist(res.usuario, res.token);
  };

  const signUp = async (data: { nombre: string; email: string; password: string; telefono?: string }) => {
    const res = await api.registro(data);
    if (!res.ok) throw new Error(res.error || 'Registro fallido');
    // El backend devuelve el id pero no el usuario completo; lo armamos.
    const usuario: Usuario = {
      id: res.id!,
      nombre: data.nombre,
      email: data.email,
      tipo: 'cliente',
      avatar: null,
    };
    setUser(usuario);
    setToken(res.token);
    await persist(usuario, res.token);
  };

  const signOut = async () => {
    setUser(null);
    setToken(null);
    await persist(null, null);
  };

  /**
   * Mezcla `cambios` con el usuario actual y guarda en AsyncStorage.
   * Útil después de actualizar nombre o avatar contra el backend.
   */
  const updateUser = async (cambios: Partial<Usuario>) => {
    if (!user) return;
    const nuevo: Usuario = { ...user, ...cambios };
    setUser(nuevo);
    if (token) await persist(nuevo, token);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
