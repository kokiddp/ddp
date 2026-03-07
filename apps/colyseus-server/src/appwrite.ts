import { Client, Databases, Users, Query } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? 'http://localhost/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? 'ddp';
const API_KEY = process.env.APPWRITE_API_KEY ?? '';

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

export const databases = new Databases(client);
export const users = new Users(client);

export const DATABASE_ID = 'ddp';

export const COLLECTIONS = {
  CHARACTERS: 'characters',
  CAMPAIGNS: 'campaigns',
  GAME_SESSIONS: 'game_sessions',
  GAME_PLAYERS: 'game_players',
  TEXT_MESSAGES: 'text_messages',
  SESSION_SNAPSHOTS: 'session_snapshots',
  RULES_PROFILES: 'rules_profiles',
} as const;

/**
 * Verify an Appwrite JWT and return the associated user ID.
 * The client creates a JWT via account.createJWT() and passes it when joining.
 */
export async function verifyJwt(jwt: string): Promise<string> {
  const response = await fetch(`${ENDPOINT}/account`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-JWT': jwt,
    },
  });

  if (!response.ok) {
    throw new Error('Invalid JWT');
  }

  const account = (await response.json()) as { $id: string };
  return account.$id;
}

/**
 * Check if a user is a member of a game session (exists in game_players).
 */
export async function isSessionMember(
  gameSessionId: string,
  userId: string,
): Promise<boolean> {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, [
    Query.equal('gameSessionId', gameSessionId),
    Query.equal('userId', userId),
    Query.notEqual('status', 'left'),
    Query.notEqual('status', 'kicked'),
    Query.limit(1),
  ]);
  return result.total > 0;
}

/**
 * Get the game session document from Appwrite.
 */
export async function getGameSession(sessionId: string) {
  return databases.getDocument(DATABASE_ID, COLLECTIONS.GAME_SESSIONS, sessionId);
}

/**
 * Get all active players for a game session.
 */
export async function getSessionPlayers(gameSessionId: string) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, [
    Query.equal('gameSessionId', gameSessionId),
    Query.notEqual('status', 'left'),
    Query.notEqual('status', 'kicked'),
    Query.limit(50),
  ]);
  return result.documents;
}

/**
 * Get the latest snapshot for a game session.
 */
export async function getLatestSnapshot(gameSessionId: string) {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SESSION_SNAPSHOTS, [
    Query.equal('gameSessionId', gameSessionId),
    Query.orderDesc('version'),
    Query.limit(1),
  ]);
  return result.documents[0] ?? null;
}

/**
 * Save a session snapshot.
 */
export async function saveSnapshot(
  gameSessionId: string,
  version: number,
  stateBlob: string,
  createdBy: string,
) {
  const { ID } = await import('node-appwrite');
  return databases.createDocument(DATABASE_ID, COLLECTIONS.SESSION_SNAPSHOTS, ID.unique(), {
    gameSessionId,
    version,
    stateBlob,
    createdBy,
  });
}

/**
 * Update the game session status in Appwrite.
 */
export async function updateSessionStatus(sessionId: string, status: string) {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.GAME_SESSIONS, sessionId, {
    status,
    ...(status === 'active' ? { startedAt: new Date().toISOString() } : {}),
    ...(status === 'ended' ? { endedAt: new Date().toISOString() } : {}),
  });
}
