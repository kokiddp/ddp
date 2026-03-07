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

## Step 1: Clone and install

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

Each service needs a `.env` file. Copy from the examples:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/colyseus-server/.env.example apps/colyseus-server/.env
cp apps/integration-api/.env.example apps/integration-api/.env
```

Update the `APPWRITE_API_KEY` in both server `.env` files with the key you created in the Appwrite Console.

### Environment variable reference

#### apps/web/.env
```
VITE_APPWRITE_ENDPOINT=http://localhost/v1
VITE_APPWRITE_PROJECT_ID=ddp
VITE_COLYSEUS_URL=ws://localhost:2567
VITE_INTEGRATION_API_URL=http://localhost:3100
VITE_LIVEKIT_URL=ws://localhost:7880
```

#### apps/colyseus-server/.env
```
PORT=2567
NODE_ENV=development
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=ddp
APPWRITE_API_KEY=<your-api-key>
```

#### apps/integration-api/.env
```
PORT=3100
NODE_ENV=development
APPWRITE_ENDPOINT=http://localhost/v1
APPWRITE_PROJECT_ID=ddp
APPWRITE_API_KEY=<your-api-key>
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

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
4. Create a session (enable text and voice chat)
5. Join the session lobby
6. Start the session
7. Verify the play view loads with chat panel and voice controls

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
