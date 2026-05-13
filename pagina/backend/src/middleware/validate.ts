import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      error: 'Datos inválidos',
      fields: errors.array().map((e) => ({
        field: (e as { path: string }).path,
        message: e.msg,
      })),
    });
    return;
  }
  next();
};
