#!/usr/bin/env bash
set -euo pipefail

IMAGE_REF="${1:?Usage: deploy_vps.sh <image-ref> [app-dir]}"
APP_DIR="${2:-/opt/todo-api}"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
ENV_FILE="${APP_DIR}/.env"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Missing ${COMPOSE_FILE}. Ensure docker-compose.yml exists on the server."
  exit 1
fi

echo "IMAGE_REF=${IMAGE_REF}" > "${ENV_FILE}"

docker compose -f "${COMPOSE_FILE}" pull
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
