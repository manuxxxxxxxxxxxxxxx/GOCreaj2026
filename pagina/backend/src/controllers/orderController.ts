import { Response, NextFunction } from 'express';
import { PoolClient } from 'pg';
import { query, withTransaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { ok, created, paginate } from '../utils/response';

const SHIPPING_FEE = 2.50;

/* ── CREATE ORDER ──────────────────────────────────────────── */
export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const buyer_id = req.user!.id;
    const { seller_id, items, address, notes } = req.body as {
      seller_id: string;
      items: { product_id: string; quantity: number }[];
      address: string;
      notes?: string;
    };

    if (!items || !items.length) throw new AppError('Debe incluir al menos un producto', 400);

    const productIds = items.map((i) => i.product_id);

    /* Validate products exist, are active, and belong to seller */
    const productResult = await query(
      'SELECT id, name, price, stock, seller_id FROM products WHERE id = ANY($1::uuid[]) AND is_active = true',
      [productIds],
    );

    if (productResult.rows.length !== productIds.length) {
      throw new AppError('Uno o más productos no existen o no están disponibles', 400);
    }

    const productMap = new Map<string, { price: number; stock: number; seller_id: string }>();
    for (const row of productResult.rows) {
      if (row.seller_id !== seller_id) {
        throw new AppError('Todos los productos deben pertenecer al mismo vendedor', 400);
      }
      productMap.set(row.id, { price: Number(row.price), stock: row.stock, seller_id: row.seller_id });
    }

    /* Check stock */
    for (const item of items) {
      const product = productMap.get(item.product_id)!;
      if (item.quantity < 1) throw new AppError(`Cantidad inválida para producto ${item.product_id}`, 400);
      if (product.stock < item.quantity) {
        throw new AppError(`Stock insuficiente para producto ${item.product_id}`, 400);
      }
    }

    /* Calculate totals */
    let subtotal = 0;
    for (const item of items) {
      const product = productMap.get(item.product_id)!;
      subtotal += product.price * item.quantity;
    }
    const shipping = SHIPPING_FEE;
    const total    = subtotal + shipping;

    /* Run transaction */
    const order = await withTransaction(async (client: PoolClient) => {
      /* 1. Insert order */
      const orderRes = await client.query(
        `INSERT INTO orders (buyer_id, seller_id, subtotal, shipping, total, address, notes, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
           RETURNING *`,
        [buyer_id, seller_id, subtotal, shipping, total, address, notes ?? null],
      );
      const newOrder = orderRes.rows[0];

      /* 2. Insert order items */
      const orderItems: unknown[] = [];
      for (const item of items) {
        const product  = productMap.get(item.product_id)!;
        const itemName = productResult.rows.find((r) => r.id === item.product_id)?.name ?? item.product_id;
        const itemRes  = await client.query(
          `INSERT INTO order_items (order_id, product_id, name, quantity, unit_price)
                VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
          [newOrder.id, item.product_id, itemName, item.quantity, product.price],
        );
        orderItems.push(itemRes.rows[0]);
      }

      /* 3. Update product stocks */
      for (const item of items) {
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id],
        );
      }

      /* 4. Insert delivery record */
      await client.query(
        `INSERT INTO deliveries (order_id, status) VALUES ($1, 'searching')`,
        [newOrder.id],
      );

      /* 5. Notify seller */
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, data)
              VALUES ($1, 'new_order', 'Nuevo pedido', 'Tienes un nuevo pedido', $2)`,
        [seller_id, JSON.stringify({ order_id: newOrder.id })],
      );

      return { ...newOrder, items: orderItems };
    });

    created(res, order);
  } catch (err) {
    next(err);
  }
};

/* ── GET MY ORDERS (buyer) ─────────────────────────────────── */
export const getMyOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const buyer_id = req.user!.id;
    const page     = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10));
    const limit    = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const offset   = (page - 1) * limit;

    const countResult = await query(
      'SELECT COUNT(*) FROM orders WHERE buyer_id = $1',
      [buyer_id],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT o.*,
              json_agg(json_build_object(
                'name',  oi.name,
                'qty',   oi.quantity,
                'price', oi.unit_price
              )) AS items
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
        WHERE o.buyer_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3`,
      [buyer_id, limit, offset],
    );

    paginate(res, dataResult.rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/* ── GET SELLER ORDERS ─────────────────────────────────────── */
export const getSellerOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const offset = (page - 1) * limit;

    const isAdmin    = req.user!.role === 'admin' || req.user!.role === 'master_admin';
    const seller_id  = req.user!.id;

    const whereClause = isAdmin ? '' : 'WHERE o.seller_id = $1';
    const baseParams  = isAdmin ? [] : [seller_id];

    const countResult = await query(
      `SELECT COUNT(*) FROM orders o ${whereClause}`,
      baseParams,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const params = [...baseParams, limit, offset];
    const limitIdx  = params.length - 1;
    const offsetIdx = params.length;

    const dataResult = await query(
      `SELECT o.*,
              json_agg(json_build_object(
                'name',  oi.name,
                'qty',   oi.quantity,
                'price', oi.unit_price
              )) AS items
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         ${whereClause}
        GROUP BY o.id
        ORDER BY o.created_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...baseParams, limit, offset],
    );

    paginate(res, dataResult.rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/* ── GET ORDER ─────────────────────────────────────────────── */
export const getOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id }    = req.params;
    const requestor = req.user!;

    const orderResult = await query(
      'SELECT * FROM orders WHERE id = $1',
      [id],
    );
    if (!orderResult.rows.length) throw new AppError('Pedido no encontrado', 404);

    const order = orderResult.rows[0];

    /* Check access: buyer, seller, admin, or assigned driver */
    if (requestor.role !== 'admin') {
      const isBuyer  = order.buyer_id  === requestor.id;
      const isSeller = order.seller_id === requestor.id;

      let isDriver = false;
      if (requestor.role === 'driver') {
        const deliveryResult = await query(
          'SELECT driver_id FROM deliveries WHERE order_id = $1',
          [id],
        );
        isDriver = deliveryResult.rows[0]?.driver_id === requestor.id;
      }

      if (!isBuyer && !isSeller && !isDriver) {
        throw new AppError('No tienes acceso a este pedido', 403);
      }
    }

    /* Fetch items */
    const itemsResult = await query(
      `SELECT oi.*, p.emoji
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
      [id],
    );

    ok(res, { ...order, items: itemsResult.rows });
  } catch (err) {
    next(err);
  }
};

/* ── UPDATE ORDER STATUS ───────────────────────────────────── */
type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'in_transit' | 'delivered' | 'cancelled';
type DeliveryStatus = 'searching' | 'assigned' | 'picked_up' | 'delivered';

const ORDER_TO_DELIVERY: Partial<Record<OrderStatus, DeliveryStatus>> = {
  in_transit: 'assigned',
  delivered:  'delivered',
  cancelled:  'searching', // revert or keep as-is; mapped for completeness
};

/* Allowed seller transitions */
const SELLER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['preparing', 'cancelled'],
  preparing:  ['in_transit', 'cancelled'],
  in_transit: ['cancelled'],
};

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id }     = req.params;
    const { status } = req.body as { status: OrderStatus };
    const actor      = req.user!;

    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!orderResult.rows.length) throw new AppError('Pedido no encontrado', 404);

    const order       = orderResult.rows[0];
    const currentStatus: OrderStatus = order.status;

    /* Validate transition by role */
    if (actor.role === 'seller') {
      if (order.seller_id !== actor.id) throw new AppError('No tienes permisos sobre este pedido', 403);
      const allowed = SELLER_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(status)) {
        throw new AppError(`Transición inválida: ${currentStatus} → ${status}`, 400);
      }
    } else if (actor.role === 'driver') {
      const deliveryResult = await query(
        'SELECT * FROM deliveries WHERE order_id = $1',
        [id],
      );
      const delivery = deliveryResult.rows[0];
      if (!delivery || delivery.driver_id !== actor.id) {
        throw new AppError('No eres el repartidor asignado a este pedido', 403);
      }
      if (currentStatus !== 'in_transit' || status !== 'delivered') {
        throw new AppError('El repartidor solo puede marcar como entregado desde en_tránsito', 400);
      }
    }
    /* admin: any transition allowed */

    /* Update order */
    const updatedOrder = await query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
    );

    /* Update delivery status if mapped */
    const deliveryStatus = ORDER_TO_DELIVERY[status];
    if (deliveryStatus) {
      await query(
        `UPDATE deliveries SET status = $1, updated_at = NOW() WHERE order_id = $2`,
        [deliveryStatus, id],
      );
    }

    /* Notify buyer */
    const statusMessages: Partial<Record<OrderStatus, string>> = {
      confirmed:  'Tu pedido fue confirmado por el vendedor',
      preparing:  'Tu pedido está siendo preparado',
      in_transit: 'Tu pedido está en camino',
      delivered:  'Tu pedido fue entregado. ¡Buen provecho!',
      cancelled:  'Tu pedido fue cancelado',
    };
    const message = statusMessages[status];
    if (message) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body, data)
              VALUES ($1, 'order_status', 'Actualización de pedido', $2, $3)`,
        [order.buyer_id, message, JSON.stringify({ order_id: id, status })],
      );
    }

    ok(res, updatedOrder.rows[0]);
  } catch (err) {
    next(err);
  }
};
