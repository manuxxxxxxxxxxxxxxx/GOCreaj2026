import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

export async function getConversations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req.user as any).id;

    const result = await query(
      `SELECT DISTINCT ON (partner_id)
         partner_id,
         partner_email,
         partner_name,
         last_body,
         last_at,
         unread_count
       FROM (
         SELECT
           CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END AS partner_id,
           u.email  AS partner_email,
           p.full_name AS partner_name,
           m.body   AS last_body,
           m.created_at AS last_at,
           COUNT(*) FILTER (WHERE m.recipient_id = $1 AND m.is_read = FALSE) AS unread_count
         FROM messages m
         JOIN users   u ON u.id = CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE m.sender_id = $1 OR m.recipient_id = $1
         GROUP BY partner_id, u.email, p.full_name, m.body, m.created_at
         ORDER BY m.created_at DESC
       ) sub
       ORDER BY partner_id, last_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId    = (req.user as any).id;
    const partnerId = req.params.partnerId;
    const limit     = Math.min(Number(req.query.limit) || 50, 100);
    const before    = req.query.before as string | undefined;

    const result = await query(
      `SELECT id, sender_id, recipient_id, body, image_url, is_read, created_at
       FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ${before ? 'AND created_at < $4' : ''}
       ORDER BY created_at ASC
       LIMIT $3`,
      before ? [userId, partnerId, limit, before] : [userId, partnerId, limit]
    );

    // Mark received messages as read
    await query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = $2 AND recipient_id = $1 AND is_read = FALSE`,
      [userId, partnerId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const senderId     = (req.user as any).id;
    const { recipientId, body, imageUrl } = req.body;

    if (!recipientId || !body?.trim()) {
      return res.status(400).json({ error: 'recipientId y body son requeridos.' });
    }
    if (senderId === recipientId) {
      return res.status(400).json({ error: 'No puedes enviarte mensajes a ti mismo.' });
    }

    const recipientCheck = await query('SELECT id FROM users WHERE id = $1', [recipientId]);
    if (recipientCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Destinatario no encontrado.' });
    }

    const result = await query(
      `INSERT INTO messages (sender_id, recipient_id, body, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [senderId, recipientId, body.trim(), imageUrl ?? null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId    = (req.user as any).id;
    const partnerId = req.params.partnerId;

    await query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = $2 AND recipient_id = $1 AND is_read = FALSE`,
      [userId, partnerId]
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req.user as any).id;
    const result = await query(
      'SELECT COUNT(*) AS count FROM messages WHERE recipient_id = $1 AND is_read = FALSE',
      [userId]
    );
    res.json({ count: Number(result.rows[0].count) });
  } catch (err) {
    next(err);
  }
}
