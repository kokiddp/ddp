import { databases } from './appwrite.js';
import { DATABASE_ID, COLLECTIONS } from './database.config.js';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export async function listSessions(): Promise<Models.Document[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GAME_SESSIONS, [
    Query.orderDesc('$createdAt'),
    Query.limit(50),
  ]);
  return response.documents;
}

export async function listSessionsByCampaign(campaignId: string): Promise<Models.Document[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GAME_SESSIONS, [
    Query.equal('campaignId', campaignId),
    Query.orderDesc('$createdAt'),
    Query.limit(50),
  ]);
  return response.documents;
}

export async function getSession(sessionId: string): Promise<Models.Document> {
  return databases.getDocument(DATABASE_ID, COLLECTIONS.GAME_SESSIONS, sessionId);
}

export async function createSession(data: {
  title: string;
  hostUserId: string;
  campaignId: string | null;
  rulesProfileId: string | null;
  textChatEnabled: boolean;
  voiceChatEnabled: boolean;
  maxPlayers: number;
}): Promise<Models.Document> {
  return databases.createDocument(DATABASE_ID, COLLECTIONS.GAME_SESSIONS, ID.unique(), {
    title: data.title,
    hostUserId: data.hostUserId,
    campaignId: data.campaignId,
    rulesProfileId: data.rulesProfileId,
    status: 'open',
    textChatEnabled: data.textChatEnabled,
    voiceChatEnabled: data.voiceChatEnabled,
    maxPlayers: data.maxPlayers,
    currentSnapshotId: null,
    scheduledAt: null,
    startedAt: null,
    endedAt: null,
  });
}

export async function updateSession(
  sessionId: string,
  data: Partial<{
    title: string;
    status: string;
    rulesProfileId: string | null;
    textChatEnabled: boolean;
    voiceChatEnabled: boolean;
    maxPlayers: number;
    startedAt: string;
    endedAt: string;
  }>,
): Promise<Models.Document> {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.GAME_SESSIONS, sessionId, data);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.GAME_SESSIONS, sessionId);
}

// --- Game Players (session membership) ---

export async function listSessionPlayers(gameSessionId: string): Promise<Models.Document[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, [
    Query.equal('gameSessionId', gameSessionId),
    Query.limit(50),
  ]);
  return response.documents;
}

export async function joinSession(data: {
  gameSessionId: string;
  userId: string;
  role: string;
}): Promise<Models.Document> {
  const session = await getSession(data.gameSessionId);

  if (session['status'] === 'ended') {
    throw new Error('Cannot join an ended session.');
  }

  const playerResult = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, [
    Query.equal('gameSessionId', data.gameSessionId),
    Query.equal('userId', data.userId),
    Query.orderDesc('$createdAt'),
    Query.limit(1),
  ]);

  const existing = playerResult.documents[0];

  if (existing) {
    const status = String(existing['status'] ?? '');

    if (status === 'kicked') {
      throw new Error('You were removed from this session and cannot rejoin.');
    }

    if (status === 'joined' || status === 'ready') {
      return existing;
    }

    if (status === 'left' || status === 'invited') {
      return databases.updateDocument(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, existing.$id, {
        status: 'joined',
        role: data.role,
        leftAt: null,
      });
    }
  }

  const activePlayers = await databases.listDocuments(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, [
    Query.equal('gameSessionId', data.gameSessionId),
    Query.notEqual('status', 'left'),
    Query.notEqual('status', 'kicked'),
    Query.limit(100),
  ]);

  const maxPlayers = Number(session['maxPlayers'] ?? 0);
  if (maxPlayers > 0 && activePlayers.total >= maxPlayers) {
    throw new Error('Session is full.');
  }

  return databases.createDocument(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, ID.unique(), {
    gameSessionId: data.gameSessionId,
    userId: data.userId,
    characterId: null,
    role: data.role,
    status: 'joined',
    textChatJoined: false,
    voiceChatJoined: false,
    microphoneEnabled: false,
    speakerEnabled: true,
    leftAt: null,
  });
}

export async function updatePlayer(
  playerId: string,
  data: Partial<{
    characterId: string | null;
    status: string;
    textChatJoined: boolean;
    voiceChatJoined: boolean;
    microphoneEnabled: boolean;
    speakerEnabled: boolean;
    leftAt: string;
  }>,
): Promise<Models.Document> {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, playerId, data);
}

export async function leaveSession(playerId: string): Promise<Models.Document> {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.GAME_PLAYERS, playerId, {
    status: 'left',
    leftAt: new Date().toISOString(),
  });
}
