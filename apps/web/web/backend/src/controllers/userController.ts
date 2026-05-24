import { Response, NextFunction } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ok, created, paginate } from '../utils/response';
import { sendRoleApprovedEmail } from '../utils/email';

// GET / — list users (admin only)
export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const { role, status, search } = req.query as Record<string, string | undefined>;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (role) {
      conditions.push(`u.role = $${paramIndex++}`);
      params.push(role);
    }

    if (status) {
      conditions.push(`u.status = $${paramIndex++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR p.full_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await query(
      `SELECT u.id, u.email, u.role, u.status, u.created_at,
              p.full_name, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    paginate(res, dataResult.rows, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// GET /:id — get single user (admin)
export const getUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.*, p.full_name, p.avatar_url, p.phone, p.bio, p.address,
              sp.store_name, sp.verified_seller,
              dp.vehicle_type, dp.verified_driver
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN seller_profiles sp ON sp.user_id = u.id
       LEFT JOIN driver_profiles dp ON dp.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }

    ok(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /:id/status — update user status (admin)
export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: 'verified' | 'suspended' | 'banned' };

    const result = await query(
      `UPDATE users
       SET status = $1
       WHERE id = $2
       RETURNING id, email, role, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const updated = result.rows[0];

    if (status === 'verified' && (updated.role === 'seller' || updated.role === 'driver')) {
      const profileResult = await query(
        `SELECT full_name FROM profiles WHERE user_id = $1`,
        [id]
      );
      const fullName = profileResult.rows[0]?.full_name ?? updated.email;
      await sendRoleApprovedEmail(updated.email, fullName, updated.role);
    }

    ok(res, updated);
  } catch (err) {
    next(err);
  }
};

// PATCH /:id/role — update user role (admin)
export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body as { role: 'buyer' | 'seller' | 'driver' | 'admin' };

    const updateResult = await query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING *`,
      [role, id]
    );

    if (updateResult.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const updated = updateResult.rows[0];

    if (role === 'seller') {
      const existing = await query(
        `SELECT id FROM seller_profiles WHERE user_id = $1`,
        [id]
      );
      if (existing.rows.length === 0) {
        await query(`INSERT INTO seller_profiles (user_id) VALUES ($1)`, [id]);
      }
    }

    if (role === 'driver') {
      const existing = await query(
        `SELECT id FROM driver_profiles WHERE user_id = $1`,
        [id]
      );
      if (existing.rows.length === 0) {
        await query(`INSERT INTO driver_profiles (user_id) VALUES ($1)`, [id]);
      }
    }

    ok(res, updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — soft-ban user (admin)
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (id === String(req.user!.id)) {
      throw new AppError('No puedes eliminarte a ti mismo', 400);
    }

    const result = await query(
      `UPDATE users SET status = 'banned' WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// GET /me — current authenticated user profile
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const userResult = await query(
      `SELECT u.id, u.email, u.role, u.status,
              p.full_name, p.avatar_url, p.phone, p.bio, p.address
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const user: Record<string, unknown> = { ...userResult.rows[0] };

    if (role === 'seller') {
      const spResult = await query(
        `SELECT store_name, store_description, category, verified_seller, rating, total_reviews
         FROM seller_profiles
         WHERE user_id = $1`,
        [userId]
      );
      user.seller_profile = spResult.rows[0] ?? null;
    }

    if (role === 'driver') {
      const dpResult = await query(
        `SELECT vehicle_type, vehicle_plate, verified_driver, rating
         FROM driver_profiles
         WHERE user_id = $1`,
        [userId]
      );
      user.driver_profile = dpResult.rows[0] ?? null;
    }

    ok(res, user);
  } catch (err) {
    next(err);
  }
};

// PATCH /me — update current authenticated user profile
export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const allowedProfileFields = ['full_name', 'phone', 'bio', 'address', 'avatar_url'] as const;
    type ProfileField = typeof allowedProfileFields[number];

    const profileUpdates: Partial<Record<ProfileField, unknown>> = {};
    for (const field of allowedProfileFields) {
      if (field in req.body) {
        profileUpdates[field] = req.body[field];
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const setClauses = Object.keys(profileUpdates)
        .map((field, idx) => `${field} = $${idx + 2}`)
        .join(', ');
      const values = Object.values(profileUpdates);

      await query(
        `UPDATE profiles SET ${setClauses} WHERE user_id = $1`,
        [userId, ...values]
      );
    }

    if (role === 'seller') {
      const allowedSellerFields = ['store_name', 'store_description', 'category'] as const;
      type SellerField = typeof allowedSellerFields[number];

      const sellerUpdates: Partial<Record<SellerField, unknown>> = {};
      for (const field of allowedSellerFields) {
        if (field in req.body) {
          sellerUpdates[field] = req.body[field];
        }
      }

      if (Object.keys(sellerUpdates).length > 0) {
        const setClauses = Object.keys(sellerUpdates)
          .map((field, idx) => `${field} = $${idx + 2}`)
          .join(', ');
        const values = Object.values(sellerUpdates);

        await query(
          `UPDATE seller_profiles SET ${setClauses} WHERE user_id = $1`,
          [userId, ...values]
        );
      }
    }

    if (role === 'driver') {
      const allowedDriverFields = ['vehicle_type', 'vehicle_plate'] as const;
      type DriverField = typeof allowedDriverFields[number];

      const driverUpdates: Partial<Record<DriverField, unknown>> = {};
      for (const field of allowedDriverFields) {
        if (field in req.body) {
          driverUpdates[field] = req.body[field];
        }
      }

      if (Object.keys(driverUpdates).length > 0) {
        const setClauses = Object.keys(driverUpdates)
          .map((field, idx) => `${field} = $${idx + 2}`)
          .join(', ');
        const values = Object.values(driverUpdates);

        await query(
          `UPDATE driver_profiles SET ${setClauses} WHERE user_id = $1`,
          [userId, ...values]
        );
      }
    }

    const updated = await query(
      `SELECT u.id, u.email, u.role, u.status,
              p.full_name, p.avatar_url, p.phone, p.bio, p.address
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    ok(res, updated.rows[0]);
  } catch (err) {
    next(err);
  }
};
