/**
 * Integration tests for text message persistence via Appwrite.
 *
 * Prerequisites: Appwrite running, 'ddp' project + database provisioned,
 * server API key configured.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const ENDPOINT = 'http://localhost/v1';
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

let sessionDocId = '';
const messageDocIds: string[] = [];

describe('Text message persistence integration', () => {
  beforeAll(async () => {
    // Create a game session
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          title: 'Chat Test Session',
          hostUserId: 'test-host-chat',
          status: 'active',
          maxPlayers: 4,
          textChatEnabled: true,
          voiceChatEnabled: false,
        },
      }),
    });
    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    sessionDocId = data.$id;
  });

  afterAll(async () => {
    for (const id of messageDocIds) {
      await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/text_messages/documents/${id}`, {
        method: 'DELETE', headers: serverHeaders(),
      }).catch(() => {});
    }
    if (sessionDocId) {
      await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents/${sessionDocId}`, {
        method: 'DELETE', headers: serverHeaders(),
      }).catch(() => {});
    }
  });

  it('can save a user text message', async () => {
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/text_messages/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          gameSessionId: sessionDocId,
          senderUserId: 'user-1',
          kind: 'user',
          body: 'Hello, world!',
        },
      }),
    });

    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    messageDocIds.push(data.$id);
    expect(data.gameSessionId).toBe(sessionDocId);
    expect(data.senderUserId).toBe('user-1');
    expect(data.kind).toBe('user');
    expect(data.body).toBe('Hello, world!');
  });

  it('can save a system text message', async () => {
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/text_messages/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          gameSessionId: sessionDocId,
          senderUserId: 'system',
          kind: 'system',
          body: 'Player joined the session.',
        },
      }),
    });

    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    messageDocIds.push(data.$id);
    expect(data.kind).toBe('system');
  });

  it('can save a message with senderCharacterId', async () => {
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/text_messages/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          gameSessionId: sessionDocId,
          senderUserId: 'user-1',
          senderCharacterId: 'char-42',
          kind: 'user',
          body: 'Speaking in character.',
        },
      }),
    });

    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    messageDocIds.push(data.$id);
    expect(data.senderCharacterId).toBe('char-42');
  });

  it('can retrieve a message by ID', async () => {
    expect(messageDocIds.length).toBeGreaterThan(0);

    const res = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/text_messages/documents/${messageDocIds[0]}`,
      { headers: serverHeaders() },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.body).toBe('Hello, world!');
  });

  it('can delete a message', async () => {
    const id = messageDocIds.pop()!;

    const delRes = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/text_messages/documents/${id}`,
      { method: 'DELETE', headers: serverHeaders() },
    );
    expect(delRes.status).toBe(204);

    const getRes = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/text_messages/documents/${id}`,
      { headers: serverHeaders() },
    );
    expect(getRes.status).toBe(404);
  });
});
