# Rust Todo API

Axum + PostgreSQL todo API with JWT auth and Swagger docs.

## Requirements
- Rust toolchain
- PostgreSQL

## Setup
1) Create a database (example uses `todo_api`).
2) Copy `.env.example` to `.env` and update values (Docker Compose exposes Postgres on `5433`).
3) Run the server:

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

## Example
```bash
curl -X POST http://127.0.0.1:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}'
```
