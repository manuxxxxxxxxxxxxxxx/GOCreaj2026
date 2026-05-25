import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'svgo_cart_local';

export interface CartLine {
  producto_id: number;
  tienda_id: number;
  vendedor_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string | null;
  tienda_nombre: string;
}

export function useCartStore() {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [storeBlock, setStoreBlock] = useState<{ visible: boolean; pending?: CartLine }>({ visible: false });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {}
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (next: CartLine[]) => {
    setItems(next);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  // Agrega validando que TODOS los items sean de la misma tienda
  const add = useCallback(async (line: CartLine): Promise<'added' | 'needs_confirmation'> => {
    if (items.length > 0 && items[0].tienda_id !== line.tienda_id) {
      // bloqueo multi-tienda — el componente debe abrir modal de confirmación
      setStoreBlock({ visible: true, pending: line });
      return 'needs_confirmation';
    }
    const existing = items.find(i => i.producto_id === line.producto_id);
    const next = existing
      ? items.map(i => i.producto_id === line.producto_id ? { ...i, cantidad: i.cantidad + line.cantidad } : i)
      : [...items, line];
    await persist(next);
    return 'added';
  }, [items, persist]);

  // Acepta el bloqueo: vacía carrito y agrega la línea pendiente
  const confirmReplaceStore = useCallback(async () => {
    if (!storeBlock.pending) { setStoreBlock({ visible: false }); return; }
    await persist([storeBlock.pending]);
    setStoreBlock({ visible: false });
  }, [storeBlock, persist]);

  const cancelBlock = useCallback(() => setStoreBlock({ visible: false }), []);

  const update = useCallback(async (producto_id: number, cantidad: number) => {
    if (cantidad <= 0) {
      const next = items.filter(i => i.producto_id !== producto_id);
      await persist(next);
      return;
    }
    const next = items.map(i => i.producto_id === producto_id ? { ...i, cantidad } : i);
    await persist(next);
  }, [items, persist]);

  const remove = useCallback(async (producto_id: number) => {
    await persist(items.filter(i => i.producto_id !== producto_id));
  }, [items, persist]);

  const clear = useCallback(async () => { await persist([]); }, [persist]);

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return {
    items, ready, subtotal,
    add, update, remove, clear,
    storeBlock, confirmReplaceStore, cancelBlock,
  };
}
