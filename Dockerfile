FROM rust:1.88-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations

RUN cargo build --release

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN useradd -r -u 10001 appuser

COPY --from=builder /app/target/release/todo_api /app/todo_api
COPY --from=builder /app/migrations /app/migrations
COPY dist /app/dist

ENV BIND_ADDR=0.0.0.0:3000

USER appuser

EXPOSE 3000

CMD ["/app/todo_api"]
