import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
} from 'livekit-client';
import { account } from './appwrite.js';

const INTEGRATION_API_URL =
  import.meta.env.VITE_INTEGRATION_API_URL || 'http://localhost:3100';
const LIVEKIT_URL =
  import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';

let currentRoom: Room | null = null;

export interface VoiceCallbacks {
  onParticipantJoined?: (identity: string) => void;
  onParticipantLeft?: (identity: string) => void;
  onConnectionStateChange?: (connected: boolean) => void;
}

/**
 * Request a LiveKit token from the integration API.
 */
async function getVoiceToken(sessionId: string): Promise<{ token: string; room: string }> {
  const jwt = await account.createJWT();

  const response = await fetch(`${INTEGRATION_API_URL}/voice/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jwt: jwt.jwt, sessionId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error || 'Failed to get voice token');
  }

  return response.json();
}

/**
 * Join voice chat for a session.
 */
export async function joinVoice(
  sessionId: string,
  callbacks?: VoiceCallbacks,
): Promise<Room> {
  // Disconnect from any existing room
  await leaveVoice();

  const { token } = await getVoiceToken(sessionId);

  const room = new Room();
  currentRoom = room;

  room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
    callbacks?.onParticipantJoined?.(participant.identity);
  });

  room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
    callbacks?.onParticipantLeft?.(participant.identity);
  });

  room.on(RoomEvent.Disconnected, () => {
    callbacks?.onConnectionStateChange?.(false);
  });

  room.on(RoomEvent.Connected, () => {
    callbacks?.onConnectionStateChange?.(true);
  });

  // Auto-subscribe to audio tracks
  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrackPublication['track'], _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
      if (track && track.kind === Track.Kind.Audio) {
        const el = track.attach();
        document.body.appendChild(el);
        el.dataset.livekitAudio = 'true';
      }
    },
  );

  await room.connect(LIVEKIT_URL, token);

  // Publish local microphone (muted by default)
  await room.localParticipant.setMicrophoneEnabled(false);

  return room;
}

/**
 * Leave voice chat.
 */
export async function leaveVoice(): Promise<void> {
  if (currentRoom) {
    currentRoom.disconnect();
    currentRoom = null;
  }
  // Clean up any attached audio elements
  document.querySelectorAll('[data-livekit-audio]').forEach((el) => el.remove());
}

/**
 * Toggle microphone on/off.
 */
export async function toggleMicrophone(enabled: boolean): Promise<void> {
  if (!currentRoom) return;
  await currentRoom.localParticipant.setMicrophoneEnabled(enabled);
}

/**
 * Toggle speaker (deafen/undeafen).
 * Mutes all incoming audio tracks.
 */
export function toggleSpeaker(enabled: boolean): void {
  if (!currentRoom) return;

  currentRoom.remoteParticipants.forEach((participant) => {
    participant.audioTrackPublications.forEach((pub) => {
      if (pub.track) {
        if (enabled) {
          pub.track.attach();
        } else {
          pub.track.detach();
        }
      }
    });
  });
}

/**
 * Get list of current voice participants.
 */
export function getVoiceParticipants(): string[] {
  if (!currentRoom) return [];

  const participants: string[] = [currentRoom.localParticipant.identity];
  currentRoom.remoteParticipants.forEach((p) => {
    participants.push(p.identity);
  });
  return participants;
}

/**
 * Get the current room instance.
 */
export function getCurrentRoom(): Room | null {
  return currentRoom;
}
