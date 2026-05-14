import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

export async function getCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      'SELECT id, slug, name, emoji, sort_order FROM categories ORDER BY sort_order ASC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}
