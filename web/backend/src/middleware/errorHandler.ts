import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Duplicate key (PostgreSQL)
  if ((err as NodeJS.ErrnoException).code === '23505') {
    res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    return;
  }

  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
};
