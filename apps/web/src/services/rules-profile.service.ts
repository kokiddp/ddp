import { databases } from './appwrite.js';
import { DATABASE_ID, COLLECTIONS } from './database.config.js';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export async function listRulesProfiles(): Promise<Models.Document[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.RULES_PROFILES, [
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ]);
  return response.documents;
}

export async function createRulesProfile(data: {
  name: string;
  description: string;
  version: string;
  configBlob: string;
}): Promise<Models.Document> {
  return databases.createDocument(DATABASE_ID, COLLECTIONS.RULES_PROFILES, ID.unique(), data);
}

export async function updateRulesProfile(
  profileId: string,
  data: Partial<{
    name: string;
    description: string;
    version: string;
    configBlob: string;
  }>,
): Promise<Models.Document> {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.RULES_PROFILES, profileId, data);
}

export async function deleteRulesProfile(profileId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.RULES_PROFILES, profileId);
}
