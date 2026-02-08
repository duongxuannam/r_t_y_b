import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import path from 'node:path';
import fs from 'node:fs';
import { loadEnv } from './config/env';
import { createDb } from './config/db';
import { createState } from './config/state';
import { errorMiddleware } from './middleware/error';
import { requestId } from './middleware/requestId';
import { metricsMiddleware, registry } from './middleware/metrics';
import { rateLimit } from './middleware/rateLimit';
import { requireAuth } from './middleware/auth';
import { aiGenerate } from './controllers/aiController';
import {
  forgotHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetHandler,
} from './controllers/authController';
import { healthCheck } from './controllers/healthController';
import {
  createTodoHandler,
  deleteTodoHandler,
  getTodoHandler,
  listTodosHandler,
  reorderTodosHandler,
  updateTodoHandler,
} from './controllers/todoController';
import { listUsersHandler } from './controllers/userController';
import { openApiSpec, scalarUi, swaggerUi } from './controllers/docsController';

loadEnv();

const db = createDb();
const state = createState(db);

const app = new Hono();

app.use('*', errorMiddleware);
app.use('*', requestId);
app.use('*', metricsMiddleware);
app.use('*', rateLimit(state));
app.use(
  '*',
  cors({
    origin: (origin) => {
      const envMode = process.env.APP_ENV ?? 'development';
      if (envMode !== 'production') {
        return origin;
      }
      if (!origin) {
        return '';
      }
      const match = state.corsAllowedOrigins.some((allowed) => allowed.value === origin);
      return match ? origin : '';
    },
    credentials: true,
    allowHeaders: ['Accept', 'Accept-Language', 'Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

const api = new Hono();

api.get('/health', healthCheck);
api.get('/metrics', async (c) => {
  c.header('Content-Type', registry.contentType);
  return c.body(await registry.metrics());
});

api.post('/ai/generate', aiGenerate(state));

api.post('/auth/register', registerHandler(state));
api.post('/auth/login', loginHandler(state));
api.post('/auth/refresh', refreshHandler(state));
api.post('/auth/logout', logoutHandler(state));
api.post('/auth/forgot', forgotHandler(state));
api.post('/auth/reset', resetHandler(state));

api.get('/todos', requireAuth(state), listTodosHandler(state));
api.post('/todos', requireAuth(state), createTodoHandler(state));
api.put('/todos/reorder-items', requireAuth(state), reorderTodosHandler(state));
api.get('/todos/:id', requireAuth(state), getTodoHandler(state));
api.put('/todos/:id', requireAuth(state), updateTodoHandler(state));
api.delete('/todos/:id', requireAuth(state), deleteTodoHandler(state));

api.get('/users', requireAuth(state), listUsersHandler(state));

app.route('/api', api);

app.get('/api/docs/scalar', scalarUi);
app.get('/api/docs', swaggerUi);
app.get('/api-doc/openapi.json', openApiSpec);

const staticDir = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.resolve(process.cwd(), 'dist');
const indexFile = path.join(staticDir, 'index.html');

if (fs.existsSync(staticDir)) {
  app.use('/*', serveStatic({ root: staticDir }));
}

app.notFound((c) => {
  if (fs.existsSync(indexFile)) {
    return c.html(fs.readFileSync(indexFile, 'utf-8'));
  }
  return c.json({ message: 'not found' }, 404);
});

const bindAddress = process.env.PORT
  ? { hostname: '0.0.0.0', port: Number(process.env.PORT) }
  : parseBindAddr(process.env.BIND_ADDR ?? '127.0.0.1:3000');

console.log(`listening on ${bindAddress.hostname}:${bindAddress.port}`);

Bun.serve({
  hostname: bindAddress.hostname,
  port: bindAddress.port,
  fetch: app.fetch,
});

function parseBindAddr(input: string) {
  const [host, portRaw] = input.split(':');
  const port = Number(portRaw ?? '3000');
  if (!host || Number.isNaN(port)) {
    return { hostname: '127.0.0.1', port: 3000 };
  }
  return { hostname: host, port };
}
