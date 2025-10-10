#!/usr/bin/env bash

# Run the Docker stack locally exactly as in deployment.
# Usage:
#   ./deploy/run-compose-local.sh
#   COMPOSE_FILE=other-compose.yml ./deploy/run-compose-local.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to run the container stack locally." >&2
  exit 1
fi

echo "==> Using compose file: ${COMPOSE_FILE}"

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker compose"
fi

cd "$ROOT_DIR"

echo "==> Stopping existing stack (if any)"
$COMPOSE_CMD -f "$COMPOSE_FILE" down || true

echo "==> Starting stack locally"
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d --build

echo "==> Stack is running. View logs with:"
echo "    $COMPOSE_CMD -f ${COMPOSE_FILE} logs -f chore-chart"

