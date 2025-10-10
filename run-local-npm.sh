#!/usr/bin/env bash

# Simple helper to run the chore-chart server locally.
# Installs dependencies if needed and then launches the app.
#
# Usage:
#   ./run-local.sh
#   PORT=3000 ./run-local.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to run this project locally. Please install Node.js/npm." >&2
  exit 1
fi

cd "$ROOT_DIR"

if [[ ! -d node_modules ]]; then
  echo "==> Installing dependencies"
  npm install
fi

PORT="${PORT:-53123}"
echo "==> Starting chore-chart on http://localhost:${PORT}"
PORT="$PORT" npm start
