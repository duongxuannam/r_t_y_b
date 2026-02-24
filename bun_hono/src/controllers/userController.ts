import type { Context } from 'hono';
import type { AppState } from '../config/state';
import { getAuthUser } from '../middleware/auth';
import { listUsers } from '../services/userService';

export const listUsersHandler = (state: AppState) => async (c: Context) => {
  getAuthUser(c);
  const users = await listUsers(state);
  return c.json(users);
};
