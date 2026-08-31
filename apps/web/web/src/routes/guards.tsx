import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Rol } from "../lib/types";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Rol | Rol[]; children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  const roles = Array.isArray(role) ? role : [role];

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
