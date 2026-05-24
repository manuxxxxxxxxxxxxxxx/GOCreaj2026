import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_URL = 'http://localhost/GOCreaj2026/apps/mobile/backend';
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
  login: (userData: User) => void;
  logout: () => void;
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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lm_user_v1');
      if (saved) setUser(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('lm_user_v1', JSON.stringify(userData));
  };

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
          img: i.imagen,
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
      user, login, logout
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
