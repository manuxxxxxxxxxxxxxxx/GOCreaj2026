import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const API_URL = `http://${window.location.hostname}/GOCreaj2026/apps/mobile/backend`;
const TOKEN_KEY = 'lm_token_v1';

// --- Types ---
export type Product = {
  id: number | string;
  name: string;
  price: number;
  emoji?: string;
  img?: string;
  cat?: string;
  seller?: string;
  desc?: string;
  qty?: number;
};

export type UserRole = 'buyer' | 'seller' | 'driver' | 'admin' | null;

export type User = {
  id?: number | string;
  name: string;
  email: string;
  role: UserRole;
} | null;

interface GlobalContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  cart: Product[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (id: number | string) => void;
  updateCartQty: (id: number | string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  user: User;
  login: (userData: any) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('lm_theme') as 'light' | 'dark';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('lm_theme', next);
      if (next === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return next;
    });
  };

  // User State
  const [user, setUser] = useState<User>(null);

  const login = useCallback((userData: any) => {
    // Normaliza: guarda tanto 'role' (inglés) como 'rol' (PHP) para máxima compatibilidad
    const normalized = {
      ...userData,
      role: userData.role || userData.rol || null,
      rol:  userData.rol  || userData.role || null,
      name: userData.name || userData.nombre || '',
      email: userData.email || '',
    };
    setUser(normalized as User);
    localStorage.setItem('lm_user_v1', JSON.stringify(normalized));
  }, []);

  // Al arrancar: carga desde localStorage y, si hay token, refresca desde la BD
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lm_user_v1');
      if (saved) setUser(JSON.parse(saved));
    } catch (e) {}

    // Refresca datos reales desde el backend (por si el rol cambió en BD)
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch(`${API_URL}/auth.php?action=me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.usuario) {
            const u = data.usuario;
            login({
              name:  u.nombre,
              email: u.email,
              role:  u.rol,
              ...u,
            });
          }
        })
        .catch(() => {}); // sin conexión → usa caché local
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función para forzar refresco manual (usada desde Perfil, etc.)
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const r = await fetch(`${API_URL}/auth.php?action=me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      if (data.ok && data.usuario) {
        const u = data.usuario;
        login({ name: u.nombre, email: u.email, role: u.rol, ...u });
      }
    } catch {}
  }, [login]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lm_user_v1');
    setCart([]);
  };

  // Cart State
  const [cart, setCart] = useState<Product[]>([]);

  useEffect(() => {
    if (user) {
      fetchCartFromAPI();
    } else {
      try {
        const saved = localStorage.getItem('lm_cart_v1');
        if (saved) setCart(JSON.parse(saved));
      } catch (e) {}
    }
  }, [user]);

  // Helper para resolver imágenes del backend (devuelve URL completa)
  const resolveImg = (img?: string | null): string | undefined => {
    if (!img) return undefined;
    if (img.startsWith('data:') || img.startsWith('http')) return img;
    const m = img.match(/\/uploads\/(.+)$/);
    if (m) return `${API_URL}/uploads/${m[1]}`;
    return `${API_URL}/uploads/${img}`;
  };

  const fetchCartFromAPI = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      const res = await fetch(`${API_URL}/carrito_pagos.php?action=listar`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setCart(data.items.map((i: any) => ({
          id: i.producto_id,
          cartId: i.id,
          name: i.nombre,
          price: parseFloat(i.precio),
          qty: i.cantidad,
          img: resolveImg(i.imagen),
          seller: i.tienda_nombre
        })));
      }
    } catch (e) {}
  };

  const saveCart = async (newCart: Product[]) => {
    setCart(newCart);
    if (!user) {
      localStorage.setItem('lm_cart_v1', JSON.stringify(newCart));
    }
  };

  const addToCart = async (product: Product, qty = 1) => {
    const newCart = [...cart];
    const existing = newCart.find(p => p.id === product.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + qty;
    } else {
      newCart.push({ ...product, qty });
    }
    saveCart(newCart);
    
    if (user) {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        await fetch(`${API_URL}/carrito_pagos.php?action=agregar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ producto_id: product.id, cantidad: qty })
        });
        fetchCartFromAPI();
      } catch (e) {}
    }
  };

  const removeFromCart = async (id: number | string) => {
    const item = cart.find(p => p.id === id);
    saveCart(cart.filter(p => p.id !== id));
    
    if (user && item && (item as any).cartId) {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        await fetch(`${API_URL}/carrito_pagos.php?action=eliminar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ carrito_id: (item as any).cartId })
        });
      } catch (e) {}
    }
  };

  const updateCartQty = async (id: number | string, qty: number) => {
    if (qty < 1) {
      removeFromCart(id);
      return;
    }
    const newCart = [...cart];
    const item = newCart.find(p => p.id === id);
    if (item) {
      item.qty = qty;
      saveCart(newCart);
      
      if (user && (item as any).cartId) {
        try {
          const token = localStorage.getItem(TOKEN_KEY);
          await fetch(`${API_URL}/carrito_pagos.php?action=actualizar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ carrito_id: (item as any).cartId, cantidad: qty })
          });
        } catch (e) {}
      }
    }
  };

  const clearCart = () => saveCart([]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * (item.qty || 1)), 0);
  const cartCount = cart.reduce((acc, item) => acc + (item.qty || 1), 0);

  return (
    <GlobalContext.Provider value={{
      theme, toggleTheme,
      cart, addToCart, removeFromCart, updateCartQty, clearCart, cartTotal, cartCount,
      user, login, logout, refreshUser
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() {
  const context = useContext(GlobalContext);
  if (!context) throw new Error('useGlobal must be used within GlobalProvider');
  return context;
}
