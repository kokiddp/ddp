/**
 * Integration tests for session snapshot save/load via Appwrite.
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
let snapshotDocId1 = '';
let snapshotDocId2 = '';

describe('Snapshot persistence integration', () => {
  beforeAll(async () => {
    // Create a game session to associate snapshots with
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          title: 'Snapshot Test Session',
          hostUserId: 'test-host-snap',
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
    // Clean up snapshots and session
    for (const id of [snapshotDocId1, snapshotDocId2]) {
      if (id) {
        await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/session_snapshots/documents/${id}`, {
          method: 'DELETE',
          headers: serverHeaders(),
        }).catch(() => {});
      }
    }
    if (sessionDocId) {
      await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/game_sessions/documents/${sessionDocId}`, {
        method: 'DELETE',
        headers: serverHeaders(),
      }).catch(() => {});
    }
  });

  it('can save a snapshot', async () => {
    const stateBlob = JSON.stringify({
      status: 'active',
      snapshotVersion: 1,
      players: { 'client-1': { userId: 'u1', role: 'host', ready: true } },
    });

    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/session_snapshots/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          gameSessionId: sessionDocId,
          version: 1,
          stateBlob,
          createdBy: 'test-host-snap',
        },
      }),
    });

    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    snapshotDocId1 = data.$id;
    expect(data.gameSessionId).toBe(sessionDocId);
    expect(data.version).toBe(1);
    expect(data.createdBy).toBe('test-host-snap');
  });

  it('can save a second snapshot with higher version', async () => {
    const stateBlob = JSON.stringify({
      status: 'active',
      snapshotVersion: 2,
      players: {
        'client-1': { userId: 'u1', role: 'host', ready: true },
        'client-2': { userId: 'u2', role: 'player', ready: false },
      },
    });

    const res = await fetch(`${ENDPOINT}/databases/${DATABASE}/collections/session_snapshots/documents`, {
      method: 'POST',
      headers: serverHeaders(),
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          gameSessionId: sessionDocId,
          version: 2,
          stateBlob,
          createdBy: 'test-host-snap',
        },
      }),
    });

    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    snapshotDocId2 = data.$id;
    expect(data.version).toBe(2);
  });

  it('can retrieve a snapshot by ID and parse stateBlob', async () => {
    const res = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/session_snapshots/documents/${snapshotDocId2}`,
      { headers: serverHeaders() },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.version).toBe(2);

    const blob = JSON.parse(data.stateBlob);
    expect(blob.status).toBe('active');
    expect(blob.snapshotVersion).toBe(2);
    expect(blob.players['client-2'].userId).toBe('u2');
  });

  it('can delete a snapshot', async () => {
    // Delete snapshot 1
    const delRes = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/session_snapshots/documents/${snapshotDocId1}`,
      { method: 'DELETE', headers: serverHeaders() },
    );
    expect(delRes.status).toBe(204);
    snapshotDocId1 = ''; // prevent double-delete in afterAll

    // Verify it's gone
    const getRes = await fetch(
      `${ENDPOINT}/databases/${DATABASE}/collections/session_snapshots/documents/${snapshotDocId1 || 'nonexistent'}`,
      { headers: serverHeaders() },
    );
    expect(getRes.status).toBe(404);
  });
});
