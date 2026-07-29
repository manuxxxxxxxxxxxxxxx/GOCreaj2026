import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';

/** Redirige a /login si no hay sesión. Envuelve rutas protegidas (Carrito, Chats, Pedidos, Perfil). */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, authReady } = useGlobal();
  const location = useLocation();

  if (!authReady) return null; // esperando confirmar la sesión desde el token guardado
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
