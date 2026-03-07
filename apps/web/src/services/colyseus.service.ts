import { Client, Room } from 'colyseus.js';
import { account } from './appwrite.js';

const COLYSEUS_URL =
  import.meta.env.VITE_COLYSEUS_URL || 'ws://localhost:2567';

const client = new Client(COLYSEUS_URL);

let currentRoom: Room | null = null;

export interface SessionRoomCallbacks {
  onStateChange?: (state: Record<string, unknown>) => void;
  onSessionStatus?: (data: { status: string }) => void;
  onTextMessage?: (msg: {
    gameSessionId: string;
    senderUserId: string;
    senderCharacterId: string | null;
    kind: string;
    body: string;
    createdAt: string;
  }) => void;
  onChatHistory?: (messages: Array<{
    gameSessionId: string;
    senderUserId: string;
    senderCharacterId: string | null;
    kind: string;
    body: string;
    createdAt: string;
  }>) => void;
  onActionApplied?: (action: {
    userId: string;
    actionType: string;
    actionPayload: Record<string, unknown>;
    timestamp: string;
  }) => void;
  onActionRejected?: (reason: { reason: string }) => void;
  onPlayerJoined?: (data: { userId: string; role: string }) => void;
  onPlayerLeft?: (data: { userId: string }) => void;
  onPlayerReady?: (data: { userId: string; ready: boolean }) => void;
  onStartRejected?: (data: { reason: string }) => void;
  onError?: (code: number, message?: string) => void;
  onLeave?: (code: number) => void;
}

/**
 * Join a Colyseus session room.
 */
export async function joinSessionRoom(
  sessionId: string,
  callbacks?: SessionRoomCallbacks,
  hostUserId?: string,
): Promise<Room> {
  await leaveSessionRoom();

  const isDev = import.meta.env.DEV;
  let options: Record<string, unknown>;

  if (isDev) {
    // Dev mode: pass userId directly
    const user = await account.get();
    options = { sessionId, userId: user.$id, hostUserId };
  } else {
    // Production: pass JWT
    const jwt = await account.createJWT();
    options = { sessionId, jwt: jwt.jwt, hostUserId };
  }

  const room = await client.joinOrCreate('session', options);
  currentRoom = room;

  if (callbacks?.onStateChange) {
    room.onStateChange(callbacks.onStateChange as (state: unknown) => void);
  }

  if (callbacks?.onSessionStatus) {
    room.onMessage('sessionStatus', callbacks.onSessionStatus);
  }

  if (callbacks?.onTextMessage) {
    room.onMessage('textMessage', callbacks.onTextMessage);
  }

  if (callbacks?.onChatHistory) {
    room.onMessage('chatHistory', callbacks.onChatHistory);
  }

  if (callbacks?.onActionApplied) {
    room.onMessage('actionApplied', callbacks.onActionApplied);
  }

  if (callbacks?.onActionRejected) {
    room.onMessage('actionRejected', callbacks.onActionRejected);
  }

  if (callbacks?.onPlayerJoined) {
    room.onMessage('playerJoined', callbacks.onPlayerJoined);
  }

  if (callbacks?.onPlayerLeft) {
    room.onMessage('playerLeft', callbacks.onPlayerLeft);
  }

  if (callbacks?.onPlayerReady) {
    room.onMessage('playerReady', callbacks.onPlayerReady);
  }

  if (callbacks?.onStartRejected) {
    room.onMessage('startRejected', callbacks.onStartRejected);
  }

  if (callbacks?.onError) {
    room.onError(callbacks.onError);
  }

  if (callbacks?.onLeave) {
    room.onLeave(callbacks.onLeave);
  }

  return room;
}

/**
 * Leave the current session room.
 */
export async function leaveSessionRoom(): Promise<void> {
  if (currentRoom) {
    await currentRoom.leave();
    currentRoom = null;
  }
}

/**
 * Send a text message via the Colyseus room.
 */
export function sendTextMessage(body: string, senderCharacterId?: string): void {
  currentRoom?.send('sendTextMessage', { body, senderCharacterId });
}

/**
 * Request chat history from the server.
 */
export function requestChatHistory(): void {
  currentRoom?.send('loadChatHistory', {});
}

/**
 * Toggle ready state.
 */
export function sendToggleReady(): void {
  currentRoom?.send('toggleReady', {});
}

/**
 * Bind a character to the current player.
 */
export function sendBindCharacter(characterId: string): void {
  currentRoom?.send('bindCharacter', { characterId });
}

/**
 * Start the session (host only).
 */
export function sendStartSession(): void {
  currentRoom?.send('startSession', {});
}

/**
 * Pause the session (host only).
 */
export function sendPauseSession(): void {
  currentRoom?.send('pauseSession', {});
}

/**
 * End the session (host only).
 */
export function sendEndSession(): void {
  currentRoom?.send('endSession', {});
}

/**
 * Submit a game action.
 */
export function sendAction(actionType: string, actionPayload: Record<string, unknown>): void {
  currentRoom?.send('submitAction', { actionType, actionPayload });
}

/**
 * Request a manual snapshot (host only).
 */
export function sendRequestSnapshot(): void {
  currentRoom?.send('requestSnapshot', {});
}

/**
 * Get the current room instance.
 */
export function getCurrentRoom(): Room | null {
  return currentRoom;
}
