import type {
  CampaignId,
  CharacterId,
  GameSessionId,
  RulesProfileId,
  UserId,
} from './ids.js';

/**
 * Command envelope — all commands follow this shape.
 */
export interface CommandEnvelope<T extends string, P> {
  type: T;
  payload: P;
  issuedBy: UserId;
  issuedAt: string;
}

// --- Session commands ---

export type CreateSessionCommand = CommandEnvelope<
  'CreateSession',
  {
    title: string;
    campaignId: CampaignId | null;
    rulesProfileId: RulesProfileId | null;
    textChatEnabled: boolean;
    voiceChatEnabled: boolean;
    maxPlayers: number;
  }
>;

export type JoinSessionCommand = CommandEnvelope<
  'JoinSession',
  {
    gameSessionId: GameSessionId;
  }
>;

export type LeaveSessionCommand = CommandEnvelope<
  'LeaveSession',
  {
    gameSessionId: GameSessionId;
  }
>;

export type BindCharacterToSessionCommand = CommandEnvelope<
  'BindCharacterToSession',
  {
    gameSessionId: GameSessionId;
    characterId: CharacterId;
  }
>;

export type ToggleReadyCommand = CommandEnvelope<
  'ToggleReady',
  {
    gameSessionId: GameSessionId;
    ready: boolean;
  }
>;

// --- Chat commands ---

export type SendTextMessageCommand = CommandEnvelope<
  'SendTextMessage',
  {
    gameSessionId: GameSessionId;
    body: string;
    senderCharacterId: CharacterId | null;
  }
>;

// --- Voice commands ---

export type JoinVoiceCommand = CommandEnvelope<
  'JoinVoice',
  {
    gameSessionId: GameSessionId;
  }
>;

export type LeaveVoiceCommand = CommandEnvelope<
  'LeaveVoice',
  {
    gameSessionId: GameSessionId;
  }
>;

// --- Action commands ---

export type SubmitActionCommand = CommandEnvelope<
  'SubmitAction',
  {
    gameSessionId: GameSessionId;
    actionType: string;
    actionPayload: Record<string, unknown>;
  }
>;

// --- Discriminated union of all commands ---

export type DdpCommand =
  | CreateSessionCommand
  | JoinSessionCommand
  | LeaveSessionCommand
  | BindCharacterToSessionCommand
  | ToggleReadyCommand
  | SendTextMessageCommand
  | JoinVoiceCommand
  | LeaveVoiceCommand
  | SubmitActionCommand;
