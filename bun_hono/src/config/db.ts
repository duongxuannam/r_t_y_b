import postgres from 'postgres';

export const resolveDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const envMode = process.env.APP_ENV ?? 'development';
  if (envMode === 'production') {
    throw new Error('DATABASE_URL must be set in production.');
  }
  return 'postgres://postgres:postgres@localhost:5433/todo_api';
};

export const createDb = () => {
  const url = resolveDatabaseUrl();
  return postgres(url, { max: 5 });
};
