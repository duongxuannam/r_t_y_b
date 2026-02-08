import type { AppState } from '../config/state';
import type { UserResponse } from '../models/auth';

export const listUsers = async (state: AppState): Promise<UserResponse[]> => {
  const users = await state.db<UserResponse[]>`
    SELECT id, email FROM users ORDER BY email ASC
  `;
  return users;
};
