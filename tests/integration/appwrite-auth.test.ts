/**
 * Integration tests for Appwrite auth flows against the local DDP project.
 *
 * Prerequisites: docker compose stack running, 'ddp' project created,
 * localhost web platform added.
 */
import { describe, it, expect, afterAll } from 'vitest';

const ENDPOINT = 'http://localhost/v1';
const PROJECT = 'ddp';

const headers = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT,
  ...extra,
});

const testUser = {
  email: `test-${Date.now()}@ddp.dev`,
  password: 'integration-test-password-123',
  name: 'Integration Test User',
};

let sessionCookie = '';

describe('Appwrite auth integration', () => {
  afterAll(async () => {
    // Clean up: delete session if we have one
    if (sessionCookie) {
      await fetch(`${ENDPOINT}/account/sessions/current`, {
        method: 'DELETE',
        headers: headers({ Cookie: sessionCookie }),
      }).catch(() => {});
    }
  });

  it('can register a new user', async () => {
    const res = await fetch(`${ENDPOINT}/account`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        userId: 'unique()',
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe(testUser.email);
    expect(data.name).toBe(testUser.name);
    expect(data.status).toBe(true);
    expect(data.$id).toBeTruthy();
  });

  it('can create a session (login)', async () => {
    const res = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.provider).toBe('email');
    expect(data.userId).toBeTruthy();

    // Extract session cookie
    const setCookie = res.headers.getSetCookie?.() ?? [];
    const sessionEntry = setCookie.find((c) => c.startsWith(`a_session_${PROJECT}=`));
    expect(sessionEntry).toBeTruthy();
    sessionCookie = sessionEntry!.split(';')[0];
  });

  it('can get current user with session', async () => {
    expect(sessionCookie).toBeTruthy();

    const res = await fetch(`${ENDPOINT}/account`, {
      headers: headers({ Cookie: sessionCookie }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe(testUser.email);
    expect(data.name).toBe(testUser.name);
  });

  it('rejects unauthenticated access to account', async () => {
    const res = await fetch(`${ENDPOINT}/account`, {
      headers: headers(),
    });

    expect(res.status).toBe(401);
  });

  it('can delete session (logout)', async () => {
    expect(sessionCookie).toBeTruthy();

    const res = await fetch(`${ENDPOINT}/account/sessions/current`, {
      method: 'DELETE',
      headers: headers({ Cookie: sessionCookie }),
    });

    expect(res.status).toBe(204);

    // Verify session is gone
    const verify = await fetch(`${ENDPOINT}/account`, {
      headers: headers({ Cookie: sessionCookie }),
    });
    expect(verify.status).toBe(401);

    sessionCookie = '';
  });

  it('rejects login with wrong password', async () => {
    const res = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email: testUser.email,
        password: 'wrong-password',
      }),
    });

    expect(res.status).toBe(401);
  });
});
