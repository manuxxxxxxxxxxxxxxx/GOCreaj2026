import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  generateAccessToken,
  generateRefreshToken,
  generateOneTimeToken,
  consumeToken,
} from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';

const SALT_ROUNDS = 12;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/* ── register ─────────────────────────────────────────────────── */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: 'buyer' | 'seller' | 'driver';
      termsAccepted: string;
    };

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new AppError('El correo ya está registrado', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, role, status, email_verified, terms_accepted_at, terms_version)
       VALUES ($1, $2, $3, 'pending', false, NOW(), '1.0') RETURNING *`,
      [email, passwordHash, role],
    );
    const user = rows[0] as { id: string };

    await query(
      'INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)',
      [user.id, name],
    );

    if (role === 'seller') {
      await query(
        'INSERT INTO seller_profiles (user_id, store_name) VALUES ($1, $2)',
        [user.id, name],
      );
    }

    if (role === 'driver') {
      await query('INSERT INTO driver_profiles (user_id) VALUES ($1)', [user.id]);
    }

    const token = await generateOneTimeToken(user.id, 'email_verify');
    await sendVerificationEmail(email, name, token);

    res.status(201).json({ message: 'Cuenta creada. Revisa tu correo para verificarla.' });
  } catch (err) {
    next(err);
  }
};

/* ── login ────────────────────────────────────────────────────── */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const { rows } = await query(
      'SELECT id, email, password_hash, role, status, email_verified FROM users WHERE email = $1',
      [email],
    );
    const user = rows[0] as {
      id: string;
      email: string;
      password_hash: string;
      role: string;
      status: string;
      email_verified: boolean;
    } | undefined;

    if (!user) {
      throw new AppError('Credenciales incorrectas', 401);
    }

    if (user.status === 'banned') {
      throw new AppError('Tu cuenta fue suspendida', 403);
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError('Credenciales incorrectas', 401);
    }

    if (!user.email_verified) {
      res.status(403).json({
        error: 'Verifica tu email antes de iniciar sesión',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const accessToken = generateAccessToken(user.id, user.role, user.status);
    const refreshToken = await generateRefreshToken(user.id);

    const profileResult = await query(
      'SELECT full_name, avatar_url FROM profiles WHERE user_id = $1',
      [user.id],
    );
    const profile = profileResult.rows[0] as
      | { full_name: string; avatar_url: string | null }
      | undefined;

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        name: profile?.full_name ?? null,
        avatar: profile?.avatar_url ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ── googleCallback ───────────────────────────────────────────── */
export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = (req as AuthRequest).user as {
      id: string;
      email: string;
      role: string;
      status: string;
    };

    const accessToken = generateAccessToken(user.id, user.role, user.status);
    const refreshToken = await generateRefreshToken(user.id);

    res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`,
    );
  } catch (err) {
    next(err);
  }
};

/* ── verifyEmail ──────────────────────────────────────────────── */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token } = req.params as { token: string };

    const result = await consumeToken(token, 'email_verify');
    if (!result) {
      throw new AppError('Token inválido o expirado', 400);
    }

    await query(
      "UPDATE users SET status = 'verified', email_verified = true WHERE id = $1",
      [result.user_id],
    );

    res.redirect(`${FRONTEND_URL}/login?verified=true`);
  } catch (err) {
    next(err);
  }
};

/* ── refreshToken ─────────────────────────────────────────────── */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string };

    const { rows } = await query(
      `SELECT at.user_id, u.role, u.status
       FROM auth_tokens at
       JOIN users u ON u.id = at.user_id
       WHERE at.token = $1
         AND at.type = 'refresh'
         AND at.used = false
         AND at.expires_at > NOW()`,
      [token],
    );
    const record = rows[0] as
      | { user_id: string; role: string; status: string }
      | undefined;

    if (!record) {
      throw new AppError('Refresh token inválido', 401);
    }

    await query('UPDATE auth_tokens SET used = true WHERE token = $1', [token]);

    const newAccessToken = generateAccessToken(record.user_id, record.role, record.status);
    const newRefreshToken = await generateRefreshToken(record.user_id);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

/* ── forgotPassword ───────────────────────────────────────────── */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    const { rows } = await query(
      'SELECT id, email, email_verified FROM users WHERE email = $1',
      [email],
    );
    const user = rows[0] as
      | { id: string; email: string; email_verified: boolean }
      | undefined;

    if (user && user.email_verified) {
      const profileResult = await query(
        'SELECT full_name FROM profiles WHERE user_id = $1',
        [user.id],
      );
      const name =
        (profileResult.rows[0] as { full_name: string } | undefined)?.full_name ?? email;

      const token = await generateOneTimeToken(user.id, 'password_reset');
      await sendPasswordResetEmail(email, name, token);
    }

    res.json({ message: 'Si el correo existe, recibirás instrucciones.' });
  } catch (err) {
    next(err);
  }
};

/* ── resetPassword ────────────────────────────────────────────── */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, password } = req.body as { token: string; password: string };

    const result = await consumeToken(token, 'password_reset');
    if (!result) {
      throw new AppError('Token inválido o expirado', 400);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      passwordHash,
      result.user_id,
    ]);

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    next(err);
  }
};

/* ── logout ───────────────────────────────────────────────────── */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as { refreshToken?: string };

    if (token) {
      await query(
        "UPDATE auth_tokens SET used = true WHERE token = $1 AND type = 'refresh'",
        [token],
      );
    }

    res.json({ message: 'Sesión cerrada.' });
  } catch (err) {
    next(err);
  }
};
