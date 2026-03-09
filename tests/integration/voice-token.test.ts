/**
 * Integration tests for voice token issuance endpoint.
 *
 * Prerequisites: Integration API running on test port, Appwrite running.
 * These tests start the integration API in a child process.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const API_PORT = 19200;
const API_URL = `http://localhost:${API_PORT}`;

const APPWRITE_ENDPOINT = 'http://localhost/v1';
const PROJECT = 'ddp';
const DATABASE = 'ddp';

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

let apiProc: ChildProcess | null = null;
let sessionDocId = '';
let playerDocId = '';
let testUserId = '';
let testUserCookie = '';
let testUserJwt = '';

const testEmail = `voice-${Date.now()}@ddp.dev`;
const testPassword = 'test-password-123';

function startApi(): Promise<ChildProcess> {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(
      'pnpm',
      ['exec', 'tsx', 'src/index.ts'],
      {
        cwd: resolve(ROOT, 'apps/integration-api'),
        stdio: 'pipe',
        env: { ...process.env, PORT: String(API_PORT) },
      },
    );

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        proc.kill();
        reject(new Error('Integration API failed to start within 15s'));
      }
    }, 15_000);

    const onData = (data: Buffer) => {
      if (!resolved && data.toString().includes('listening')) {
        resolved = true;
        clearTimeout(timeout);
        resolvePromise(proc);
      }
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);

    proc.on('error', (err) => {
      if (!resolved) { resolved = true; clearTimeout(timeout); reject(err); }
    });
    proc.on('exit', (code) => {
      if (!resolved) { resolved = true; clearTimeout(timeout); reject(new Error(`API exited with code ${code}`)); }
    });
  });
}

describe('Voice token endpoint', () => {
  beforeAll(async () => {
    // Kill any process on our test port
    const { execSync } = await import('node:child_process');
    try { execSync(`kill $(lsof -ti:${API_PORT}) 2>/dev/null`); } catch { /* nothing */ }

    // Start integration API
    apiProc = await startApi();

    // Wait for health
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) break;
      } catch { /* not ready */ }
      await new Promise((r) => setTimeout(r, 500));
    }

    // Create test user
    const regRes = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT },
      body: JSON.stringify({ userId: 'unique()', email: testEmail, password: testPassword, name: 'Voice Tester' }),
    });
    expect(regRes.status).toBe(201);
    const regData = await regRes.json();
    testUserId = regData.$id;

    // Login to get session cookie
    const loginRes = await fetch(`${APPWRITE_ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    expect(loginRes.status).toBe(201);
    const setCookie = loginRes.headers.getSetCookie?.() ?? [];
    const sessionEntry = setCookie.find((c) => c.startsWith(`a_session_${PROJECT}=`));
    testUserCookie = sessionEntry!.split(';')[0];

    // Create JWT for the user
    const jwtRes = await fetch(`${APPWRITE_ENDPOINT}/account/jwt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT,
        Cookie: testUserCookie,
      },
    });
    expect(jwtRes.status).toBe(201);
    const jwtData = await jwtRes.json();
    testUserJwt = jwtData.jwt;

    // Create a voice-enabled session
    const sessRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          title: 'Voice Test Session',
          hostUserId: testUserId,
          status: 'active',
          maxPlayers: 4,
          textChatEnabled: true,
          voiceChatEnabled: true,
        },
      }),
    });
    expect([200, 201]).toContain(sessRes.status);
    const sessData = await sessRes.json();
    sessionDocId = sessData.$id;

    // Add the user as a session member
    const playerRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE}/collections/game_players/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          gameSessionId: sessionDocId,
          userId: testUserId,
          role: 'host',
          status: 'joined',
          textChatJoined: false,
          voiceChatJoined: false,
          microphoneEnabled: false,
          speakerEnabled: true,
        },
      }),
    });
    expect([200, 201]).toContain(playerRes.status);
    const playerData = await playerRes.json();
    playerDocId = playerData.$id;
  }, 30_000);

  afterAll(async () => {
    if (apiProc) apiProc.kill();

    // Clean up test data
    if (playerDocId) {
      await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE}/collections/game_players/documents/${playerDocId}`, {
        method: 'DELETE', headers: serverHeaders(),
      }).catch(() => {});
    }
    if (sessionDocId) {
      await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents/${sessionDocId}`, {
        method: 'DELETE', headers: serverHeaders(),
      }).catch(() => {});
    }
    if (testUserCookie) {
      await fetch(`${APPWRITE_ENDPOINT}/account/sessions/current`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT, Cookie: testUserCookie },
      }).catch(() => {});
    }
  });

  it('rejects requests with missing body fields', async () => {
    const res = await fetch(`${API_URL}/voice/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid request');
  });

  it('rejects requests with invalid JWT', async () => {
    const res = await fetch(`${API_URL}/voice/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt: 'invalid-jwt-token', sessionId: sessionDocId }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid authentication');
  });

  it('rejects requests from non-members', async () => {
    // Create a different user who is NOT a member
    const otherEmail = `voice-other-${Date.now()}@ddp.dev`;
    const otherRegRes = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT },
      body: JSON.stringify({ userId: 'unique()', email: otherEmail, password: testPassword, name: 'Non-member' }),
    });
    expect(otherRegRes.status).toBe(201);

    const otherLoginRes = await fetch(`${APPWRITE_ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT },
      body: JSON.stringify({ email: otherEmail, password: testPassword }),
    });
    expect(otherLoginRes.status).toBe(201);
    const otherCookie = otherLoginRes.headers.getSetCookie?.()
      .find((c) => c.startsWith(`a_session_${PROJECT}=`))!.split(';')[0];

    const jwtRes = await fetch(`${APPWRITE_ENDPOINT}/account/jwt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT, Cookie: otherCookie },
    });
    expect(jwtRes.status).toBe(201);
    const otherJwt = (await jwtRes.json()).jwt;

    const res = await fetch(`${API_URL}/voice/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt: otherJwt, sessionId: sessionDocId }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Not a member of this session');

    // Cleanup other user session
    await fetch(`${APPWRITE_ENDPOINT}/account/sessions/current`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT, Cookie: otherCookie },
    }).catch(() => {});
  });

  it('issues a valid token for an authenticated member', async () => {
    const res = await fetch(`${API_URL}/voice/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt: testUserJwt, sessionId: sessionDocId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(typeof data.token).toBe('string');
    expect(data.token.length).toBeGreaterThan(0);
    expect(data.room).toBe(`ddp-session-${sessionDocId}`);
  });

  it('rejects token for session with voice disabled', async () => {
    // Create a session without voice
    const noVoiceRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          title: 'No Voice Session',
          hostUserId: testUserId,
          status: 'active',
          maxPlayers: 4,
          textChatEnabled: true,
          voiceChatEnabled: false,
        },
      }),
    });
    expect([200, 201]).toContain(noVoiceRes.status);
    const noVoiceData = await noVoiceRes.json();
    const noVoiceSessionId = noVoiceData.$id;

    // Add user as member
    const memberRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE}/collections/game_players/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          gameSessionId: noVoiceSessionId,
          userId: testUserId,
          role: 'host',
          status: 'joined',
          textChatJoined: false,
          voiceChatJoined: false,
          microphoneEnabled: false,
          speakerEnabled: true,
        },
      }),
    });
    expect([200, 201]).toContain(memberRes.status);
    const memberData = await memberRes.json();

    // Try to get voice token
    const res = await fetch(`${API_URL}/voice/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jwt: testUserJwt, sessionId: noVoiceSessionId }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Voice chat is not enabled for this session');

    // Clean up
    await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE}/collections/game_players/documents/${memberData.$id}`, {
      method: 'DELETE', headers: serverHeaders(),
    }).catch(() => {});
    await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents/${noVoiceSessionId}`, {
      method: 'DELETE', headers: serverHeaders(),
    }).catch(() => {});
  });
});
