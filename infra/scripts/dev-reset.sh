#!/usr/bin/env bash
# Stop DDP infrastructure and remove all volumes (full reset)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$SCRIPT_DIR/../compose"

echo "WARNING: This will destroy all local Appwrite data and LiveKit state."
read -p "Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

docker compose -f "$COMPOSE_DIR/docker-compose.yml" --env-file "$COMPOSE_DIR/.env" down -v

echo "All volumes removed. Run 'infra/scripts/dev-up.sh' to start fresh."
