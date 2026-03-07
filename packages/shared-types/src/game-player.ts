import type { CharacterId, GamePlayerId, GameSessionId, UserId } from './ids.js';

export type GamePlayerRole = 'host' | 'player' | 'observer';
export type GamePlayerStatus = 'invited' | 'joined' | 'ready' | 'left' | 'kicked';

export interface PlayerCommunicationState {
  textChatJoined: boolean;
  voiceChatJoined: boolean;
  microphoneEnabled: boolean;
  speakerEnabled: boolean;
}

export interface GamePlayer {
  id: GamePlayerId;
  gameSessionId: GameSessionId;
  userId: UserId;
  characterId: CharacterId | null;
  role: GamePlayerRole;
  status: GamePlayerStatus;
  textChatJoined: boolean;
  voiceChatJoined: boolean;
  microphoneEnabled: boolean;
  speakerEnabled: boolean;
  joinedAt: string;
  leftAt: string | null;
}
