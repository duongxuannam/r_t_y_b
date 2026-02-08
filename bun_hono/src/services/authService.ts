import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../models/error';
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UserResponse,
  Claims,
} from '../models/auth';
import type { AppState } from '../config/state';
import { sendResetEmail } from './emailService';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
}

interface RefreshRow {
  user_id: string;
  email: string;
  expires_at: Date;
}

interface PasswordResetRow {
  user_id: string;
  expires_at: Date;
}

export const register = async (state: AppState, payload: RegisterRequest): Promise<[AuthResponse, string]> => {
  validateRegisterPayload(payload);

  const passwordHash = await hashPassword(payload.password);
  const userId = uuidv4();

  try {
    const [user] = await state.db<UserResponse[]>`
      INSERT INTO users (id, email, password_hash)
      VALUES (${userId}, ${payload.email.toLowerCase()}, ${passwordHash})
      RETURNING id, email
    `;

    const tokens = await createTokens(state, user.id);
    return [
      {
        user,
        access_token: tokens.accessToken,
      },
      tokens.refreshToken,
    ];
  } catch (error: any) {
    if (error?.code === '23505') {
      throw AppError.badRequest('email already registered');
    }
    throw AppError.internal();
  }
};

export const login = async (state: AppState, payload: LoginRequest): Promise<[AuthResponse, string]> => {
  const [user] = await state.db<UserRow[]>`
    SELECT id, email, password_hash FROM users WHERE email = ${payload.email.toLowerCase()}
  `;
  if (!user) {
    throw AppError.unauthorized();
  }

  await verifyPassword(payload.password, user.password_hash);

  const tokens = await createTokens(state, user.id);
  return [
    {
      user: { id: user.id, email: user.email },
      access_token: tokens.accessToken,
    },
    tokens.refreshToken,
  ];
};

export const refresh = async (state: AppState, refreshToken: string): Promise<[AuthResponse, string]> => {
  const tokenHash = hashToken(refreshToken);
  const [row] = await state.db<RefreshRow[]>`
    SELECT rt.user_id, rt.expires_at, u.email
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token_hash = ${tokenHash}
  `;

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    throw AppError.unauthorized();
  }

  await state.db`
    DELETE FROM refresh_tokens WHERE token_hash = ${tokenHash}
  `;

  const tokens = await createTokens(state, row.user_id);
  return [
    {
      user: { id: row.user_id, email: row.email },
      access_token: tokens.accessToken,
    },
    tokens.refreshToken,
  ];
};

export const logout = async (state: AppState, refreshToken: string): Promise<void> => {
  const tokenHash = hashToken(refreshToken);
  const result = await state.db`
    DELETE FROM refresh_tokens WHERE token_hash = ${tokenHash}
  `;
  if (result.count === 0) {
    throw AppError.unauthorized();
  }
};

export const forgotPassword = async (state: AppState, payload: ForgotPasswordRequest): Promise<void> => {
  validateEmail(payload.email);

  const [user] = await state.db<UserResponse[]>`
    SELECT id, email FROM users WHERE email = ${payload.email.toLowerCase()}
  `;

  if (!user) {
    return;
  }

  await state.db`
    DELETE FROM password_resets WHERE user_id = ${user.id}
  `;

  const token = uuidv4();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + state.email.resetTtlMinutes * 60 * 1000);

  await state.db`
    INSERT INTO password_resets (id, user_id, token_hash, expires_at)
    VALUES (${uuidv4()}, ${user.id}, ${tokenHash}, ${expiresAt})
  `;

  const resetBase = state.email.resetUrlBase.replace(/\/$/, '');
  const resetLink = `${resetBase}/reset?token=${token}`;

  await sendResetEmail(state.email, user.email, resetLink);
};

export const resetPassword = async (state: AppState, payload: ResetPasswordRequest): Promise<void> => {
  validatePasswordBasic(payload.password);

  const tokenHash = hashToken(payload.token);

  await state.db.begin(async (tx) => {
    const [row] = await tx<PasswordResetRow[]>`
      SELECT user_id, expires_at
      FROM password_resets
      WHERE token_hash = ${tokenHash} AND used_at IS NULL
    `;

    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      throw AppError.badRequest('invalid or expired reset token');
    }

    const passwordHash = await hashPassword(payload.password);
    await tx`
      UPDATE users SET password_hash = ${passwordHash} WHERE id = ${row.user_id}
    `;

    await tx`
      UPDATE password_resets SET used_at = NOW() WHERE token_hash = ${tokenHash}
    `;

    await tx`
      DELETE FROM refresh_tokens WHERE user_id = ${row.user_id}
    `;
  });
};

export const decodeToken = (secret: string, token: string): Claims => {
  try {
    return jwt.verify(token, secret) as Claims;
  } catch {
    throw AppError.unauthorized();
  }
};

const validateRegisterPayload = (payload: RegisterRequest) => {
  validateEmail(payload.email);
  validatePasswordBasic(payload.password);
};

const validateEmail = (email: string) => {
  if (!email.includes('@')) {
    throw AppError.badRequest('invalid email');
  }
};

const validatePasswordBasic = (password: string) => {
  if (password.length < 8) {
    throw AppError.badRequest('password must be at least 8 characters');
  }
  const hasLetter = [...password].some((char) => /[a-zA-Z]/.test(char));
  const hasNumber = [...password].some((char) => /[0-9]/.test(char));
  if (!hasLetter || !hasNumber) {
    throw AppError.badRequest('password must include letters and numbers');
  }
};

const hashPassword = async (password: string) => {
  try {
    return await argon2.hash(password);
  } catch {
    throw AppError.internal();
  }
};

const verifyPassword = async (password: string, hash: string) => {
  try {
    const ok = await argon2.verify(hash, password);
    if (!ok) {
      throw AppError.unauthorized();
    }
  } catch {
    throw AppError.unauthorized();
  }
};

const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

const createAccessToken = (secret: string, userId: string, ttlMinutes: number) => {
  const exp = Math.floor(Date.now() / 1000 + ttlMinutes * 60);
  return jwt.sign({ sub: userId, exp }, secret);
};

const createTokens = async (state: AppState, userId: string): Promise<TokenPair> => {
  const accessToken = createAccessToken(state.jwt.secret, userId, state.jwt.accessTtlMinutes);
  const refreshToken = uuidv4();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + state.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);

  await state.db`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (${uuidv4()}, ${userId}, ${tokenHash}, ${expiresAt})
  `;

  return { accessToken, refreshToken };
};
