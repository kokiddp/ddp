// Appwrite database and collection IDs
// These must match the Appwrite console configuration
export const DATABASE_ID = 'ddp';

export const COLLECTIONS = {
  CHARACTERS: 'characters',
  CAMPAIGNS: 'campaigns',
  GAME_SESSIONS: 'game_sessions',
  GAME_PLAYERS: 'game_players',
  TEXT_MESSAGES: 'text_messages',
  SESSION_SNAPSHOTS: 'session_snapshots',
  RULES_PROFILES: 'rules_profiles',
} as const;
