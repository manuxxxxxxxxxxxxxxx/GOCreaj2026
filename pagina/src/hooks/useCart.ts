import { useState, useEffect, useCallback } from 'react';
import { storageGet, storageSet, KEYS } from '../utils/storage';
import type { CartItem, Product } from '../types';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    storageGet<CartItem[]>(KEYS.cart).then((stored) => {
      if (Array.isArray(stored)) setItems(stored);
    });
  }, []);

  const persist = useCallback(async (next: CartItem[]) => {
    setItems(next);
    await storageSet(KEYS.cart, next);
  }, []);

  const addItem = useCallback(async (product: Product, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      let next: CartItem[];
      if (idx >= 0) {
        next = prev.map((i, n) => n === idx ? { ...i, qty: i.qty + qty } : i);
      } else {
        next = [...prev, { product, qty }];
      }
      storageSet(KEYS.cart, next);
      return next;
    });
  }, []);

  const removeItem = useCallback(async (productId: number) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.product.id !== productId);
      storageSet(KEYS.cart, next);
      return next;
    });
  }, []);

  const updateQty = useCallback(async (productId: number, qty: number) => {
    setItems((prev) => {
      const next = qty <= 0
        ? prev.filter((i) => i.product.id !== productId)
        : prev.map((i) => i.product.id === productId ? { ...i, qty } : i);
      storageSet(KEYS.cart, next);
      return next;
    });
  }, []);

  const clearCart = useCallback(async () => {
    setItems([]);
    await storageSet(KEYS.cart, []);
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const count    = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, count, subtotal, addItem, removeItem, updateQty, clearCart };
}
