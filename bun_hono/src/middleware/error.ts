import type { Context, Next } from 'hono';
import { AppError } from '../models/error';

export const errorMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ message: error.message }, error.status);
    }
    console.error('Unhandled error', error);
    return c.json({ message: 'internal error' }, 500);
  }
};
