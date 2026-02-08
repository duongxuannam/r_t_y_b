import type { Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { AppState } from '../config/state';
import { AppError } from '../models/error';
import type {
  ForgotPasswordRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../models/auth';
import { localizedMessage, parseAcceptLanguage } from '../models/locale';
import { forgotPassword, login, logout, refresh, register, resetPassword } from '../services/authService';

export const registerHandler = (state: AppState) => async (c: Context) => {
  const payload = (await c.req.json()) as RegisterRequest;
  const [response, refreshToken] = await register(state, payload);
  setRefreshCookie(state, c, refreshToken);
  return c.json(response, 201);
};

export const loginHandler = (state: AppState) => async (c: Context) => {
  const payload = (await c.req.json()) as LoginRequest;
  const [response, refreshToken] = await login(state, payload);
  setRefreshCookie(state, c, refreshToken);
  return c.json(response);
};

export const refreshHandler = (state: AppState) => async (c: Context) => {
  const payload = (await readOptionalJson<RefreshRequest>(c)) ?? {};
  const refreshToken = extractRefreshToken(state, c, payload);
  const [response, newRefreshToken] = await refresh(state, refreshToken);
  setRefreshCookie(state, c, newRefreshToken);
  return c.json(response);
};

export const logoutHandler = (state: AppState) => async (c: Context) => {
  const payload = (await readOptionalJson<RefreshRequest>(c)) ?? {};
  const refreshToken = extractRefreshToken(state, c, payload);
  await logout(state, refreshToken);
  clearRefreshCookie(state, c);
  return c.body(null, 204);
};

export const forgotHandler = (state: AppState) => async (c: Context) => {
  const payload = (await c.req.json()) as ForgotPasswordRequest;
  await forgotPassword(state, payload);
  const language = parseAcceptLanguage(c.req.header('accept-language'));
  return c.json({
    message: localizedMessage(
      language,
      'If the email exists, a reset link will be sent.',
      'Nếu email tồn tại, reset link sẽ được gửi.'
    ),
  });
};

export const resetHandler = (state: AppState) => async (c: Context) => {
  const payload = (await c.req.json()) as ResetPasswordRequest;
  await resetPassword(state, payload);
  const language = parseAcceptLanguage(c.req.header('accept-language'));
  return c.json({
    message: localizedMessage(language, 'Password has been updated.', 'Mật khẩu đã được cập nhật.'),
  });
};

const extractRefreshToken = (state: AppState, c: Context, payload: RefreshRequest): string => {
  const token = payload.refresh_token?.trim();
  if (token) {
    return token;
  }
  const cookieToken = getCookie(c, state.refreshCookieName);
  if (!cookieToken) {
    throw AppError.unauthorized();
  }
  return cookieToken;
};

const setRefreshCookie = (state: AppState, c: Context, refreshToken: string) => {
  setCookie(c, state.refreshCookieName, refreshToken, {
    path: '/api/auth',
    httpOnly: true,
    sameSite: 'Lax',
    secure: state.refreshCookieSecure,
    maxAge: state.jwt.refreshTtlDays * 24 * 60 * 60,
  });
};

const clearRefreshCookie = (state: AppState, c: Context) => {
  deleteCookie(c, state.refreshCookieName, {
    path: '/api/auth',
  });
};

const readOptionalJson = async <T>(c: Context): Promise<T | null> => {
  const contentLength = Number(c.req.header('content-length') ?? '0');
  if (contentLength === 0) {
    return null;
  }
  try {
    return (await c.req.json()) as T;
  } catch {
    return null;
  }
};
