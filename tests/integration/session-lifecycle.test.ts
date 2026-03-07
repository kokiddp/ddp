/**
 * Integration tests for session creation, player join/leave, and lobby flow.
 *
 * Prerequisites: Appwrite running, 'ddp' project + database provisioned,
 * server API key configured.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const ENDPOINT = 'http://localhost/v1';
const PROJECT = 'ddp';
const DATABASE = 'ddp';

// Read API key
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

const userHeaders = (cookie: string) => ({
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT,
  Cookie: cookie,
});

// Test state
let hostUserId = '';
let hostCookie = '';
let sessionDocId = '';
let playerDocId = '';

const hostEmail = `host-${Date.now()}@ddp.dev`;
const hostPassword = 'test-password-123';

describe('Session lifecycle integration', () => {
  beforeAll(async () => {
    // Create a test user
    const regRes = await fetch(`${ENDPOINT}/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT },
      body: JSON.stringify({
        userId: 'unique()',
        email: hostEmail,
        password: hostPassword,
        name: 'Test Host',
      }),
    });
    expect(regRes.status).toBe(201);
    const regData = await regRes.json();
    hostUserId = regData.$id;

    // Login
    const loginRes = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT },
      body: JSON.stringify({ email: hostEmail, password: hostPassword }),
    });
    expect(loginRes.status).toBe(201);
    const setCookie = loginRes.headers.getSetCookie?.() ?? [];
    const sessionEntry = setCookie.find((c) => c.startsWith(`a_session_${PROJECT}=`));
    hostCookie = sessionEntry!.split(';')[0];
  });

  afterAll(async () => {
    // Clean up: delete session doc and player doc via server API
    if (playerDocId) {
      await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/game_players/documents/${playerDocId}`, {
        method: 'DELETE',
        headers: serverHeaders(),
      }).catch(() => {});
    }
    if (sessionDocId) {
      await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents/${sessionDocId}`, {
        method: 'DELETE',
        headers: serverHeaders(),
      }).catch(() => {});
    }
    if (hostCookie) {
      await fetch(`${ENDPOINT}/account/sessions/current`, {
        method: 'DELETE',
        headers: userHeaders(hostCookie),
      }).catch(() => {});
    }
  });

  it('can create a game session', async () => {
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          title: 'Integration Test Session',
          hostUserId,
          status: 'draft',
          maxPlayers: 6,
          textChatEnabled: true,
          voiceChatEnabled: false,
        },
      }),
    });

    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    sessionDocId = data.$id;
    expect(data.title).toBe('Integration Test Session');
    expect(data.hostUserId).toBe(hostUserId);
    expect(data.status).toBe('draft');
    expect(data.maxPlayers).toBe(6);
    expect(data.textChatEnabled).toBe(true);
    expect(data.voiceChatEnabled).toBe(false);
  });

  it('can retrieve the session by ID', async () => {
    expect(sessionDocId).toBeTruthy();

    const res = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents/${sessionDocId}`,
      { headers: serverHeaders() },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.$id).toBe(sessionDocId);
    expect(data.title).toBe('Integration Test Session');
  });

  it('can add a player to the session', async () => {
    expect(sessionDocId).toBeTruthy();

    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/game_players/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          gameSessionId: sessionDocId,
          userId: hostUserId,
          role: 'host',
          status: 'joined',
          textChatJoined: false,
          voiceChatJoined: false,
          microphoneEnabled: false,
          speakerEnabled: true,
        },
      }),
    });

    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    playerDocId = data.$id;
    expect(data.gameSessionId).toBe(sessionDocId);
    expect(data.userId).toBe(hostUserId);
    expect(data.role).toBe('host');
    expect(data.status).toBe('joined');
  });

  it('can list players and find the one for this session', async () => {
    expect(sessionDocId).toBeTruthy();
    expect(playerDocId).toBeTruthy();

    const res = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/game_players/documents/${playerDocId}`,
      { headers: serverHeaders() },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.gameSessionId).toBe(sessionDocId);
    expect(data.userId).toBe(hostUserId);
  });

  it('can update session status to open', async () => {
    expect(sessionDocId).toBeTruthy();

    const res = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents/${sessionDocId}`,
      {
        method: 'PATCH',
        headers: serverHeaders(),
        body: JSON.stringify({ data: { status: 'open' } }),
      },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('open');
  });

  it('can update player status to ready', async () => {
    expect(playerDocId).toBeTruthy();

    const res = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/game_players/documents/${playerDocId}`,
      {
        method: 'PATCH',
        headers: serverHeaders(),
        body: JSON.stringify({ data: { status: 'ready' } }),
      },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ready');
  });

  it('can update player to left status (leave lobby)', async () => {
    expect(playerDocId).toBeTruthy();

    const res = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/game_players/documents/${playerDocId}`,
      {
        method: 'PATCH',
        headers: serverHeaders(),
        body: JSON.stringify({ data: { status: 'left' } }),
      },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('left');
  });
});
