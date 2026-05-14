import { useState, useEffect, useCallback } from 'react';
import * as ordersService from '../services/ordersService';
import type { Order, OrderItem } from '../types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const result = await ordersService.getMyOrders();
    setOrders(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const placeOrder = useCallback(async (data: {
    items: OrderItem[];
    total: number;
    shipping: string;
    payment: string;
    address: string;
  }): Promise<Order> => {
    const order = await ordersService.saveOrder(data);
    setOrders((prev) => [order, ...prev]);
    return order;
  }, []);

  const stats = {
    count:       orders.length,
    totalSpent:  orders.reduce((s, o) => s + o.total, 0),
    activeCount: orders.filter((o) => o.status !== 'entregado').length,
  };

  return { orders, loading, placeOrder, refresh: loadOrders, stats };
}
