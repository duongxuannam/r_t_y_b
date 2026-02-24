import type { Context, Next } from 'hono';
import { randomUUID } from 'node:crypto';

export const requestId = async (c: Context, next: Next) => {
  const existing = c.req.header('x-request-id');
  const id = existing || randomUUID();
  c.set('requestId', id);
  await next();
  c.header('x-request-id', id);
};
