import type {
  CampaignId,
  GameSessionId,
  RulesProfileId,
  SessionSnapshotId,
  UserId,
} from './ids.js';

export type GameSessionStatus = 'draft' | 'open' | 'active' | 'paused' | 'ended';

export interface GameCommunicationSettings {
  textChatEnabled: boolean;
  voiceChatEnabled: boolean;
}

export interface GameSession {
  id: GameSessionId;
  campaignId: CampaignId | null;
  hostUserId: UserId;
  title: string;
  status: GameSessionStatus;
  textChatEnabled: boolean;
  voiceChatEnabled: boolean;
  maxPlayers: number;
  rulesProfileId: RulesProfileId | null;
  currentSnapshotId: SessionSnapshotId | null;
  createdAt: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
}
