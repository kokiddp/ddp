import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type AudioCaptureOptions,
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
  const isDev = import.meta.env.DEV;

  let body: Record<string, string>;
  if (isDev) {
    // Dev mode: pass userId directly (avoids JWT creation issues)
    const user = await account.get();
    body = { userId: user.$id, sessionId };
  } else {
    const jwt = await account.createJWT();
    body = { jwt: jwt.jwt, sessionId };
  }

  const response = await fetch(`${INTEGRATION_API_URL}/voice/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

/**
 * List available audio input devices (microphones).
 */
export async function listAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await Room.getLocalDevices('audioinput');
  return devices;
}

/**
 * List available audio output devices (speakers).
 */
export async function listAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await Room.getLocalDevices('audiooutput');
  return devices;
}

/**
 * Switch microphone to a specific device.
 */
export async function setAudioInputDevice(deviceId: string): Promise<void> {
  if (!currentRoom) return;
  const opts: AudioCaptureOptions = { deviceId };
  await currentRoom.switchActiveDevice('audioinput', deviceId);
  // If mic is not enabled, enable it with the new device
  if (!currentRoom.localParticipant.isMicrophoneEnabled) {
    await currentRoom.localParticipant.setMicrophoneEnabled(true, opts);
  }
}

/**
 * Switch audio output to a specific device.
 */
export async function setAudioOutputDevice(deviceId: string): Promise<void> {
  if (!currentRoom) return;
  await currentRoom.switchActiveDevice('audiooutput', deviceId);
}

/**
 * Start monitoring local microphone audio level.
 * Returns a cleanup function to stop monitoring.
 */
export function startAudioLevelMonitor(
  callback: (level: number) => void,
  intervalMs = 50,
): () => void {
  let animFrameId: number | null = null;
  let analyser: AnalyserNode | null = null;
  let dataArray: Uint8Array<ArrayBuffer> | null = null;
  let stopped = false;

  function setup() {
    if (!currentRoom || stopped) return;
    const micPub = currentRoom.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (!micPub?.track?.mediaStream) {
      // Mic not yet available, retry
      setTimeout(setup, 200);
      return;
    }

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(micPub.track.mediaStream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

    let lastTime = 0;
    function tick(time: number) {
      if (stopped) return;
      if (time - lastTime >= intervalMs) {
        lastTime = time;
        if (analyser && dataArray) {
          analyser.getByteFrequencyData(dataArray);
          // Compute RMS-like average
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          // Normalize to 0-1 range (255 max per bin)
          callback(Math.min(rms / 128, 1));
        }
      }
      animFrameId = requestAnimationFrame(tick);
    }
    animFrameId = requestAnimationFrame(tick);
  }

  setup();

  return () => {
    stopped = true;
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
    }
  };
}
