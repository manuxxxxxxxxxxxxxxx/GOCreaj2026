import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { carritoApi } from "../lib/api";
import type { CarritoItem } from "../lib/types";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  items: CarritoItem[];
  total: number;
  count: number;
  cargando: boolean;
  refrescar: () => Promise<void>;
  flyToken: number;
  celebrarAgregado: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [flyToken, setFlyToken] = useState(0);

  const refrescar = useCallback(async () => {
    if (!usuario || usuario.rol !== "comprador") {
      setItems([]);
      setTotal(0);
      return;
    }
    setCargando(true);
    try {
      const res = await carritoApi.listar();
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  const count = items.reduce((acc, it) => acc + it.cantidad, 0);
  const celebrarAgregado = useCallback(() => setFlyToken((t) => t + 1), []);

  const value = useMemo(
    () => ({ items, total, count, cargando, refrescar, flyToken, celebrarAgregado }),
    [items, total, count, cargando, refrescar, flyToken, celebrarAgregado],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
