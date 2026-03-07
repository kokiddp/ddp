/**
 * Integration tests for DDP local infrastructure.
 *
 * Prerequisites: docker compose stack must be running
 *   infra/scripts/dev-up.sh
 *
 * These tests verify that all dockerized services are reachable
 * and correctly configured for local development.
 */
import { describe, it, expect } from 'vitest';

const APPWRITE_ENDPOINT = 'http://localhost/v1';
const LIVEKIT_URL = 'http://localhost:7880';
const APPWRITE_PROJECT = 'ddp';

describe('Infrastructure health checks', () => {
  it('Appwrite API is reachable', async () => {
    const res = await fetch(`${APPWRITE_ENDPOINT}/health`, {
      headers: { 'X-Appwrite-Project': 'console' },
    });
    // 401 is expected without auth — means API is up
    expect([200, 401]).toContain(res.status);
  });

  it('Appwrite console is served at /console', async () => {
    const res = await fetch('http://localhost/console/', { redirect: 'manual' });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<!doctype html');
  });

  it('Appwrite realtime endpoint exists', async () => {
    const res = await fetch('http://localhost/v1/realtime');
    // 400 or 426 expected (not a WebSocket upgrade) — means endpoint is routed
    expect([400, 426]).toContain(res.status);
  });

  it('LiveKit server is reachable', async () => {
    const res = await fetch(LIVEKIT_URL);
    expect(res.status).toBe(200);
  });

  it('Appwrite DDP project exists and is accessible', async () => {
    // Trying to hit the project health endpoint with the project header
    const res = await fetch(`${APPWRITE_ENDPOINT}/health`, {
      headers: { 'X-Appwrite-Project': APPWRITE_PROJECT },
    });
    // 401 = project exists but no auth; 200 = unlikely without key
    expect([200, 401]).toContain(res.status);
  });
});
