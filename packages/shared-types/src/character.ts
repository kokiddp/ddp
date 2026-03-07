import type { CharacterId, UserId } from './ids.js';

export interface Character {
  id: CharacterId;
  ownerUserId: UserId;
  name: string;
  archetype: string;
  summary: string;
  portraitUrl: string | null;
  metadata: Record<string, unknown>;
  stats: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
