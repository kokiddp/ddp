# Production Deployment Guide

This guide covers deploying DDP to a production VPS. DDP is fully self-hosted — all components run in Docker with automatic TLS via Let's Encrypt.

**Only Docker is required on the server. No Node.js, no pnpm.**

---

## Architecture Overview

All services run behind Traefik on a single domain:

| Path | Service | Purpose |
|------|---------|---------|
| `/` | **Web Client** | Vue SPA (nginx) |
| `/v1/*` | **Appwrite** | Auth, persistence, file storage |
| `/v1/realtime` | **Appwrite Realtime** | WebSocket subscriptions |
| `/console` | **Appwrite Console** | Admin panel |
| `/ws/colyseus/*` | **Colyseus** | Real-time session engine (WebSocket) |
| `/api/*` | **Integration API** | Voice tokens, backend glue |

LiveKit runs on its own port (7880) for WebRTC transport.

Supporting infrastructure: MariaDB 10.11, Redis 7, Traefik 2.11 (reverse proxy + TLS).

---

## Prerequisites

- A Linux server (Ubuntu 22.04+) with at least 2 CPU cores and 4 GB RAM
- Docker Engine 24+ and Docker Compose v2
- A registered domain with DNS A record pointing to your server's IP
- Open ports: **80** (HTTP/ACME), **443** (HTTPS), **7880-7881** (LiveKit TCP), **50000-60000/UDP** (LiveKit media)

---

## Quick Deploy (2 commands)

```bash
# 1. Install Docker, clone repo, configure .env
curl -fsSL https://get.docker.com | sh
git clone <repo-url> /opt/ddp && cd /opt/ddp
cp .env.example .env
# Edit .env — see "Configure .env" section below
nano .env

# 2. Deploy everything
./setup.sh --docker
```

This starts all infrastructure + app services. Appwrite needs a one-time manual setup (see Step 3), then re-run `./setup.sh --docker` to provision the database.

---

## Step 1: Server Preparation

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect

# Open firewall ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 50000:60000/udp

# Clone the repository
git clone <repo-url> /opt/ddp
cd /opt/ddp
```

---

## Step 2: Configure `.env`

```bash
cp .env.example .env
```

Edit `.env` — replace `ddp.example.com` with your actual domain:

```env
# ── General ──
NODE_ENV=production

# ── Domain & TLS ──
_APP_DOMAIN=ddp.example.com
ACME_EMAIL=admin@example.com

# ── Appwrite ──
APPWRITE_ENDPOINT=https://ddp.example.com/v1
APPWRITE_PROJECT_ID=ddp
APPWRITE_API_KEY=                          # set after Step 3

# ── Appwrite Docker config — CHANGE THESE ──
_APP_ENV=production
_APP_OPENSSL_KEY_V1=CHANGE_ME              # openssl rand -hex 32
_APP_DB_PASS=CHANGE_ME                     # openssl rand -base64 24
MYSQL_ROOT_PASSWORD=CHANGE_ME              # openssl rand -base64 24
_APP_OPTIONS_FORCE_HTTPS=enabled

# ── LiveKit — CHANGE THESE ──
LIVEKIT_API_KEY=CHANGE_ME                  # openssl rand -hex 8
LIVEKIT_API_SECRET=CHANGE_ME               # openssl rand -hex 32
LIVEKIT_URL=wss://ddp.example.com:7880

# ── Ports ──
APPWRITE_PORT=80
APPWRITE_SSL_PORT=443
LIVEKIT_PORT=7880
COLYSEUS_PORT=2567
INTEGRATION_API_PORT=3100
WEB_PORT=4173

# ── Web Client (baked at Docker build time) ──
VITE_APPWRITE_ENDPOINT=https://ddp.example.com/v1
VITE_APPWRITE_PROJECT_ID=ddp
VITE_COLYSEUS_URL=wss://ddp.example.com/ws/colyseus
VITE_INTEGRATION_API_URL=https://ddp.example.com/api
VITE_LIVEKIT_URL=wss://ddp.example.com:7880

# ── Integration API ──
CORS_ORIGINS=https://ddp.example.com
LOG_LEVEL=info
```

Generate secure values:

```bash
openssl rand -hex 32    # _APP_OPENSSL_KEY_V1
openssl rand -base64 24 # _APP_DB_PASS, MYSQL_ROOT_PASSWORD
openssl rand -hex 8     # LIVEKIT_API_KEY
openssl rand -hex 32    # LIVEKIT_API_SECRET
```

### What `setup.sh --docker` does

1. Reads the root `.env` and generates per-service env files
2. Generates `infra/compose/livekit.yaml` with production settings (auto-detect external IP)
3. Builds Docker images for web, Colyseus, and integration API (multi-stage builds)
4. Starts all Docker containers (infra + apps) with `--profile app`
5. Waits for Appwrite to be healthy (up to 120s)
6. Provisions the database if `APPWRITE_API_KEY` is set

### What happens with TLS

When `ACME_EMAIL` is set, Traefik automatically:
- Requests a Let's Encrypt certificate for your domain via HTTP-01 challenge
- Terminates TLS on port 443
- Stores certificates in a persistent Docker volume (`letsencrypt-data`)
- Auto-renews before expiry

Port 80 must be reachable from the internet for the ACME challenge.

---

## Step 3: First Run and Appwrite Setup

```bash
cd /opt/ddp
./setup.sh --docker
```

Wait for everything to start. Then complete Appwrite's one-time setup:

1. Open **https://ddp.example.com/console** in your browser
2. Create your admin account
3. Create a project named **ddp** with project ID **ddp**
4. Add a **Web** platform with hostname **ddp.example.com**
5. Go to Settings → API Keys → Create a server key with full permissions
6. Copy the API key

Paste the key into `.env`:

```bash
nano .env
# Set: APPWRITE_API_KEY=<paste-your-key>
```

Re-run setup to provision the database:

```bash
./setup.sh --docker
```

The script is idempotent — it skips resources that already exist and only provisions what's missing.

---

## Step 4: Verify Deployment

### Health checks

```bash
# Appwrite
curl -sf https://ddp.example.com/v1/health | jq .

# Colyseus (via Traefik)
curl -sf https://ddp.example.com/ws/colyseus/health | jq .

# Integration API (via Traefik)
curl -sf https://ddp.example.com/api/health | jq .
```

### Smoke test

1. Open **https://ddp.example.com**
2. Register an account
3. Create a character
4. Create a campaign and a session (enable text and voice chat)
5. Join and start the session
6. Verify text chat works (messages persist across page reload)
7. Verify voice chat connects (check mic level indicator and device selectors)

---

## LiveKit: ICE Configuration

For voice to work, LiveKit must advertise the correct public IP.

`setup.sh` generates `infra/compose/livekit.yaml` automatically:
- **Development** (`NODE_ENV=development`): `node_ip: 127.0.0.1`, no external IP
- **Production** (`NODE_ENV=production`): `use_external_ip: true` (auto-detects public IP)

If your VPS is behind NAT and auto-detection doesn't work, manually edit `infra/compose/livekit.yaml` after running setup:

```yaml
rtc:
  use_external_ip: false
  node_ip: <your-server-public-ip>
```

Then restart LiveKit: `docker compose -f infra/compose/docker-compose.yml restart livekit`

---

## Security Checklist

- [ ] `ACME_EMAIL` is set (TLS enabled via Let's Encrypt)
- [ ] `_APP_OPTIONS_FORCE_HTTPS` set to `enabled`
- [ ] `_APP_ENV` set to `production`
- [ ] `NODE_ENV` set to `production`
- [ ] `_APP_OPENSSL_KEY_V1` is a unique random value (not the default)
- [ ] `_APP_DB_PASS` and `MYSQL_ROOT_PASSWORD` are strong and unique
- [ ] `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are unique (not `devkey`/`secret`)
- [ ] `CORS_ORIGINS` only allows your production domain
- [ ] Firewall restricts access to only necessary ports (80, 443, 7880-7881, 50000-60000/UDP)
- [ ] No `.env` files committed to version control

---

## Backup Strategy

### Appwrite data

```bash
# Database dump
docker exec ddp-mariadb mysqldump -u appwrite -p"$DB_PASS" appwrite > backup-$(date +%F).sql

# Volume backup (uploads, cache)
docker run --rm -v appwrite-uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/appwrite-uploads-$(date +%F).tar.gz -C /data .
```

### LiveKit & Colyseus

Both are stateless/ephemeral. No backup needed. Important session milestones are persisted as snapshots in Appwrite.

---

## Updating

```bash
cd /opt/ddp
git pull origin master
./setup.sh --docker   # rebuilds images, restarts containers
```

**Note:** Restarting Colyseus disconnects active sessions. Plan maintenance windows accordingly.

---

## Scaling Considerations

### Single server (MVP)

All services on one machine. Suitable for up to ~50 concurrent users.

### Resource estimates

| Service | RAM | CPU |
|---------|-----|-----|
| Appwrite + workers | ~1 GB | 1 core |
| MariaDB | ~512 MB | 0.5 core |
| Redis | ~128 MB | 0.25 core |
| Colyseus | ~256 MB | 0.5 core |
| Integration API | ~128 MB | 0.25 core |
| LiveKit | ~256 MB + ~5 MB/participant | 0.5 core |

### Horizontal scaling

| Service | Scaling approach |
|---------|-----------------|
| **Web client** | CDN or multiple static servers |
| **Appwrite** | Appwrite Cloud or self-hosted cluster |
| **Colyseus** | Multiple processes with Redis pub/sub |
| **Integration API** | Stateless — multiple instances behind LB |
| **LiveKit** | Multi-node cluster (see LiveKit docs) |

---

## Monitoring

### Logs

```bash
# All containers
docker compose -f infra/compose/docker-compose.yml --env-file infra/compose/.env logs -f

# Specific service
docker logs -f ddp-colyseus
docker logs -f ddp-integration-api
docker logs -f ddp-livekit
```

Colyseus and Integration API output structured JSON logs (NDJSON). Control verbosity with `LOG_LEVEL` in `.env` (`debug`, `info`, `warn`, `error`).

### Health monitoring

```bash
# crontab — check every 5 minutes
*/5 * * * * curl -sf https://ddp.example.com/ws/colyseus/health > /dev/null || echo "Colyseus down" | mail admin@example.com
*/5 * * * * curl -sf https://ddp.example.com/api/health > /dev/null || echo "Integration API down" | mail admin@example.com
```

---

## Troubleshooting

### TLS certificate not obtained

1. Verify DNS A record points to your server's IP: `dig ddp.example.com`
2. Verify port 80 is reachable from the internet (needed for ACME HTTP-01 challenge)
3. Check `ACME_EMAIL` is set in `.env`
4. Check Traefik logs: `docker logs ddp-traefik`
5. Verify the acme volume: `docker volume inspect infra_compose_letsencrypt-data`

### Voice chat doesn't connect

1. Verify LiveKit ports are open: `7880/tcp`, `7881/tcp`, `50000-60000/udp`
2. Check `infra/compose/livekit.yaml` — `use_external_ip: true` should work for most VPS
3. Verify LiveKit is running: `docker logs ddp-livekit`
4. Verify `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` match between `.env` and generated `livekit.yaml`

### Appwrite returns 401/403

1. Verify `APPWRITE_API_KEY` in `.env` matches Appwrite Console
2. Check that project ID is `ddp`
3. Ensure database is provisioned (re-run `./setup.sh --docker`)
4. Check Appwrite logs: `docker logs ddp-appwrite`

### CORS errors in browser

1. Set `CORS_ORIGINS` in `.env` to your production URL (e.g. `https://ddp.example.com`)
2. Re-run `./setup.sh --docker` to regenerate env files

### Colyseus/API returns 404

1. Verify the service is running: `docker ps | grep ddp-colyseus`
2. Check Traefik routing: `curl -v https://ddp.example.com/ws/colyseus/health`
3. Check container logs: `docker logs ddp-colyseus`
