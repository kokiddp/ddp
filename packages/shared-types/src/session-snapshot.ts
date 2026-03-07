import type { GameSessionId, SessionSnapshotId, UserId } from './ids.js';

export interface SessionSnapshot {
  id: SessionSnapshotId;
  gameSessionId: GameSessionId;
  version: number;
  stateBlob: Record<string, unknown>;
  createdAt: string;
  createdBy: UserId;
}
