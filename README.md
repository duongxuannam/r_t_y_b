# Rust Todo API

Axum + PostgreSQL todo API with JWT auth and Swagger docs.

## Requirements
- Rust toolchain
- PostgreSQL

## Setup
1) Create a database (example uses `todo_api`).
2) Copy `.env.example` to `.env` and update values (Docker Compose exposes Postgres on `5433`).
3) Ensure `JWT_SECRET` is at least 32 characters. Adjust `ALLOWED_ORIGINS`, `RATE_LIMIT_PER_SECOND`, and `RATE_LIMIT_BURST` as needed.
4) Run the server:

```bash
cargo run
```

## Swagger
Open http://127.0.0.1:3000/docs

## Auth flow
- `POST /auth/register`
- `POST /auth/login`
- Use the `access_token` as `Authorization: Bearer <token>`
- `POST /auth/refresh` with a refresh token to get new tokens
- `POST /auth/logout` to revoke a refresh token

## Observability & Ops
- Metrics: `GET /metrics` (Prometheus format).
- Tracing: request IDs are attached to logs; headers are propagated via `X-Request-Id`.
- Rate limiting: configurable per-second with burst via env vars.
- CORS: restricted to the comma-separated `ALLOWED_ORIGINS`.

## Production HTTPS
- Run behind a reverse proxy (e.g., Nginx, Traefik, Envoy) that terminates TLS and forwards `X-Forwarded-For`/`X-Forwarded-Proto`. The rate limiter uses the real client IP when those headers are set.
- Example Nginx snippet:
```
location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:3000;
}
```

## Example
```bash
curl -X POST http://127.0.0.1:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'
```
