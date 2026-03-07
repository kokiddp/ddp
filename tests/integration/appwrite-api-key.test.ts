/**
 * Integration tests for server-side Appwrite API key access.
 *
 * Validates that the server API key can access health and user data,
 * simulating what the Colyseus server and integration API would do.
 */
import { describe, it, expect } from 'vitest';

const ENDPOINT = 'http://localhost/v1';
const PROJECT = 'ddp';

// Read API key from colyseus-server .env
const API_KEY = await (async () => {
  const fs = await import('node:fs');
  const envContent = fs.readFileSync(
    new URL('../../apps/colyseus-server/.env', import.meta.url),
    'utf-8',
  );
  const match = envContent.match(/APPWRITE_API_KEY=(.+)/);
  return match?.[1] ?? '';
})();

const serverHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': API_KEY,
});

describe('Appwrite server API key access', () => {
  it('API key is configured', () => {
    expect(API_KEY).toBeTruthy();
    expect(API_KEY.startsWith('standard_')).toBe(true);
  });

  it('can access health endpoint with API key', async () => {
    const res = await fetch(`${ENDPOINT}/health`, {
      headers: serverHeaders(),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('pass');
  });

  it('can list users with API key', async () => {
    const res = await fetch(`${ENDPOINT}/users`, {
      headers: serverHeaders(),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(data.users).toBeInstanceOf(Array);
  });

  it('can access database health with API key', async () => {
    const res = await fetch(`${ENDPOINT}/health/db`, {
      headers: serverHeaders(),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.statuses).toBeInstanceOf(Array);
    expect(data.statuses.length).toBeGreaterThan(0);
    expect(data.statuses.every((s: { status: string }) => s.status === 'pass')).toBe(true);
  });
});
