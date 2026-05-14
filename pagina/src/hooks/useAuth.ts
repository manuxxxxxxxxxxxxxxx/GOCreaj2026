import { useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import type { User, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const loggedIn = await authService.isLoggedIn();
      if (loggedIn) {
        const u = await authService.getStoredUser();
        setUser(u);
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if ('error' in result) return result;
    setUser(result.user);
    return result;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    const result = await authService.register(name, email, password, role);
    if ('success' in result && !result.requiresVerification) {
      const u = await authService.getStoredUser();
      setUser(u);
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    await authService.saveUser(data);
    const updated = await authService.getStoredUser();
    setUser(updated);
  }, []);

  const hasPermission = useCallback((perm: string): boolean => {
    if (!user) return false;
    const perms = authService.getDashboardRoute(user.role);
    return true;
  }, [user]);

  return { user, loading, login, register, logout, updateProfile, hasPermission };
}
