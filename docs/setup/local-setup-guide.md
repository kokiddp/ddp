# Local Setup Guide

This guide walks through setting up the DDP development environment from scratch.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Recommended via [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | 10+ | `npm install -g pnpm` |
| Docker | 20+ | With Docker Compose v2 |
| Git | 2.30+ | |

### Verify prerequisites

```bash
node --version    # v20.x.x
pnpm --version    # 10.x.x
docker --version  # Docker version 20+
docker compose version
```

## Quick start (single command)

If you just want to get running fast:

```bash
git clone <repo-url>
cd ddp
cp .env.example .env
# (optional) edit .env to set APPWRITE_API_KEY if you already have one
./setup.sh
pnpm dev
```

This handles everything: dependencies, Docker infra, database provisioning, and env file generation. See below for the step-by-step breakdown.

### Fully containerised (no local Node.js)

```bash
cp .env.example .env
./setup.sh --docker
```

All services (web, Colyseus, integration API) run in Docker alongside the infrastructure. Useful for testing production-like builds.

---

## Step-by-step guide

### Step 1: Clone and install

```bash
git clone <repo-url>
cd ddp
pnpm install
```

## Step 2: Start infrastructure

The project uses Docker Compose for local infrastructure (Appwrite, LiveKit, MariaDB, Redis, Traefik).

```bash
# Start all Docker services
infra/scripts/dev-up.sh
```

Wait for all containers to be healthy. You can check with:

```bash
docker compose -f infra/compose/docker-compose.yml ps
```

### First-time Appwrite setup

1. Open the Appwrite Console at **http://localhost/console**
2. Create your admin account
3. Create a project named **ddp** with project ID **ddp**
4. Add a **Web** platform with hostname **localhost**
5. Create a server API key with full permissions

### Provision the database

```bash
infra/scripts/provision-db.sh
```

This creates the `ddp` database with all required collections:
- `characters`
- `campaigns`
- `game_sessions`
- `game_players`
- `text_messages`
- `session_snapshots`
- `rules_profiles`

## Step 3: Configure environment variables

DDP uses a **single root `.env`** file. The `setup.sh` script (or manual steps) generates per-service `.env` files from it.

```bash
cp .env.example .env
```

Edit `.env` and set `APPWRITE_API_KEY` to the key you created in the Appwrite Console. All other defaults work out of the box for local development.

### Root `.env` reference

```env
# ── App / Shared ──
NODE_ENV=development
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=ddp
APPWRITE_API_KEY=              # paste your key here

# ── Docker infrastructure ──
_APP_ENV=development
_APP_OPENSSL_KEY_V1=ddp-dev-openssl-key-change-in-prod
_APP_DB_PASS=password
MYSQL_ROOT_PASSWORD=rootpassword
_APP_OPTIONS_FORCE_HTTPS=disabled

# ── LiveKit ──
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880

# ── Ports ──
APPWRITE_PORT=80
APPWRITE_SSL_PORT=443
LIVEKIT_PORT=7880
COLYSEUS_PORT=2567
INTEGRATION_API_PORT=3100
WEB_PORT=5173

# ── Web client (Vite) ──
VITE_APPWRITE_ENDPOINT=http://localhost/v1
VITE_APPWRITE_PROJECT_ID=ddp
VITE_COLYSEUS_URL=ws://localhost:2567
VITE_INTEGRATION_API_URL=http://localhost:3100
VITE_LIVEKIT_URL=ws://localhost:7880

# ── Integration API ──
CORS_ORIGINS=http://localhost:4173,http://localhost:5173
LOG_LEVEL=info
```

The `setup.sh` script reads this file and generates:
- `infra/compose/.env` — Docker Compose variables
- `apps/web/.env` — Vite build-time variables
- `apps/colyseus-server/.env` — Colyseus runtime config
- `apps/integration-api/.env` — Integration API runtime config

> **Manual alternative:** If you prefer not to use `setup.sh`, you can still create per-service `.env` files by hand — see each app's `.env.example`.

## Step 4: Start development servers

```bash
# Start all services concurrently
pnpm dev
```

Or start each service individually:

```bash
# Terminal 1: Web client
cd apps/web && pnpm dev

# Terminal 2: Colyseus server
cd apps/colyseus-server && pnpm dev

# Terminal 3: Integration API
cd apps/integration-api && pnpm dev
```

## Step 5: Verify everything works

### Service health checks

| Service | URL | Expected |
|---------|-----|----------|
| Web client | http://localhost:5173 | Vue app loads |
| Appwrite Console | http://localhost/console | Admin panel |
| Appwrite API | http://localhost/v1/health | `{"status":"pass"}` |
| Colyseus | http://localhost:2567/health | `{"status":"ok","service":"ddp-colyseus-server"}` |
| Integration API | http://localhost:3100/health | `{"status":"ok","service":"ddp-integration-api"}` |

### Quick smoke test

1. Open http://localhost:5173
2. Register a new account
3. Create a character
4. Create a campaign, note the campaign name
5. Create a session (enable text and voice chat, associate with campaign)
6. Join the session lobby
7. Start the session
8. Verify the play view loads with:
   - Campaign name in the header
   - Chat panel showing character names (hover for tooltip with user name and ID)
   - Voice controls (Join Voice button)
9. Join voice chat and verify:
   - Input/output device selectors appear
   - Mic level indicator shows bars when speaking
   - Participant list shows character names (not user IDs)
   - Active speaker names glow green when speaking
10. Open a second browser/incognito window, register another account, join the same session
11. Send text messages between both clients — verify messages persist after page reload

## Running tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm vitest run tests/unit/

# Integration tests only (requires running Docker stack)
pnpm vitest run tests/integration/

# Watch mode
pnpm vitest
```

## Common tasks

### Rebuild shared packages

If you modify `packages/shared-types/`, rebuild before typechecking the web app:

```bash
cd packages/shared-types && npx tsc --build
```

### Reset infrastructure

```bash
# Stop services
infra/scripts/dev-down.sh

# Full reset (removes volumes - you'll lose all data)
infra/scripts/dev-reset.sh
```

### Lint and format

```bash
pnpm lint
pnpm format
```

## Troubleshooting

### "Failed to connect" on session play page

The Colyseus server must be running on port 2567. Start it with:
```bash
cd apps/colyseus-server && pnpm dev
```

### "refId not found" errors in browser console

This indicates a Colyseus schema version mismatch. Ensure `colyseus.js` in `apps/web` is v0.15.x (matches the server's `@colyseus/schema` v2). Run `pnpm install` to sync.

### Voice token errors (ERR_CONNECTION_REFUSED on :3100)

The integration API must be running on port 3100:
```bash
cd apps/integration-api && pnpm dev
```

### Appwrite returns 401/403

- Check that your API key is correct in the `.env` files
- Verify the project ID is `ddp`
- Ensure the database is provisioned (`infra/scripts/provision-db.sh`)

### Port conflicts

If a port is already in use, find and kill the process:
```bash
lsof -i :2567   # Find process on Colyseus port
kill <PID>
```

### nvm not found

Source nvm before running commands:
```bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use v20
```
