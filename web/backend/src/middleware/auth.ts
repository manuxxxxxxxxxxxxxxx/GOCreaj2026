import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

export interface AuthUser {
  id: string;
  email: string;
  role: 'buyer' | 'seller' | 'driver' | 'admin' | 'master_admin';
  status: string;
}

// Hace que req.user sea compatible con AuthUser en toda la app
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends AuthUser {}
  }
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (err: Error | null, user: AuthUser | false) => {
    if (err)   return next(err);
    if (!user) return res.status(401).json({ error: 'Token inválido o expirado' });
    (req as AuthRequest).user = user;
    next();
  })(req, res, next);
};

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'No tienes permisos para esta acción' });
      return;
    }
    next();
  };

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (_err: unknown, user: AuthUser | false) => {
    if (user) (req as AuthRequest).user = user;
    next();
  })(req, _res, next);
};
