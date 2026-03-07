import type {
  CharacterId,
  GameSessionId,
  SessionSnapshotId,
  TextMessageId,
  UserId,
} from './ids.js';

/**
 * Event envelope — all events follow this shape.
 */
export interface EventEnvelope<T extends string, P> {
  type: T;
  payload: P;
  occurredAt: string;
}

// --- Session events ---

export type SessionCreatedEvent = EventEnvelope<
  'SessionCreated',
  {
    gameSessionId: GameSessionId;
    hostUserId: UserId;
    title: string;
  }
>;

export type PlayerJoinedEvent = EventEnvelope<
  'PlayerJoined',
  {
    gameSessionId: GameSessionId;
    userId: UserId;
  }
>;

export type PlayerLeftEvent = EventEnvelope<
  'PlayerLeft',
  {
    gameSessionId: GameSessionId;
    userId: UserId;
  }
>;

export type CharacterBoundEvent = EventEnvelope<
  'CharacterBound',
  {
    gameSessionId: GameSessionId;
    userId: UserId;
    characterId: CharacterId;
  }
>;

export type SessionStartedEvent = EventEnvelope<
  'SessionStarted',
  {
    gameSessionId: GameSessionId;
  }
>;

// --- Action events ---

export type ActionAcceptedEvent = EventEnvelope<
  'ActionAccepted',
  {
    gameSessionId: GameSessionId;
    userId: UserId;
    actionType: string;
  }
>;

export type ActionRejectedEvent = EventEnvelope<
  'ActionRejected',
  {
    gameSessionId: GameSessionId;
    userId: UserId;
    actionType: string;
    reason: string;
  }
>;

// --- Chat events ---

export type TextMessageSentEvent = EventEnvelope<
  'TextMessageSent',
  {
    gameSessionId: GameSessionId;
    messageId: TextMessageId;
    senderUserId: UserId;
  }
>;

// --- Snapshot events ---

export type SnapshotPersistedEvent = EventEnvelope<
  'SnapshotPersisted',
  {
    gameSessionId: GameSessionId;
    snapshotId: SessionSnapshotId;
    version: number;
  }
>;

// --- Voice events ---

export type VoiceStateChangedEvent = EventEnvelope<
  'VoiceStateChanged',
  {
    gameSessionId: GameSessionId;
    userId: UserId;
    voiceChatJoined: boolean;
    microphoneEnabled: boolean;
    speakerEnabled: boolean;
  }
>;

// --- Discriminated union of all events ---

export type DdpEvent =
  | SessionCreatedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | CharacterBoundEvent
  | SessionStartedEvent
  | ActionAcceptedEvent
  | ActionRejectedEvent
  | TextMessageSentEvent
  | SnapshotPersistedEvent
  | VoiceStateChangedEvent;
