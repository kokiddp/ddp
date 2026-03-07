/**
 * Branded ID types for type-safe entity references.
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type CharacterId = Brand<string, 'CharacterId'>;
export type CampaignId = Brand<string, 'CampaignId'>;
export type GameSessionId = Brand<string, 'GameSessionId'>;
export type GamePlayerId = Brand<string, 'GamePlayerId'>;
export type TextMessageId = Brand<string, 'TextMessageId'>;
export type SessionSnapshotId = Brand<string, 'SessionSnapshotId'>;
export type RulesProfileId = Brand<string, 'RulesProfileId'>;

export function userId(raw: string): UserId {
  return raw as UserId;
}

export function characterId(raw: string): CharacterId {
  return raw as CharacterId;
}

export function campaignId(raw: string): CampaignId {
  return raw as CampaignId;
}

export function gameSessionId(raw: string): GameSessionId {
  return raw as GameSessionId;
}

export function gamePlayerId(raw: string): GamePlayerId {
  return raw as GamePlayerId;
}

export function textMessageId(raw: string): TextMessageId {
  return raw as TextMessageId;
}

export function sessionSnapshotId(raw: string): SessionSnapshotId {
  return raw as SessionSnapshotId;
}

export function rulesProfileId(raw: string): RulesProfileId {
  return raw as RulesProfileId;
}
