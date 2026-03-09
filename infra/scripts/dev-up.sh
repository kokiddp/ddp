#!/usr/bin/env bash
# Start DDP local development infrastructure
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_DIR="$SCRIPT_DIR/../compose"

# Use root .env as source of truth if it exists
if [ -f "$ROOT/.env" ]; then
  cp "$ROOT/.env" "$COMPOSE_DIR/.env"
elif [ ! -f "$COMPOSE_DIR/.env" ]; then
  echo "Creating compose .env from .env.example..."
  cp "$COMPOSE_DIR/.env.example" "$COMPOSE_DIR/.env"
fi

echo "Starting DDP infrastructure..."
docker compose -f "$COMPOSE_DIR/docker-compose.yml" --env-file "$COMPOSE_DIR/.env" up -d

echo ""
echo "Services:"
echo "  Appwrite Console:  http://localhost/console"
echo "  Appwrite API:      http://localhost/v1"
echo "  Appwrite Realtime: ws://localhost/v1/realtime"
echo "  LiveKit:           ws://localhost:7880"
echo ""
echo "Run 'pnpm dev' to start the application dev servers."
echo "Run 'infra/scripts/dev-down.sh' to stop."
