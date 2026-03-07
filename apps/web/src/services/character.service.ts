import { databases } from './appwrite.js';
import { DATABASE_ID, COLLECTIONS } from './database.config.js';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export interface CharacterDoc {
  name: string;
  archetype: string;
  summary: string;
  portraitUrl: string | null;
  metadata: string; // JSON string
  stats: string; // JSON string
  tags: string[];
  ownerUserId: string;
  archivedAt: string | null;
}

export async function listCharacters(userId: string): Promise<Models.Document[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CHARACTERS, [
    Query.equal('ownerUserId', userId),
    Query.isNull('archivedAt'),
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ]);
  return response.documents;
}

export async function getCharacter(characterId: string): Promise<Models.Document> {
  return databases.getDocument(DATABASE_ID, COLLECTIONS.CHARACTERS, characterId);
}

export async function createCharacter(data: {
  name: string;
  archetype: string;
  summary: string;
  tags: string[];
  ownerUserId: string;
}): Promise<Models.Document> {
  return databases.createDocument(DATABASE_ID, COLLECTIONS.CHARACTERS, ID.unique(), {
    name: data.name,
    archetype: data.archetype,
    summary: data.summary,
    portraitUrl: null,
    metadata: '{}',
    stats: '{}',
    tags: data.tags,
    ownerUserId: data.ownerUserId,
    archivedAt: null,
  });
}

export async function updateCharacter(
  characterId: string,
  data: Partial<CharacterDoc>,
): Promise<Models.Document> {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.CHARACTERS, characterId, data);
}

export async function archiveCharacter(characterId: string): Promise<Models.Document> {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.CHARACTERS, characterId, {
    archivedAt: new Date().toISOString(),
  });
}

export async function deleteCharacter(characterId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CHARACTERS, characterId);
}
