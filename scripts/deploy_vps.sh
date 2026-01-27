#!/usr/bin/env bash
set -euo pipefail

IMAGE_REF="${1:?Usage: deploy_vps.sh <image-ref> [app-dir]}"
APP_DIR="${2:-/opt/todo-api}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.vps.yml"
ENV_FILE="${APP_DIR}/.env"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Missing ${COMPOSE_FILE}. Ensure deploy/docker-compose.vps.yml exists on the server."
  exit 1
fi

# Update IMAGE_REF without clobbering other environment variables.
touch "${ENV_FILE}"
if grep -q '^IMAGE_REF=' "${ENV_FILE}"; then
  sed -i "s|^IMAGE_REF=.*|IMAGE_REF=${IMAGE_REF}|" "${ENV_FILE}"
else
  echo "IMAGE_REF=${IMAGE_REF}" >> "${ENV_FILE}"
fi

docker compose -f "${COMPOSE_FILE}" pull
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
