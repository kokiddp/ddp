/**
 * Integration tests for the Appwrite database schema.
 *
 * Validates that the DDP database and all collections exist with expected attributes.
 */
import { describe, it, expect } from 'vitest';

const ENDPOINT = 'http://localhost/v1';
const PROJECT = 'ddp';
const DATABASE_ID = 'ddp';

const API_KEY = await (async () => {
  const fs = await import('node:fs');
  const envContent = fs.readFileSync(
    new URL('../../apps/colyseus-server/.env', import.meta.url),
    'utf-8',
  );
  const match = envContent.match(/APPWRITE_API_KEY=(.+)/);
  return match?.[1] ?? '';
})();

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': API_KEY,
});

const EXPECTED_COLLECTIONS = [
  'characters',
  'campaigns',
  'game_sessions',
  'game_players',
  'text_messages',
  'session_snapshots',
  'rules_profiles',
];

describe('Appwrite database schema', () => {
  it('database exists', async () => {
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}`, {
      headers: headers(),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.$id).toBe(DATABASE_ID);
  });

  for (const colId of EXPECTED_COLLECTIONS) {
    it(`collection '${colId}' exists with attributes`, async () => {
      const res = await fetch(
        `${ENDPOINT}/databases/${DATABASE_ID}/collections/${colId}`,
        { headers: headers() },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.$id).toBe(colId);
      expect(data.attributes.length).toBeGreaterThan(0);
      // All attributes should be 'available' (not 'processing' or 'failed')
      for (const attr of data.attributes) {
        expect(attr.status).toBe('available');
      }
    });
  }
});
