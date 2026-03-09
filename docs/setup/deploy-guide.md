# Production Deployment Guide

This guide covers deploying DDP to a production or staging environment. DDP is designed to be self-hosted — all components run on infrastructure you control.

---

## Architecture Overview

A production DDP deployment consists of five services:

| Service | Purpose | Port (default) |
|---------|---------|----------------|
| **Appwrite** | Auth, persistence, file storage | 80/443 |
| **Colyseus Server** | Real-time session engine | 2567 |
| **Integration API** | Voice token issuance, backend glue | 3100 |
| **LiveKit** | WebRTC voice chat | 7880, 7881, 50000-60000/UDP |
| **Web Client** | Vue SPA (static files) | 443 (behind reverse proxy) |

Supporting infrastructure:
- **MariaDB 10.11** — Appwrite database
- **Redis 7** — Appwrite cache and pub/sub
- **Traefik 2.11** (or nginx) — Reverse proxy and TLS termination

---

## Prerequisites

- A Linux server (Ubuntu 22.04+ recommended) with at least 2 CPU cores and 4 GB RAM
- Docker Engine 24+ and Docker Compose v2
- A registered domain name with DNS configured
- TLS certificates (Let's Encrypt recommended)
- Open ports: 80, 443, 2567, 3100, 7880, 7881, 50000-60000/UDP

---

## Step 1: Server Preparation

```bash
# Install Docker (if not already installed)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt-get install docker-compose-plugin

# Clone the repository
git clone <repo-url> /opt/ddp
cd /opt/ddp
```

---

## Step 2: Configure Environment Variables

DDP uses a **single root `.env`** file. The `setup.sh` script generates all per-service env files from it.

```bash
cp .env.example .env
```

Edit `.env` for production:

```env
# ── App / Shared ──
NODE_ENV=production
APPWRITE_ENDPOINT=https://your-domain.com/v1
APPWRITE_PROJECT_ID=ddp
APPWRITE_API_KEY=<your-appwrite-api-key>

# ── Docker infrastructure ──
_APP_ENV=production
_APP_OPENSSL_KEY_V1=<generate-a-random-64-char-string>
_APP_DB_PASS=<strong-database-password>
MYSQL_ROOT_PASSWORD=<strong-root-password>
_APP_OPTIONS_FORCE_HTTPS=enabled

# ── LiveKit ──
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
LIVEKIT_URL=wss://your-domain.com:7880

# ── Ports ──
APPWRITE_PORT=80
APPWRITE_SSL_PORT=443
LIVEKIT_PORT=7880
COLYSEUS_PORT=2567
INTEGRATION_API_PORT=3100
WEB_PORT=4173

# ── Web client (Vite) ──
VITE_APPWRITE_ENDPOINT=https://your-domain.com/v1
VITE_APPWRITE_PROJECT_ID=ddp
VITE_COLYSEUS_URL=wss://your-domain.com:2567
VITE_INTEGRATION_API_URL=https://your-domain.com:3100
VITE_LIVEKIT_URL=wss://your-domain.com:7880

# ── Integration API ──
CORS_ORIGINS=https://your-domain.com
LOG_LEVEL=info
```

Generate secure values:

```bash
# OpenSSL key
openssl rand -hex 32

# Database passwords
openssl rand -base64 24

# LiveKit API key
openssl rand -hex 8

# LiveKit API secret
openssl rand -hex 32
```

---

## Step 3: Configure LiveKit for Production

Edit `infra/compose/livekit.yaml`:

```yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
keys:
  <your-livekit-api-key>: <your-livekit-api-secret>
logging:
  level: info
```

Generate LiveKit credentials:

```bash
# API key (short identifier)
openssl rand -hex 8

# API secret (long secret)
openssl rand -hex 32
```

### Important: ICE Configuration

For voice to work, LiveKit must advertise the correct public IP for WebRTC ICE candidates.

**Option A — Auto-detect (recommended for single-server):**
```yaml
rtc:
  use_external_ip: true
```

**Option B — Explicit IP (for VPS behind NAT):**
```yaml
rtc:
  use_external_ip: false
  node_ip: <your-server-public-ip>
```

**Option C — Behind a TURN server:**
If clients are behind restrictive firewalls, configure a TURN server and add it to the LiveKit config. See [LiveKit TURN docs](https://docs.livekit.io/realtime/self-hosting/deploy/#turn).

### Firewall Rules

LiveKit requires these ports open:

| Port | Protocol | Purpose |
|------|----------|---------|
| 7880 | TCP | WebSocket signaling |
| 7881 | TCP | ICE/TCP fallback |
| 50000-60000 | UDP | WebRTC media transport |

```bash
# UFW example
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 50000:60000/udp
```

---

## Step 4: Configure TLS

### Option A: Traefik with Let's Encrypt (recommended)

Update the Traefik configuration in `docker-compose.yml` to enable ACME:

```yaml
traefik:
  command:
    - --entrypoints.appwrite_websecure.address=:443
    - --certificatesresolvers.letsencrypt.acme.email=admin@your-domain.com
    - --certificatesresolvers.letsencrypt.acme.storage=/acme.json
    - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=appwrite_web
```

### Option B: External reverse proxy (nginx)

If using nginx in front of all services:

```nginx
# Appwrite
server {
    listen 443 ssl;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for Appwrite Realtime
    location /v1/realtime {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Colyseus
server {
    listen 443 ssl;
    server_name colyseus.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:2567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Integration API
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# LiveKit (WSS)
server {
    listen 443 ssl;
    server_name livekit.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Step 5: Build and Deploy Application Services

### Option A: Fully containerised (recommended)

The simplest approach — all services run in Docker alongside the infrastructure:

```bash
cd /opt/ddp
./setup.sh --docker
```

This single command:
1. Generates per-service `.env` files from the root `.env`
2. Installs pnpm dependencies
3. Builds Docker images for web, Colyseus, and integration API
4. Starts all Docker containers (infra + apps)
5. Waits for Appwrite to be healthy
6. Provisions the database (if `APPWRITE_API_KEY` is set)

The Dockerfiles use multi-stage builds for small production images:
- `apps/web/Dockerfile` — builds the Vue SPA, serves via nginx
- `apps/colyseus-server/Dockerfile` — builds and runs with Node.js
- `apps/integration-api/Dockerfile` — builds and runs with Node.js

### Option B: Manual build with process manager

If you prefer to run Node.js services outside Docker:

```bash
cd /opt/ddp

# Run setup (infra-only, no --docker flag)
./setup.sh

# Or manually:
pnpm install
pnpm --filter @ddp/shared-types run build
pnpm --filter @ddp/shared-rules run build
pnpm --filter web run build
pnpm --filter colyseus-server run build
pnpm --filter integration-api run build
```

#### With pm2

```bash
npm install -g pm2

# Colyseus server
cd /opt/ddp/apps/colyseus-server
pm2 start dist/index.js --name ddp-colyseus

# Integration API
cd /opt/ddp/apps/integration-api
pm2 start dist/index.js --name ddp-integration-api

# Save and enable startup
pm2 save
pm2 startup
```

Serve `apps/web/dist/` with nginx or another static file server.

#### With systemd

Create `/etc/systemd/system/ddp-colyseus.service`:

```ini
[Unit]
Description=DDP Colyseus Server
After=network.target

[Service]
Type=simple
User=ddp
WorkingDirectory=/opt/ddp/apps/colyseus-server
EnvironmentFile=/opt/ddp/apps/colyseus-server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/ddp-integration-api.service`:

```ini
[Unit]
Description=DDP Integration API
After=network.target

[Service]
Type=simple
User=ddp
WorkingDirectory=/opt/ddp/apps/integration-api
EnvironmentFile=/opt/ddp/apps/integration-api/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable ddp-colyseus ddp-integration-api
sudo systemctl start ddp-colyseus ddp-integration-api
```

---

## Step 6: Start Infrastructure (if not using `setup.sh --docker`)

If you used `setup.sh --docker` in Step 5, skip to Step 7 — the infrastructure is already running.

For manual infra setup:

```bash
cd /opt/ddp

# IMPORTANT: Remove --dev flag from LiveKit command in docker-compose.yml for production
# Edit livekit service: command: --config /etc/livekit.yaml
# (remove the --dev flag)

# Start infrastructure
docker compose -f infra/compose/docker-compose.yml --env-file infra/compose/.env up -d
```

Wait for all containers to be healthy:

```bash
docker compose -f infra/compose/docker-compose.yml ps
```

---

## Step 7: Appwrite First-Time Setup

1. Open the Appwrite Console at `https://your-domain.com/console`
2. Create your admin account
3. Create a project named **ddp** with project ID **ddp**
4. Add a **Web** platform with your production domain
5. Create a server API key with full permissions
6. Paste the API key into the root `.env` as `APPWRITE_API_KEY`
7. Re-run `./setup.sh --docker` to regenerate env files and provision the database

### Manual database provisioning

If you prefer not to re-run setup:

```bash
cd /opt/ddp
infra/scripts/provision-db.sh
```

The script reads `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, and `APPWRITE_API_KEY` from the environment or `.env` files.

---

## Step 8: Verify Deployment

### Health checks

```bash
# Appwrite
curl -s https://your-domain.com/v1/health \
  -H "X-Appwrite-Project: ddp" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY" | jq .

# Colyseus
curl -s https://your-domain.com:2567/health | jq .

# Integration API
curl -s https://your-domain.com:3100/health | jq .
```

### Smoke test

1. Open `https://your-domain.com` (or wherever the web client is served)
2. Register an account
3. Create a character
4. Create a session with text and voice enabled
5. Join and start the session
6. Verify text chat works (messages persist across page reload)
7. Verify voice chat connects (check mic level indicator and device selectors)

---

## Security Checklist

- [ ] All services behind TLS (HTTPS/WSS)
- [ ] `_APP_OPTIONS_FORCE_HTTPS` set to `enabled` in Appwrite env
- [ ] `_APP_ENV` set to `production`
- [ ] `_APP_OPENSSL_KEY_V1` is a unique random value
- [ ] Database password is strong and unique
- [ ] LiveKit API key and secret are unique (not `devkey`/`secret`)
- [ ] Appwrite API keys are scoped appropriately
- [ ] `CORS_ORIGINS` in integration API only allows your production domain(s)
- [ ] `NODE_ENV=production` set for Colyseus and integration API
- [ ] Firewall restricts access to only necessary ports
- [ ] No `.env` files committed to version control
- [ ] LiveKit `--dev` flag removed from Docker Compose command

---

## Backup Strategy

### Appwrite data

Appwrite stores data in MariaDB and uploads in Docker volumes. Back up both:

```bash
# Database dump
docker exec ddp-mariadb mysqldump -u appwrite -p$DB_PASS appwrite > backup-$(date +%F).sql

# Volume backup (uploads, cache)
docker run --rm -v appwrite-uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/appwrite-uploads-$(date +%F).tar.gz -C /data .
```

### LiveKit

LiveKit is stateless — rooms are ephemeral. No backup needed.

### Application state

Colyseus room state is in-memory and ephemeral. Important session milestones are persisted as snapshots in Appwrite. Ensure Appwrite backups are current.

---

## Scaling Considerations

### Single server (MVP)

All services on one machine. Suitable for small groups (up to ~50 concurrent users).

### Horizontal scaling

| Service | Scaling approach |
|---------|-----------------|
| **Web client** | CDN or multiple static servers |
| **Appwrite** | Appwrite Cloud or self-hosted cluster (see Appwrite docs) |
| **Colyseus** | Multiple Colyseus processes with Redis pub/sub for room discovery |
| **Integration API** | Stateless — run multiple instances behind a load balancer |
| **LiveKit** | Multi-node LiveKit cluster (see LiveKit docs) |

### Resource estimates (single server)

| Service | RAM | CPU |
|---------|-----|-----|
| Appwrite + workers | ~1 GB | 1 core |
| MariaDB | ~512 MB | 0.5 core |
| Redis | ~128 MB | 0.25 core |
| Colyseus | ~256 MB | 0.5 core |
| Integration API | ~128 MB | 0.25 core |
| LiveKit | ~256 MB + ~5 MB/participant | 0.5 core |

---

## Monitoring

### Log aggregation

Both Colyseus and Integration API output structured JSON logs (NDJSON). Pipe to your preferred log aggregator:

```bash
# Example: journalctl for systemd services
journalctl -u ddp-colyseus -f --output cat | jq .

# Example: Docker logs for containerized services
docker logs -f ddp-livekit
```

Set `LOG_LEVEL` in `.env` files:
- `debug` — verbose (development only)
- `info` — normal operation (default)
- `warn` — warnings only
- `error` — errors only

### Health monitoring

Set up periodic health checks with your monitoring tool:

```bash
# crontab example — check every 5 minutes
*/5 * * * * curl -sf http://localhost:2567/health > /dev/null || echo "Colyseus down" | mail admin@your-domain.com
*/5 * * * * curl -sf http://localhost:3100/health > /dev/null || echo "Integration API down" | mail admin@your-domain.com
```

---

## Updating

### Containerised deployment (`setup.sh --docker`)

```bash
cd /opt/ddp
git pull origin master
./setup.sh --docker   # rebuilds images, restarts containers
```

### Manual deployment

```bash
cd /opt/ddp
git pull origin master
pnpm install

# Rebuild shared packages
pnpm --filter @ddp/shared-types run build
pnpm --filter @ddp/shared-rules run build

# Rebuild application services
pnpm --filter web run build
pnpm --filter colyseus-server run build
pnpm --filter integration-api run build

# Restart Node.js services
pm2 restart ddp-colyseus ddp-integration-api
# or: sudo systemctl restart ddp-colyseus ddp-integration-api

# Update Docker infrastructure if needed
docker compose -f infra/compose/docker-compose.yml --env-file infra/compose/.env up -d --pull always
```

**Note:** Restarting Colyseus will disconnect all active sessions. Plan maintenance windows accordingly. Session state for in-progress games will be lost unless a snapshot was persisted.

---

## Troubleshooting

### Voice chat doesn't connect

1. Verify LiveKit ports are open: `7880/tcp`, `7881/tcp`, `50000-60000/udp`
2. Check LiveKit ICE config: `use_external_ip: true` or `node_ip: <public-ip>`
3. Verify LiveKit is running: `docker logs ddp-livekit`
4. Check browser console for WebSocket errors (wrong URL or TLS issues)
5. Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` match between LiveKit config and integration API

### Appwrite returns 401/403

1. Verify `APPWRITE_API_KEY` in the root `.env` matches Appwrite Console
2. Check that project ID is `ddp`
3. Ensure database is provisioned: `infra/scripts/provision-db.sh`
4. Check Appwrite logs: `docker logs ddp-appwrite`

### Chat messages not persisting

1. Check Colyseus server logs for Appwrite errors
2. Verify `APPWRITE_API_KEY` is set (not empty) in root `.env`
3. Re-run `./setup.sh --docker` to regenerate per-service env files

### CORS errors in browser

1. Set `CORS_ORIGINS` in root `.env` to include your production domain
2. Re-run `./setup.sh --docker` or restart the integration API after changing env vars
3. Verify the `Origin` header in browser dev tools matches the allowed origins

### Colyseus WebSocket connection fails

1. If behind a reverse proxy, ensure WebSocket upgrade headers are forwarded
2. Check that port 2567 is accessible from the client
3. Verify `VITE_COLYSEUS_URL` uses `wss://` for production (not `ws://`)
