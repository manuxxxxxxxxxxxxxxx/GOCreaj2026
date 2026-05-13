import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

export const generateAccessToken = (userId: string, role: string, status: string): string =>
  jwt.sign(
    { userId, role, status },
    process.env.JWT_SECRET!,
    // expiresIn acepta string ('15m','1h'…) pero los tipos de @types/jsonwebtoken
    // requieren StringValue — el cast evita el error sin perder funcionalidad.
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as unknown as number },
  );

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const token     = uuidv4() + uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO auth_tokens (user_id, token, type, expires_at)
     VALUES ($1, $2, 'refresh', $3)`,
    [userId, token, expiresAt],
  );

  return token;
};

export const generateOneTimeToken = async (
  userId: string,
  type: 'email_verify' | 'password_reset',
): Promise<string> => {
  const token     = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
  const hoursToLive = type === 'password_reset' ? 1 : 24;
  const expiresAt   = new Date(Date.now() + hoursToLive * 60 * 60 * 1000);

  // Invalidar tokens previos del mismo tipo
  await query(
    'DELETE FROM auth_tokens WHERE user_id = $1 AND type = $2',
    [userId, type],
  );

  await query(
    `INSERT INTO auth_tokens (user_id, token, type, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, type, expiresAt],
  );

  return token;
};

export const consumeToken = async (
  token: string,
  type: string,
): Promise<{ user_id: string } | null> => {
  const { rows } = await query(
    `SELECT user_id FROM auth_tokens
     WHERE token = $1 AND type = $2 AND used = false AND expires_at > NOW()`,
    [token, type],
  );
  if (!rows[0]) return null;

  await query(
    'UPDATE auth_tokens SET used = true WHERE token = $1',
    [token],
  );

  return rows[0] as { user_id: string };
};
