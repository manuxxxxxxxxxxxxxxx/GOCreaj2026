import { Response } from 'express';

interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
}

export const ok   = (res: Response, data: unknown, meta?: Meta) =>
  res.json({ data, ...(meta ? { meta } : {}) });

export const created = (res: Response, data: unknown) =>
  res.status(201).json({ data });

export const paginate = (
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number,
) =>
  res.json({
    data,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
