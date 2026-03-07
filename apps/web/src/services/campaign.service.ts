import { databases } from './appwrite.js';
import { DATABASE_ID, COLLECTIONS } from './database.config.js';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

export async function listCampaigns(userId: string): Promise<Models.Document[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.CAMPAIGNS, [
    Query.equal('ownerUserId', userId),
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ]);
  return response.documents;
}

export async function getCampaign(campaignId: string): Promise<Models.Document> {
  return databases.getDocument(DATABASE_ID, COLLECTIONS.CAMPAIGNS, campaignId);
}

export async function createCampaign(data: {
  title: string;
  description: string;
  settingDescriptor: string;
  rulesetDescriptor: string;
  ownerUserId: string;
}): Promise<Models.Document> {
  return databases.createDocument(DATABASE_ID, COLLECTIONS.CAMPAIGNS, ID.unique(), {
    title: data.title,
    description: data.description,
    settingDescriptor: data.settingDescriptor,
    rulesetDescriptor: data.rulesetDescriptor,
    metadata: '{}',
    ownerUserId: data.ownerUserId,
  });
}

export async function updateCampaign(
  campaignId: string,
  data: Partial<{
    title: string;
    description: string;
    settingDescriptor: string;
    rulesetDescriptor: string;
    metadata: string;
  }>,
): Promise<Models.Document> {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.CAMPAIGNS, campaignId, data);
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.CAMPAIGNS, campaignId);
}
