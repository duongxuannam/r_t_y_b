# Rust Todo API Monorepo

Axum + PostgreSQL todo API with JWT auth, paired with a React front-end.

## Requirements
- Rust toolchain
- PostgreSQL
- Bun (latest)

## Setup
1) Create a database (example uses `todo_api`).
2) Copy `back-end/.env.example` to `back-end/.env` and update values (Docker Compose exposes Postgres on `5433`).
3) Ensure `JWT_SECRET` is at least 32 characters. Adjust `ALLOWED_ORIGINS`, `RATE_LIMIT_PER_SECOND`, and `RATE_LIMIT_BURST` as needed.
   - Optional: configure local AI by setting `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_TIMEOUT_SECONDS`.
4) Run the stack:

```bash
bun install
bun run dev
```

`bun install` also runs `prepare` to install git hooks (`core.hooksPath=.githooks`).
The pre-commit hook formats Rust code in `back-end` via `cargo fmt`.
If needed, reinstall hooks manually:

```bash
bun run hooks:install
```

Or run each side directly:

```bash
cd back-end
cargo run
```

```bash
cd front-end
bun install
bun run dev
```

## Bun + Hono backend (TypeScript)
This repo also includes a Bun + Hono implementation of the backend in `bun_hono`.

```bash
cd bun_hono
bun install
bun run dev
```

The API surface mirrors the Rust backend (auth, todos, users, AI, metrics, and docs) and
uses the same database schema and environment variables.

## .NET folder scaffold
Đã thêm thư mục `dotnet/` với cấu trúc phân tầng theo chức năng (Api/Application/Domain/Infrastructure/Shared) để tránh dồn logic vào một file duy nhất. Xem chi tiết tại `dotnet/README.md`.

## Swagger
Open http://127.0.0.1:3000/docs

## Auth flow
- `POST /auth/register`
- `POST /auth/login`
- Use the `access_token` as `Authorization: Bearer <token>`
- `POST /auth/refresh` with a refresh token to get new tokens
- `POST /auth/logout` to revoke a refresh token
- `POST /auth/forgot` to send a reset token email
- `POST /auth/reset` to set a new password using the reset token

## Local AI (Ollama)
- `POST /ai/generate` with `{ "prompt": "..." }` to generate a response using the configured Ollama model.

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

## VPS deployment (Docker Compose + GHCR)
This repo includes a sample Compose file for VPS deployments that expects an `IMAGE_REF`
variable pointing to the immutable image tag (commit SHA). Copy it to your server and
adjust paths as needed:

```bash
mkdir -p /opt/todo-api
cp deploy/docker-compose.vps.yml /opt/todo-api/docker-compose.yml
cp back-end/.env.example /opt/todo-api/.env
```

The GitHub Actions workflow deploys by setting `IMAGE_REF` in `/opt/todo-api/.env` and
running `docker compose pull` + `up -d`. Ensure your VPS has Docker + Compose installed
and that the `.env` file includes required variables (database, JWT, SMTP, etc.).

For a full Vietnamese guide (deploy VPS, backup data, rollback version), see
`deploy/DEPLOY_GUIDE.md`.

## CI keywords
- Add `[run-ci]` to a commit message (or PR title/body) to run the main CI workflow.
- Add `[run-ci-vps]` to a commit message to run the VPS deploy workflow.

## Example
```bash
curl -X POST http://127.0.0.1:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'
```
