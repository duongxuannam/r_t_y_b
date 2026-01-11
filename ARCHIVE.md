# Project archive: Rust Todo API + Front-End

This document captures the project intent, architecture, and operational details so a future session can understand and resume work quickly.

## Purpose
Rust (Axum) API with JWT auth and a React/Vite front-end for managing todos. The server also serves the built front-end from `front-end/dist` and exposes Swagger docs.

## Tech stack
- Backend: Rust, Axum, SQLx (PostgreSQL), Tower HTTP middleware, JWT auth, Utoipa/Swagger docs.
- Front-end: React + Vite, Tailwind CSS, shadcn/ui components.

## Repository layout
- `src/`
  - `main.rs`: server boot, middleware, routing, OpenAPI registration, static file serving.
  - `state.rs`: env config loading (JWT, SMTP, rate limit, CORS, cookie settings).
  - `controllers/`: HTTP handlers (auth, todos, docs, health) and request extractors.
  - `services/`: business logic (auth, todo, email).
  - `models/`: request/response DTOs and domain structures.
  - `error.rs`: error responses and mapping.
- `migrations/`: SQLx migrations for PostgreSQL schema.
- `front-end/`: Vite React app (uses Tailwind + shadcn/ui).
- `tests/`: integration tests (if any).

## Runtime flow (backend)
1. `main.rs` loads `.env` or `.env.production` (based on `APP_ENV`) and initializes tracing.
2. Connects to Postgres via `DATABASE_URL` and runs migrations.
3. Builds `AppState` from env vars (JWT, SMTP, CORS, rate limits, cookies).
4. Registers middleware: CORS, request IDs, tracing, Prometheus metrics, rate limiting.
5. Sets up `/api` routes for auth, todos, docs, health/metrics; serves `front-end/dist` for other paths.

## API surface
All routes are under `/api`.

**Auth**
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot`
- `POST /auth/reset`

**Todos** (JWT required)
- `GET /todos`
- `POST /todos`
- `GET /todos/{id}`
- `PUT /todos/{id}`
- `DELETE /todos/{id}`

**Ops**
- `GET /health`
- `GET /metrics`
- `GET /docs` (Swagger UI)

## Key configuration (env vars)
Required:
- `DATABASE_URL`
- `JWT_SECRET` (min 32 chars)
- `SMTP_HOST`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `PASSWORD_RESET_URL_BASE`

Optional (defaults in parentheses):
- `ACCESS_TOKEN_TTL_MIN` (15)
- `REFRESH_TOKEN_TTL_DAYS` (7)
- `SMTP_PORT` (587)
- `SMTP_FROM_NAME` ("Todo App")
- `PASSWORD_RESET_TTL_MIN` (30)
- `ALLOWED_ORIGINS` ("http://localhost:3000,http://localhost:5173")
- `RATE_LIMIT_PER_SECOND` (5)
- `RATE_LIMIT_BURST` (10)
- `REFRESH_COOKIE_NAME` ("todo_refresh")
- `REFRESH_COOKIE_SECURE` (true in production, else false)
- `APP_ENV` ("development"; use "production" to load `.env.production`)
- `BIND_ADDR` ("127.0.0.1:3000")

## Development workflow
Backend:
```bash
cargo run
```
Swagger: http://127.0.0.1:3000/docs

Front-end:
```bash
cd front-end
npm install
npm run dev
```

## Deployment notes
- Production should run behind a reverse proxy that terminates TLS.
- Rate limiting and real client IP depend on `X-Forwarded-For`/`X-Forwarded-Proto` headers.
- Static assets are served from `front-end/dist` by the Rust server.

## Where to look next
- Auth behavior: `src/services/auth_service.rs` + `src/controllers/auth_controller.rs`.
- Todo CRUD: `src/services/todo_service.rs` + `src/controllers/todo_controller.rs`.
- Email delivery: `src/services/email_service.rs` (SMTP).
- Schema and migrations: `migrations/`.
