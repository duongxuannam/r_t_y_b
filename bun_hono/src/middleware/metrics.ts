import type { Context, Next } from 'hono';
import { Counter, Histogram, collectDefaultMetrics, Registry } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
});

export const metricsMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  await next();
  const durationSeconds = (Date.now() - start) / 1000;
  const status = c.res?.status?.toString() ?? '200';
  const path = c.req.routePath || c.req.path;
  requestCounter.inc({ method: c.req.method, path, status });
  requestDuration.observe({ method: c.req.method, path, status }, durationSeconds);
};
