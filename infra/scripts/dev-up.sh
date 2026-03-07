#!/usr/bin/env bash
# Start DDP local development infrastructure
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$SCRIPT_DIR/../compose"

if [ ! -f "$COMPOSE_DIR/.env" ]; then
  echo "Creating .env from .env.example..."
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
echo "Run 'infra/scripts/dev-down.sh' to stop."
