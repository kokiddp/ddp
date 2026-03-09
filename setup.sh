#!/usr/bin/env bash
# ============================================================================
# DDP — One-command project setup
# ============================================================================
# Usage:  ./setup.sh              (local dev — infra in Docker, apps via pnpm)
#         ./setup.sh --docker     (fully containerised — everything in Docker)
#
# Prerequisites: Node.js 20+, pnpm 10+, Docker, Docker Compose v2
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$ROOT/infra/compose"
ENV_FILE="$ROOT/.env"

DOCKER_MODE=false
if [[ "${1:-}" == "--docker" ]]; then
  DOCKER_MODE=true
fi

# ── Colour helpers ──────────────────────────────────────────────────────────
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
step()   { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

# ── 1. Ensure .env exists ──────────────────────────────────────────────────
step "Checking environment configuration"
if [ ! -f "$ENV_FILE" ]; then
  cp "$ROOT/.env.example" "$ENV_FILE"
  yellow "Created .env from .env.example"
  yellow "Edit .env to set APPWRITE_API_KEY after Appwrite first-time setup."
else
  green ".env already exists"
fi

# Source the root .env for variable access
set -a
source "$ENV_FILE"
set +a

# ── 2. Generate per-service .env files ─────────────────────────────────────
step "Generating per-service .env files"

generate_env() {
  local target="$1"
  shift
  local dir
  dir="$(dirname "$target")"
  mkdir -p "$dir"
  : > "$target"
  for var in "$@"; do
    local val="${!var:-}"
    echo "${var}=${val}" >> "$target"
  done
  green "  → $target"
}

# Compose .env (Docker infra)
generate_env "$COMPOSE_DIR/.env" \
  _APP_ENV _APP_OPENSSL_KEY_V1 _APP_DB_PASS MYSQL_ROOT_PASSWORD \
  _APP_OPTIONS_FORCE_HTTPS \
  APPWRITE_PORT APPWRITE_SSL_PORT LIVEKIT_PORT \
  LIVEKIT_API_KEY LIVEKIT_API_SECRET \
  NODE_ENV APPWRITE_ENDPOINT APPWRITE_PROJECT_ID APPWRITE_API_KEY \
  COLYSEUS_PORT INTEGRATION_API_PORT WEB_PORT CORS_ORIGINS LOG_LEVEL

# Web client
generate_env "$ROOT/apps/web/.env" \
  VITE_APPWRITE_ENDPOINT VITE_APPWRITE_PROJECT_ID \
  VITE_COLYSEUS_URL VITE_INTEGRATION_API_URL VITE_LIVEKIT_URL

# Colyseus server
cat > "$ROOT/apps/colyseus-server/.env" <<EOF
PORT=${COLYSEUS_PORT:-2567}
NODE_ENV=${NODE_ENV:-development}
APPWRITE_ENDPOINT=${APPWRITE_ENDPOINT:-http://localhost/v1}
APPWRITE_PROJECT_ID=${APPWRITE_PROJECT_ID:-ddp}
APPWRITE_API_KEY=${APPWRITE_API_KEY:-}
EOF
green "  → apps/colyseus-server/.env"

# Integration API
cat > "$ROOT/apps/integration-api/.env" <<EOF
PORT=${INTEGRATION_API_PORT:-3100}
NODE_ENV=${NODE_ENV:-development}
APPWRITE_ENDPOINT=${APPWRITE_ENDPOINT:-http://localhost/v1}
APPWRITE_PROJECT_ID=${APPWRITE_PROJECT_ID:-ddp}
APPWRITE_API_KEY=${APPWRITE_API_KEY:-}
LIVEKIT_API_KEY=${LIVEKIT_API_KEY:-devkey}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET:-secret}
LIVEKIT_URL=${LIVEKIT_URL:-ws://localhost:7880}
CORS_ORIGINS=${CORS_ORIGINS:-http://localhost:4173,http://localhost:5173}
EOF
green "  → apps/integration-api/.env"

# ── 3. Install dependencies ────────────────────────────────────────────────
step "Installing dependencies"
cd "$ROOT"
pnpm install

# ── 4. Start Docker infrastructure ─────────────────────────────────────────
step "Starting Docker infrastructure"
if $DOCKER_MODE; then
  docker compose -f "$COMPOSE_DIR/docker-compose.yml" \
    --env-file "$COMPOSE_DIR/.env" \
    --profile app \
    up -d --build
else
  docker compose -f "$COMPOSE_DIR/docker-compose.yml" \
    --env-file "$COMPOSE_DIR/.env" \
    up -d
fi

# ── 5. Wait for Appwrite to be ready ───────────────────────────────────────
step "Waiting for Appwrite to be ready"
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${APPWRITE_PORT:-80}/v1/health" > /dev/null 2>&1; then
    green "Appwrite is healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    red "Appwrite did not become healthy in time."
    red "Check: docker compose -f $COMPOSE_DIR/docker-compose.yml logs appwrite"
    exit 1
  fi
  sleep 2
done

# ── 6. Provision database (idempotent) ─────────────────────────────────────
if [ -n "${APPWRITE_API_KEY:-}" ]; then
  step "Provisioning database"
  bash "$ROOT/infra/scripts/provision-db.sh"
  green "Database provisioned"
else
  yellow "Skipping DB provisioning — APPWRITE_API_KEY not set."
  yellow "Set it in .env after creating the key in the Appwrite Console, then re-run setup.sh."
fi

# ── 7. Build shared packages ───────────────────────────────────────────────
step "Building shared packages"
pnpm --filter @ddp/shared-types run build
pnpm --filter @ddp/shared-rules run build
green "Shared packages built"

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
green "============================================"
green "  DDP setup complete!"
green "============================================"
echo ""
if $DOCKER_MODE; then
  echo "All services are running in Docker."
  echo ""
  echo "  Web client:        http://localhost:${WEB_PORT:-4173}"
  echo "  Appwrite Console:  http://localhost:${APPWRITE_PORT:-80}/console"
  echo "  Colyseus:          ws://localhost:${COLYSEUS_PORT:-2567}"
  echo "  Integration API:   http://localhost:${INTEGRATION_API_PORT:-3100}"
  echo "  LiveKit:           ws://localhost:${LIVEKIT_PORT:-7880}"
else
  echo "Docker infrastructure is running. Start the dev servers with:"
  echo ""
  echo "  pnpm dev"
  echo ""
  echo "  Web client:        http://localhost:${WEB_PORT:-5173}"
  echo "  Appwrite Console:  http://localhost:${APPWRITE_PORT:-80}/console"
  echo "  Colyseus:          ws://localhost:${COLYSEUS_PORT:-2567}"
  echo "  Integration API:   http://localhost:${INTEGRATION_API_PORT:-3100}"
  echo "  LiveKit:           ws://localhost:${LIVEKIT_PORT:-7880}"
fi
echo ""
if [ -z "${APPWRITE_API_KEY:-}" ]; then
  yellow "NEXT STEP: Create a project 'ddp' in Appwrite Console,"
  yellow "create an API key, paste it into .env as APPWRITE_API_KEY,"
  yellow "then re-run:  ./setup.sh"
fi
