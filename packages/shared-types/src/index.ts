// IDs
export type {
  UserId,
  CharacterId,
  CampaignId,
  GameSessionId,
  GamePlayerId,
  TextMessageId,
  SessionSnapshotId,
  RulesProfileId,
} from './ids.js';
export {
  userId,
  characterId,
  campaignId,
  gameSessionId,
  gamePlayerId,
  textMessageId,
  sessionSnapshotId,
  rulesProfileId,
} from './ids.js';

// Domain models
export type { User, UserStatus } from './user.js';
export type { Character } from './character.js';
export type { Campaign } from './campaign.js';
export type {
  GameSession,
  GameSessionStatus,
  GameCommunicationSettings,
} from './game-session.js';
export type {
  GamePlayer,
  GamePlayerRole,
  GamePlayerStatus,
  PlayerCommunicationState,
} from './game-player.js';
export type { TextMessage, TextMessageKind } from './text-message.js';
export type { SessionSnapshot } from './session-snapshot.js';
export type { RulesProfile } from './rules-profile.js';

// Commands
export type {
  CommandEnvelope,
  CreateSessionCommand,
  JoinSessionCommand,
  LeaveSessionCommand,
  BindCharacterToSessionCommand,
  ToggleReadyCommand,
  SendTextMessageCommand,
  JoinVoiceCommand,
  LeaveVoiceCommand,
  SubmitActionCommand,
  DdpCommand,
} from './commands.js';

// Events
export type {
  EventEnvelope,
  SessionCreatedEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  CharacterBoundEvent,
  SessionStartedEvent,
  ActionAcceptedEvent,
  ActionRejectedEvent,
  TextMessageSentEvent,
  SnapshotPersistedEvent,
  VoiceStateChangedEvent,
  DdpEvent,
} from './events.js';
