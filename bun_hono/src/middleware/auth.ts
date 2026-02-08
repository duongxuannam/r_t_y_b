import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { AppError } from '../models/error';
import type { AppState } from '../config/state';
import type { Claims } from '../models/auth';

export interface AuthUser {
  userId: string;
}

export const requireAuth = (state: AppState) => async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw AppError.unauthorized();
  }
  try {
    const decoded = jwt.verify(token, state.jwt.secret) as Claims;
    c.set('authUser', { userId: decoded.sub } satisfies AuthUser);
  } catch {
    throw AppError.unauthorized();
  }
  await next();
};

export const getAuthUser = (c: Context): AuthUser => {
  const user = c.get('authUser');
  if (!user) {
    throw AppError.unauthorized();
  }
  return user as AuthUser;
};
