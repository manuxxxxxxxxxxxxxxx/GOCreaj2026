import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ok } from '../utils/response';

// GET / — list notifications for current user
export const listNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const notificationsResult = await query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const unreadResult = await query(
      `SELECT COUNT(*) AS unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    ok(res, {
      notifications: notificationsResult.rows,
      unreadCount: Number(unreadResult.rows[0].unread_count),
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /:id/read — mark a single notification as read
export const markRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// PATCH /read-all — mark all notifications as read for current user
export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    await query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
