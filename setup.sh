#!/usr/bin/env bash
# ============================================================================
# DDP — One-command project setup
# ============================================================================
# Usage:  ./setup.sh              (local dev — infra in Docker, apps via pnpm)
#         ./setup.sh --docker     (fully containerised — everything in Docker)
#
# Local dev prerequisites: Node.js 20+, pnpm 10+, Docker, Docker Compose v2
# Docker-only prerequisites: Docker, Docker Compose v2 (no Node.js required)
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
  _APP_OPTIONS_FORCE_HTTPS _APP_DOMAIN \
  APPWRITE_PORT APPWRITE_SSL_PORT LIVEKIT_PORT \
  LIVEKIT_API_KEY LIVEKIT_API_SECRET \
  NODE_ENV APPWRITE_ENDPOINT APPWRITE_PROJECT_ID APPWRITE_API_KEY \
  COLYSEUS_PORT INTEGRATION_API_PORT WEB_PORT CORS_ORIGINS LOG_LEVEL \
  ACME_EMAIL

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

# ── 3. Generate LiveKit config ────────────────────────────────────────────
step "Generating LiveKit configuration"
LK_KEY="${LIVEKIT_API_KEY:-devkey}"
LK_SECRET="${LIVEKIT_API_SECRET:-secret}"
LK_DEV_FLAG=""

# In development mode, use --dev flag and localhost IP
if [ "${NODE_ENV:-development}" = "development" ]; then
  LK_DEV_FLAG=" --dev"
  cat > "$COMPOSE_DIR/livekit.yaml" <<LKEOF
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: false
  node_ip: 127.0.0.1
keys:
  ${LK_KEY}: ${LK_SECRET}
logging:
  level: info
LKEOF
else
  cat > "$COMPOSE_DIR/livekit.yaml" <<LKEOF
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  ${LK_KEY}: ${LK_SECRET}
logging:
  level: info
LKEOF
fi
green "  → infra/compose/livekit.yaml ($([ "${NODE_ENV:-development}" = "development" ] && echo "dev" || echo "production"))"

# ── 4. Install dependencies (local dev only) ─────────────────────────────
if $DOCKER_MODE; then
  step "Skipping local dependency install (Docker mode)"
else
  step "Installing dependencies"
  cd "$ROOT"
  pnpm install
fi

# ── 5. Start Docker infrastructure ─────────────────────────────────────────
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

# ── 6. Wait for Appwrite to be ready ───────────────────────────────────────
step "Waiting for Appwrite to be ready"
HEALTH_URL="http://localhost:${APPWRITE_PORT:-80}/v1/health"
for i in $(seq 1 60); do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    green "Appwrite is healthy"
    break
  fi
  if [ "$i" -eq 60 ]; then
    red "Appwrite did not become healthy in time (120s)."
    red "Check: docker compose -f $COMPOSE_DIR/docker-compose.yml logs appwrite"
    exit 1
  fi
  sleep 2
done

# ── 7. Provision database (idempotent) ─────────────────────────────────────
if [ -n "${APPWRITE_API_KEY:-}" ]; then
  step "Provisioning database"
  bash "$ROOT/infra/scripts/provision-db.sh"
  green "Database provisioned"
else
  yellow "Skipping DB provisioning — APPWRITE_API_KEY not set."
  yellow "Set it in .env after creating the key in the Appwrite Console, then re-run:"
  yellow "  ./setup.sh$(if $DOCKER_MODE; then echo ' --docker'; fi)"
fi

# ── 8. Build shared packages (local dev only) ─────────────────────────────
if $DOCKER_MODE; then
  step "Skipping local shared package build (Docker mode)"
else
  step "Building shared packages"
  pnpm --filter @ddp/shared-types run build
  pnpm --filter @ddp/shared-rules run build
  green "Shared packages built"
fi

# ── Done ────────────────────────────────────────────────────────────────────
echo ""
green "============================================"
green "  DDP setup complete!"
green "============================================"
echo ""

DOMAIN="${_APP_DOMAIN:-localhost}"
SCHEME="http"
WS_SCHEME="ws"
if [ "${_APP_OPTIONS_FORCE_HTTPS:-disabled}" = "enabled" ]; then
  SCHEME="https"
  WS_SCHEME="wss"
fi

if $DOCKER_MODE; then
  echo "All services are running in Docker."
  echo ""
  if [ "$DOMAIN" != "localhost" ]; then
    echo "  Web client:        ${SCHEME}://${DOMAIN}"
    echo "  Appwrite Console:  ${SCHEME}://${DOMAIN}/console"
    echo "  Colyseus:          ${WS_SCHEME}://${DOMAIN}/ws/colyseus"
    echo "  Integration API:   ${SCHEME}://${DOMAIN}/api"
    echo "  LiveKit:           ${WS_SCHEME}://${DOMAIN}:${LIVEKIT_PORT:-7880}"
  else
    echo "  Web client:        http://localhost:${WEB_PORT:-4173}"
    echo "  Appwrite Console:  http://localhost:${APPWRITE_PORT:-80}/console"
    echo "  Colyseus:          ws://localhost:${COLYSEUS_PORT:-2567}"
    echo "  Integration API:   http://localhost:${INTEGRATION_API_PORT:-3100}"
    echo "  LiveKit:           ws://localhost:${LIVEKIT_PORT:-7880}"
  fi
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
  yellow "then re-run:  ./setup.sh$(if $DOCKER_MODE; then echo ' --docker'; fi)"
fi
