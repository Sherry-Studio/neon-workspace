import type { Response } from 'express';
import type { ApiErrorDetail } from './ApiError';
import type { Paginated } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'OK',
  statusCode = 200,
): Response {
  return res.status(statusCode).json({ success: true, message, data });
}

export function sendPaginated<T>(
  res: Response,
  paginated: Paginated<T>,
  message = 'OK',
): Response {
  return res.status(200).json({
    success: true,
    message,
    data: paginated.items,
    meta: {
      page: paginated.page,
      limit: paginated.limit,
      total: paginated.total,
      totalPages: paginated.totalPages,
    },
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors: ApiErrorDetail[] = [],
): Response {
  return res.status(statusCode).json({ success: false, message, errors });
}
