import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { ok, created, paginate } from '../utils/response';

/* ── LIST PRODUCTS ─────────────────────────────────────────── */
export const listProducts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page      = Math.max(1, parseInt(String(req.query.page  ?? '1'),  10));
    const limit     = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const offset    = (page - 1) * limit;
    const { category, search, seller_id, min_price, max_price } = req.query;

    const conditions: string[] = ['p.is_active = true'];
    const params: unknown[]    = [];

    const push = (cond: string, value: unknown) => {
      params.push(value);
      conditions.push(cond.replace('$?', `$${params.length}`));
    };

    if (category)  push('p.category = $?',              category);
    if (seller_id) push('p.seller_id = $?::uuid',       seller_id);
    if (min_price) push('p.price >= $?::numeric',       min_price);
    if (max_price) push('p.price <= $?::numeric',       max_price);
    if (search)    push("p.name ILIKE '%' || $? || '%'", search);

    const where = conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM products p WHERE ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit);
    const limitParam  = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const dataResult = await query(
      `SELECT p.*, u.email AS seller_email, sp.store_name
         FROM products p
         JOIN users u            ON u.id  = p.seller_id
         LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
        WHERE ${where}
        ORDER BY p.created_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    paginate(res, dataResult.rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

/* ── GET PRODUCT ───────────────────────────────────────────── */
export const getProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, sp.store_name, sp.rating AS seller_rating
         FROM products p
         LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
        WHERE p.id = $1`,
      [id],
    );

    if (!result.rows.length) throw new AppError('Producto no encontrado', 404);

    ok(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ── CREATE PRODUCT ────────────────────────────────────────── */
export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, description, price, stock, category, emoji, images } = req.body;

    const seller_id =
      req.user!.role === 'admin' && req.body.seller_id
        ? req.body.seller_id
        : req.user!.id;

    const result = await query(
      `INSERT INTO products (seller_id, name, description, price, stock, category, emoji, images)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
      [seller_id, name, description, price, stock, category, emoji, images ?? []],
    );

    created(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ── UPDATE PRODUCT ────────────────────────────────────────── */
export const updateProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const ownerResult = await query(
      'SELECT seller_id FROM products WHERE id = $1',
      [id],
    );
    if (!ownerResult.rows.length) throw new AppError('Producto no encontrado', 404);

    const product = ownerResult.rows[0];
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'master_admin';
    if (product.seller_id !== req.user!.id && !isAdmin) {
      throw new AppError('No tienes permisos para modificar este producto', 403);
    }

    const allowed = ['name', 'description', 'price', 'stock', 'category', 'emoji', 'images', 'is_active'];
    const setClauses: string[] = [];
    const params: unknown[]    = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field]);
        setClauses.push(`${field} = $${params.length}`);
      }
    }

    if (!setClauses.length) throw new AppError('No hay campos para actualizar', 400);

    params.push(id);
    const result = await query(
      `UPDATE products SET ${setClauses.join(', ')}, updated_at = NOW()
        WHERE id = $${params.length}
        RETURNING *`,
      params,
    );

    ok(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/* ── DELETE PRODUCT (soft) ─────────────────────────────────── */
export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const ownerResult = await query(
      'SELECT seller_id FROM products WHERE id = $1',
      [id],
    );
    if (!ownerResult.rows.length) throw new AppError('Producto no encontrado', 404);

    const product = ownerResult.rows[0];
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'master_admin';
    if (product.seller_id !== req.user!.id && !isAdmin) {
      throw new AppError('No tienes permisos para eliminar este producto', 403);
    }

    await query(
      'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id],
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
