# Health Check Endpoints

All DDP services expose health check endpoints for monitoring and orchestration.

## Services

### Colyseus Server

| Property | Value |
|----------|-------|
| URL | `GET /health` |
| Default port | `2567` |
| Response | `{ "status": "ok", "service": "ddp-colyseus-server" }` |

### Integration API

| Property | Value |
|----------|-------|
| URL | `GET /health` |
| Default port | `3100` |
| Response | `{ "status": "ok", "service": "ddp-integration-api" }` |

### Appwrite

| Property | Value |
|----------|-------|
| URL | `GET /v1/health` |
| Default port | `80` (behind Traefik) |
| Auth | Requires `X-Appwrite-Project` and `X-Appwrite-Key` headers |
| Response | `{ "status": "pass" }` |

Additional Appwrite health endpoints:
- `GET /v1/health/db` -- database connectivity
- `GET /v1/health/cache` -- cache connectivity
- `GET /v1/health/queue` -- queue status

### LiveKit

| Property | Value |
|----------|-------|
| URL | TCP connectivity check on port `7880` |
| Default port | `7880` |
| Notes | LiveKit does not expose a standard HTTP health endpoint |

## Usage

### Manual check

```bash
# Colyseus
curl http://localhost:2567/health

# Integration API
curl http://localhost:3100/health

# Appwrite (requires API key)
curl http://localhost/v1/health \
  -H "X-Appwrite-Project: ddp" \
  -H "X-Appwrite-Key: $APPWRITE_API_KEY"
```

### Docker Compose healthcheck

Health checks can be added to `docker-compose.yml` service definitions:

```yaml
services:
  colyseus:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:2567/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  integration-api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### Startup verification

The integration test suite (`tests/integration/services.test.ts`) validates that both the Colyseus server and integration API start up and respond to health checks.

## Response Codes

| Code | Meaning |
|------|---------|
| `200` | Service is healthy and ready to accept traffic |
| `5xx` | Service is unhealthy or not yet ready |
| Connection refused | Service is not running |

## Logging

Both server apps use structured JSON logging (NDJSON format). Set `LOG_LEVEL` environment variable to control verbosity:

| Level | Description |
|-------|-------------|
| `debug` | Verbose debugging output |
| `info` | Normal operation (default) |
| `warn` | Warning conditions |
| `error` | Error conditions |

Example log entry:
```json
{"level":"info","msg":"Colyseus server listening","service":"colyseus-server","ts":"2024-01-15T10:30:00.000Z","port":2567}
```
