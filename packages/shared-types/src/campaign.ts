import type { CampaignId, UserId } from './ids.js';

export interface Campaign {
  id: CampaignId;
  ownerUserId: UserId;
  title: string;
  description: string;
  settingDescriptor: string;
  rulesetDescriptor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
