# ASP.NET Todo API

This folder provides an ASP.NET Core Minimal API implementation that mirrors the Hono backend
routes in `bun_hono`. It includes health, auth, AI stub, todo CRUD, and user listing endpoints
under `/api`, plus Swagger for API docs.

## Quick start

```bash
dotnet restore
DOTNET_ENVIRONMENT=Development dotnet run
```

Swagger UI is available at `http://localhost:5000/swagger` by default.
