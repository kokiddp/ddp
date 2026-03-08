import type { CharacterId, GameSessionId, TextMessageId, UserId } from './ids.js';

export type TextMessageKind = 'user' | 'system';

export interface TextMessage {
  id: TextMessageId;
  gameSessionId: GameSessionId;
  senderUserId: UserId;
  senderCharacterId: CharacterId | null;
  senderDisplayName: string | null;
  kind: TextMessageKind;
  body: string;
  createdAt: string;
}
