import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ok } from '../utils/response';

// GET /seller — seller analytics (seller or admin)
export const getSellerAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sellerId =
      req.user!.role === 'admin' && req.query.seller_id
        ? String(req.query.seller_id)
        : String(req.user!.id);

    const totalResult = await query(
      `SELECT COALESCE(SUM(total), 0) AS total_revenue, COUNT(*) AS total_orders
       FROM orders
       WHERE seller_id = $1 AND status = 'delivered'`,
      [sellerId]
    );

    const todayResult = await query(
      `SELECT COALESCE(SUM(total), 0) AS today_revenue, COUNT(*) AS today_orders
       FROM orders
       WHERE seller_id = $1
         AND status = 'delivered'
         AND DATE(created_at) = CURRENT_DATE`,
      [sellerId]
    );

    const weeklyResult = await query(
      `SELECT DATE(created_at) AS day,
              SUM(total) AS revenue,
              COUNT(*) AS orders
       FROM orders
       WHERE seller_id = $1
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY day
       ORDER BY day`,
      [sellerId]
    );

    const topProductsResult = await query(
      `SELECT oi.name,
              SUM(oi.quantity) AS total_sold,
              SUM(oi.quantity * oi.unit_price) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.seller_id = $1
         AND o.status = 'delivered'
       GROUP BY oi.name
       ORDER BY total_sold DESC
       LIMIT 5`,
      [sellerId]
    );

    const ratingResult = await query(
      `SELECT rating, total_reviews
       FROM seller_profiles
       WHERE user_id = $1`,
      [sellerId]
    );

    const { total_revenue: totalRevenue, total_orders: totalOrders } = totalResult.rows[0];
    const { today_revenue: todayRevenue, today_orders: todayOrders } = todayResult.rows[0];
    const ratingRow = ratingResult.rows[0] ?? { rating: null, total_reviews: 0 };

    ok(res, {
      totalRevenue: Number(totalRevenue),
      todayRevenue: Number(todayRevenue),
      totalOrders: Number(totalOrders),
      todayOrders: Number(todayOrders),
      weeklyData: weeklyResult.rows,
      topProducts: topProductsResult.rows,
      rating: ratingRow.rating,
      totalReviews: Number(ratingRow.total_reviews),
    });
  } catch (err) {
    next(err);
  }
};

// GET /driver — driver analytics (driver)
export const getDriverAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverId = String(req.user!.id);

    const todayResult = await query(
      `SELECT COALESCE(SUM(driver_earnings), 0) AS today
       FROM deliveries
       WHERE driver_id = $1
         AND DATE(delivered_at) = CURRENT_DATE
         AND status = 'delivered'`,
      [driverId]
    );

    const weekResult = await query(
      `SELECT COALESCE(SUM(driver_earnings), 0) AS week
       FROM deliveries
       WHERE driver_id = $1
         AND delivered_at >= DATE_TRUNC('week', NOW())
         AND status = 'delivered'`,
      [driverId]
    );

    const monthResult = await query(
      `SELECT COALESCE(SUM(driver_earnings), 0) AS month
       FROM deliveries
       WHERE driver_id = $1
         AND delivered_at >= DATE_TRUNC('month', NOW())
         AND status = 'delivered'`,
      [driverId]
    );

    const totalDeliveriesResult = await query(
      `SELECT COUNT(*) AS total_deliveries
       FROM deliveries
       WHERE driver_id = $1 AND status = 'delivered'`,
      [driverId]
    );

    const avgTimeResult = await query(
      `SELECT COALESCE(
         AVG(EXTRACT(EPOCH FROM (delivered_at - picked_up_at)) / 60),
         0
       ) AS avg_minutes
       FROM deliveries
       WHERE driver_id = $1
         AND status = 'delivered'
         AND picked_up_at IS NOT NULL
         AND delivered_at IS NOT NULL`,
      [driverId]
    );

    const ratingResult = await query(
      `SELECT rating FROM driver_profiles WHERE user_id = $1`,
      [driverId]
    );

    ok(res, {
      todayEarnings: Number(todayResult.rows[0].today),
      weekEarnings: Number(weekResult.rows[0].week),
      monthEarnings: Number(monthResult.rows[0].month),
      totalDeliveries: Number(totalDeliveriesResult.rows[0].total_deliveries),
      avgDeliveryMinutes: Number(Number(avgTimeResult.rows[0].avg_minutes).toFixed(2)),
      rating: ratingResult.rows[0]?.rating ?? null,
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin — platform-wide analytics (admin)
export const getAdminAnalytics = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const revenueResult = await query(
      `SELECT COALESCE(SUM(total), 0) AS total_revenue FROM orders WHERE status = 'delivered'`
    );

    const totalUsersResult = await query(
      `SELECT COUNT(*) AS total_users FROM users WHERE status != 'banned'`
    );

    const usersByRoleResult = await query(
      `SELECT role, COUNT(*) AS count FROM users GROUP BY role`
    );

    const totalTxResult = await query(
      `SELECT COUNT(*) AS total_transactions FROM orders`
    );

    const pendingResult = await query(
      `SELECT COUNT(*) AS pending_verifications FROM users WHERE status = 'pending'`
    );

    const monthlyRevenueResult = await query(
      `SELECT DATE_TRUNC('month', created_at) AS month,
              SUM(total) AS revenue
       FROM orders
       WHERE status = 'delivered'
       GROUP BY month
       ORDER BY month
       LIMIT 6`
    );

    const recentActivityResult = await query(
      `SELECT u.email, o.id, o.total, o.status, o.created_at
       FROM orders o
       JOIN users u ON u.id = o.buyer_id
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    ok(res, {
      totalRevenue: Number(revenueResult.rows[0].total_revenue),
      totalUsers: Number(totalUsersResult.rows[0].total_users),
      usersByRole: usersByRoleResult.rows,
      totalTransactions: Number(totalTxResult.rows[0].total_transactions),
      pendingVerifications: Number(pendingResult.rows[0].pending_verifications),
      monthlyRevenue: monthlyRevenueResult.rows,
      recentActivity: recentActivityResult.rows,
    });
  } catch (err) {
    next(err);
  }
};
