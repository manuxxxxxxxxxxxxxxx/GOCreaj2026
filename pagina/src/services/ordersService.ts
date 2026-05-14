import api from './apiClient';
import { storageGet, storageSet, KEYS } from '../utils/storage';
import { genOrderId, pickRandom } from '../utils/formatters';
import { DRIVERS } from '../data/catalog';
import type { Order, OrderItem, Driver } from '../types';

export async function getMyOrders(): Promise<Order[]> {
  try {
    const res = await api.get('/orders/my');
    return res.data;
  } catch {
    return getLocalOrders();
  }
}

export async function getLocalOrders(): Promise<Order[]> {
  const stored = await storageGet<Order[]>(KEYS.orders);
  return Array.isArray(stored) ? stored : [];
}

export async function saveOrder(data: {
  items: OrderItem[];
  total: number;
  shipping: string;
  payment: string;
  address: string;
}): Promise<Order> {
  const driver: Driver = pickRandom(DRIVERS);
  const order: Order = {
    id:              genOrderId(),
    savedAt:         Date.now(),
    items:           data.items,
    total:           data.total,
    shipping:        data.shipping,
    payment:         data.payment,
    address:         data.address,
    status:          'confirmado',
    driver,
    deliveryOrderId: genOrderId(),
  };

  try {
    await api.post('/orders', { ...data, driver });
  } catch {}

  const orders = await getLocalOrders();
  orders.unshift(order);
  await storageSet(KEYS.orders, orders.slice(0, 50));
  return order;
}

export async function updateOrderStatus(
  deliveryOrderId: string,
  status: Order['status']
): Promise<void> {
  const orders = await getLocalOrders();
  const idx = orders.findIndex((o) => String(o.deliveryOrderId) === String(deliveryOrderId));
  if (idx !== -1) {
    orders[idx].status = status;
    await storageSet(KEYS.orders, orders);
  }
}

export async function getOrderStats(orders: Order[]) {
  const total = orders.reduce((sum, o) => sum + o.total, 0);
  const sellers = [...new Set(orders.flatMap((o) => o.items.map((i) => i.name.split(' ')[0])))];
  return {
    count:       orders.length,
    totalSpent:  total,
    topSeller:   sellers[0] ?? '—',
    activeCount: orders.filter((o) => o.status !== 'entregado').length,
  };
}
