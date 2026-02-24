import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export const loadEnv = () => {
  const envMode = process.env.APP_ENV ?? 'development';
  const envFilename = envMode === 'production' ? '.env.production' : '.env.develop';
  const manifestEnv = path.resolve(process.cwd(), envFilename);
  let envPath = fs.existsSync(manifestEnv) ? manifestEnv : path.resolve(envFilename);

  if (!fs.existsSync(envPath) && envMode !== 'production') {
    const fallbackManifest = path.resolve(process.cwd(), '.env');
    envPath = fs.existsSync(fallbackManifest) ? fallbackManifest : path.resolve('.env');
  }

  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      loadEnvFallback(envPath);
    }
  } else {
    dotenv.config();
  }
};

const loadEnvFallback = (envPath: string) => {
  const contents = fs.readFileSync(envPath, 'utf-8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const [key, ...rest] = trimmed.split('=');
    if (!key || rest.length === 0) {
      continue;
    }
    if (process.env[key] === undefined) {
      process.env[key] = rest.join('=').trim();
    }
  }
};
