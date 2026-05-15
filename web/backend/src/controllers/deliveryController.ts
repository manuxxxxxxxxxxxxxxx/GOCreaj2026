import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { ok, paginate } from '../utils/response';

const DRIVER_EARNINGS_RATE = 0.20; // 20 % of order total

/* ── GET AVAILABLE DELIVERIES ──────────────────────────────── */
export const getAvailable = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await query(
      `SELECT d.*,
              o.total,
              o.address,
              sp.store_name,
              json_agg(oi.name) AS items
         FROM deliveries d
         JOIN orders          o  ON o.id      = d.order_id
         JOIN seller_profiles sp ON sp.user_id = o.seller_id
         JOIN order_items     oi ON oi.order_id = o.id
        WHERE d.status = 'searching'
          AND d.driver_id IS NULL
        GROUP BY d.id, o.total, o.address, sp.store_name
        ORDER BY d.created_at DESC`,
    );

    ok(res, result.rows);
  } catch (err) {
    next(err);
  }
};

/* ── ACCEPT DELIVERY ───────────────────────────────────────── */
export const acceptDelivery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id }    = req.params;
    const driver_id = req.user!.id;

    /* Atomic claim — only one driver wins the race */
    const updateResult = await query(
      `UPDATE deliveries
          SET driver_id  = $1,
              status     = 'assigned',
              updated_at = NOW()
        WHERE id = $2
          AND status    = 'searching'
          AND driver_id IS NULL
        RETURNING *`,
      [driver_id, id],
    );

    if (!updateResult.rows.length) {
      throw new AppError('Este pedido ya fue tomado', 409);
    }

    const delivery = updateResult.rows[0];

    /* Move order to in_transit */
    await query(
      `UPDATE orders SET status = 'in_transit', updated_at = NOW() WHERE id = $1`,
      [delivery.order_id],
    );

    /* Notify buyer */
    const orderResult = await query(
      'SELECT buyer_id FROM orders WHERE id = $1',
      [delivery.order_id],
    );
    const buyer_id = orderResult.rows[0]?.buyer_id;
    if (buyer_id) {
      await query(
        `INSERT INTO notifications (user_id, type, title, body, data)
              VALUES ($1, 'delivery_assigned', 'Repartidor asignado',
                      'Tu pedido fue asignado a un repartidor', $2)`,
        [buyer_id, JSON.stringify({ order_id: delivery.order_id, delivery_id: id })],
      );
    }

    ok(res, delivery);
  } catch (err) {
    next(err);
  }
};

/* ── UPDATE DELIVERY STATUS ────────────────────────────────── */
export const updateDeliveryStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id }     = req.params;
    const { status } = req.body as { status: 'picked_up' | 'delivered' };
    const driver_id  = req.user!.id;

    /* Verify this driver owns the delivery */
    const deliveryResult = await query(
      'SELECT * FROM deliveries WHERE id = $1',
      [id],
    );
    if (!deliveryResult.rows.length) throw new AppError('Entrega no encontrada', 404);

    const delivery = deliveryResult.rows[0];
    if (delivery.driver_id !== driver_id) {
      throw new AppError('No eres el repartidor asignado a esta entrega', 403);
    }

    /* Build timestamp field */
    const timestampField = status === 'picked_up' ? 'picked_up_at' : 'delivered_at';

    const updatedResult = await query(
      `UPDATE deliveries
          SET status         = $1,
              ${timestampField} = NOW(),
              updated_at     = NOW()
        WHERE id = $2
        RETURNING *`,
      [status, id],
    );
    const updated = updatedResult.rows[0];

    /* Handle delivered side-effects */
    if (status === 'delivered') {
      /* Mark order as delivered */
      await query(
        `UPDATE orders SET status = 'delivered', updated_at = NOW() WHERE id = $1`,
        [delivery.order_id],
      );

      /* Calculate & store driver earnings */
      const orderResult = await query(
        'SELECT total FROM orders WHERE id = $1',
        [delivery.order_id],
      );
      const orderTotal    = Number(orderResult.rows[0]?.total ?? 0);
      const driverEarning = parseFloat((orderTotal * DRIVER_EARNINGS_RATE).toFixed(2));

      await query(
        `UPDATE deliveries SET driver_earnings = $1 WHERE id = $2`,
        [driverEarning, id],
      );

      /* Update driver profile stats */
      await query(
        `UPDATE driver_profiles
            SET total_deliveries = total_deliveries + 1
          WHERE user_id = $1`,
        [driver_id],
      );
    }

    ok(res, updated);
  } catch (err) {
    next(err);
  }
};

/* ── GET DRIVER HISTORY ────────────────────────────────────── */
export const getDriverHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const driver_id = req.user!.role === 'admin' && req.query.driver_id
      ? String(req.query.driver_id)
      : req.user!.id;

    const page   = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10));
    const limit  = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const offset = (page - 1) * limit;

    const countResult = await query(
      'SELECT COUNT(*) FROM deliveries WHERE driver_id = $1',
      [driver_id],
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT d.*, o.total, o.address
         FROM deliveries d
         JOIN orders o ON o.id = d.order_id
        WHERE d.driver_id = $1
        ORDER BY d.created_at DESC
        LIMIT $2 OFFSET $3`,
      [driver_id, limit, offset],
    );

    paginate(res, dataResult.rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/* ── GET DRIVER EARNINGS ───────────────────────────────────── */
export const getDriverEarnings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const driver_id = req.user!.id;

    const [todayRes, weekRes, monthRes, countRes] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(driver_earnings), 0) AS total
           FROM deliveries
          WHERE driver_id = $1
            AND DATE(delivered_at) = CURRENT_DATE`,
        [driver_id],
      ),
      query(
        `SELECT COALESCE(SUM(driver_earnings), 0) AS total
           FROM deliveries
          WHERE driver_id = $1
            AND delivered_at >= DATE_TRUNC('week', NOW())`,
        [driver_id],
      ),
      query(
        `SELECT COALESCE(SUM(driver_earnings), 0) AS total
           FROM deliveries
          WHERE driver_id = $1
            AND delivered_at >= DATE_TRUNC('month', NOW())`,
        [driver_id],
      ),
      query(
        `SELECT COUNT(*) AS total
           FROM deliveries
          WHERE driver_id = $1
            AND status = 'delivered'`,
        [driver_id],
      ),
    ]);

    ok(res, {
      today:           parseFloat(todayRes.rows[0].total),
      week:            parseFloat(weekRes.rows[0].total),
      month:           parseFloat(monthRes.rows[0].total),
      totalDeliveries: parseInt(countRes.rows[0].total, 10),
    });
  } catch (err) {
    next(err);
  }
};
