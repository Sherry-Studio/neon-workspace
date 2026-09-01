import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
