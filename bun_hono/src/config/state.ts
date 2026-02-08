import type { HeaderValue } from './types';

export interface JwtConfig {
  secret: string;
  accessTtlMinutes: number;
  refreshTtlDays: number;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  resetUrlBase: string;
  resetTtlMinutes: number;
}

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  timeoutSeconds: number;
}

export interface AppState {
  db: import('postgres').Sql;
  jwt: JwtConfig;
  email: EmailConfig;
  ollama: OllamaConfig;
  corsAllowedOrigins: HeaderValue[];
  rateLimitPerSecond: number;
  rateLimitBurst: number;
  refreshCookieName: string;
  refreshCookieSecure: boolean;
}

export const createState = (db: import('postgres').Sql): AppState => {
  const jwtSecret = requireEnv('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  const accessTtlMinutes = parsePositiveInt('ACCESS_TOKEN_TTL_MIN', process.env.ACCESS_TOKEN_TTL_MIN, 15);
  const refreshTtlDays = parsePositiveInt('REFRESH_TOKEN_TTL_DAYS', process.env.REFRESH_TOKEN_TTL_DAYS, 7);

  const email: EmailConfig = {
    smtpHost: requireEnv('SMTP_HOST'),
    smtpPort: parsePositiveInt('SMTP_PORT', process.env.SMTP_PORT, 587),
    smtpUsername: requireEnv('SMTP_USERNAME'),
    smtpPassword: requireEnv('SMTP_PASSWORD'),
    fromEmail: requireEnv('SMTP_FROM'),
    fromName: process.env.SMTP_FROM_NAME ?? 'Todo App',
    resetUrlBase: requireEnv('PASSWORD_RESET_URL_BASE'),
    resetTtlMinutes: parsePositiveInt('PASSWORD_RESET_TTL_MIN', process.env.PASSWORD_RESET_TTL_MIN, 30),
  };

  const ollama: OllamaConfig = {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_MODEL ?? 'llama3.1',
    timeoutSeconds: parsePositiveInt('OLLAMA_TIMEOUT_SECONDS', process.env.OLLAMA_TIMEOUT_SECONDS, 60),
  };

  const corsAllowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS, [
    'http://localhost:3000',
    'http://localhost:5173',
  ]);

  const rateLimitPerSecond = parsePositiveInt('RATE_LIMIT_PER_SECOND', process.env.RATE_LIMIT_PER_SECOND, 20);
  const rateLimitBurst = parsePositiveInt('RATE_LIMIT_BURST', process.env.RATE_LIMIT_BURST, 40);

  const refreshCookieName = process.env.REFRESH_COOKIE_NAME ?? 'todo_refresh';
  const envMode = process.env.APP_ENV ?? 'development';
  const refreshCookieSecure = parseBoolean('REFRESH_COOKIE_SECURE', process.env.REFRESH_COOKIE_SECURE, envMode === 'production');

  return {
    db,
    jwt: {
      secret: jwtSecret,
      accessTtlMinutes,
      refreshTtlDays,
    },
    email,
    ollama,
    corsAllowedOrigins,
    rateLimitPerSecond,
    rateLimitBurst,
    refreshCookieName,
    refreshCookieSecure,
  };
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const parsePositiveInt = (name: string, raw: string | undefined, fallback: number): number => {
  const value = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

const parseAllowedOrigins = (raw: string | undefined, defaults: string[]): HeaderValue[] => {
  const entries = raw
    ? raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : defaults;

  if (entries.length === 0) {
    throw new Error('At least one allowed origin must be provided');
  }

  return entries.map((origin) => ({ value: origin }));
};

const parseBoolean = (name: string, raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  const normalized = raw.toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }
  throw new Error(`${name} must be a boolean`);
};
