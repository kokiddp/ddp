import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  joinVoice,
  leaveVoice,
  toggleMicrophone,
  toggleSpeaker,
  getVoiceParticipants,
  listAudioInputDevices,
  listAudioOutputDevices,
  setAudioInputDevice,
  setAudioOutputDevice,
  startAudioLevelMonitor,
} from '../services/voice.service.js';

export const useVoiceChatStore = defineStore('voiceChat', () => {
  const joined = ref(false);
  const microphoneEnabled = ref(false);
  const speakerEnabled = ref(true);
  const reconnecting = ref(false);
  const participants = ref<string[]>([]);
  const activeSpeakers = ref<string[]>([]);
  const error = ref<string | null>(null);
  const connecting = ref(false);

  // Device management
  const audioInputDevices = ref<MediaDeviceInfo[]>([]);
  const audioOutputDevices = ref<MediaDeviceInfo[]>([]);
  const selectedInputDeviceId = ref<string>('');
  const selectedOutputDeviceId = ref<string>('');

  // Audio level (0-1)
  const micLevel = ref(0);
  let stopLevelMonitor: (() => void) | null = null;

  function clearMicMonitor(): void {
    if (stopLevelMonitor) {
      stopLevelMonitor();
      stopLevelMonitor = null;
    }
    micLevel.value = 0;
  }

  function mapMicrophoneError(e: unknown): string {
    const err = e as { name?: string; message?: string };
    if (err?.name === 'NotAllowedError') {
      return 'Microphone permission denied. Please allow microphone access in browser settings.';
    }
    if (err?.name === 'NotFoundError') {
      return 'No microphone device was found.';
    }
    return err?.message ?? 'Microphone error';
  }

  async function refreshDevices(): Promise<void> {
    try {
      audioInputDevices.value = await listAudioInputDevices();
      audioOutputDevices.value = await listAudioOutputDevices();
    } catch {
      // Device enumeration may fail without permissions
    }
  }

  async function join(sessionId: string): Promise<boolean> {
    if (joined.value || connecting.value) return false;
    connecting.value = true;
    error.value = null;

    try {
      await joinVoice(sessionId, {
        onParticipantJoined: () => {
          participants.value = getVoiceParticipants();
        },
        onParticipantLeft: () => {
          participants.value = getVoiceParticipants();
        },
        onConnectionStateChange: (connected) => {
          joined.value = connected;
          if (connected) {
            reconnecting.value = false;
            participants.value = getVoiceParticipants();
          } else {
            clearMicMonitor();
            microphoneEnabled.value = false;
          }
        },
        onActiveSpeakersChanged: (speakerIds) => {
          activeSpeakers.value = speakerIds;
        },
        onReconnecting: () => {
          reconnecting.value = true;
          error.value = 'Voice connection interrupted. Reconnecting...';
        },
        onReconnected: () => {
          reconnecting.value = false;
          error.value = null;
          participants.value = getVoiceParticipants();
        },
      });

      joined.value = true;
      microphoneEnabled.value = false;
      speakerEnabled.value = true;
      participants.value = getVoiceParticipants();
      await refreshDevices();
      error.value = null;
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to join voice';
      return false;
    } finally {
      connecting.value = false;
    }
  }

  async function leave(): Promise<void> {
    clearMicMonitor();
    await leaveVoice();
    joined.value = false;
    reconnecting.value = false;
    microphoneEnabled.value = false;
    participants.value = [];
    activeSpeakers.value = [];
  }

  async function setMicrophoneEnabled(enabled: boolean): Promise<void> {
    try {
      await toggleMicrophone(enabled);
      microphoneEnabled.value = enabled;

      if (enabled) {
        stopLevelMonitor = startAudioLevelMonitor((level) => {
          micLevel.value = level;
        });
        await refreshDevices();
      } else {
        clearMicMonitor();
      }
    } catch (e: unknown) {
      microphoneEnabled.value = false;
      clearMicMonitor();
      error.value = mapMicrophoneError(e);
    }
  }

  function setSpeakerEnabled(enabled: boolean): void {
    toggleSpeaker(enabled);
    speakerEnabled.value = enabled;
  }

  async function switchInputDevice(deviceId: string): Promise<void> {
    try {
      await setAudioInputDevice(deviceId);
      selectedInputDeviceId.value = deviceId;
      if (stopLevelMonitor) {
        stopLevelMonitor();
      }
      if (microphoneEnabled.value) {
        stopLevelMonitor = startAudioLevelMonitor((level) => {
          micLevel.value = level;
        });
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to switch input device';
    }
  }

  async function switchOutputDevice(deviceId: string): Promise<void> {
    try {
      await setAudioOutputDevice(deviceId);
      selectedOutputDeviceId.value = deviceId;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to switch output device';
    }
  }

  return {
    joined,
    microphoneEnabled,
    speakerEnabled,
    participants,
    activeSpeakers,
    reconnecting,
    error,
    connecting,
    audioInputDevices,
    audioOutputDevices,
    selectedInputDeviceId,
    selectedOutputDeviceId,
    micLevel,
    join,
    leave,
    setMicrophoneEnabled,
    setSpeakerEnabled,
    refreshDevices,
    switchInputDevice,
    switchOutputDevice,
  };
});
