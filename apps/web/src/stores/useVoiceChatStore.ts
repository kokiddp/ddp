import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  joinVoice,
  leaveVoice,
  toggleMicrophone,
  toggleSpeaker,
  getVoiceParticipants,
} from '../services/voice.service.js';

export const useVoiceChatStore = defineStore('voiceChat', () => {
  const joined = ref(false);
  const microphoneEnabled = ref(false);
  const speakerEnabled = ref(true);
  const participants = ref<string[]>([]);
  const error = ref<string | null>(null);
  const connecting = ref(false);

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
            participants.value = getVoiceParticipants();
          }
        },
      });

      joined.value = true;
      microphoneEnabled.value = false;
      speakerEnabled.value = true;
      participants.value = getVoiceParticipants();
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to join voice';
      return false;
    } finally {
      connecting.value = false;
    }
  }

  async function leave(): Promise<void> {
    await leaveVoice();
    joined.value = false;
    microphoneEnabled.value = false;
    participants.value = [];
  }

  async function setMicrophoneEnabled(enabled: boolean): Promise<void> {
    try {
      await toggleMicrophone(enabled);
      microphoneEnabled.value = enabled;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Microphone error';
    }
  }

  function setSpeakerEnabled(enabled: boolean): void {
    toggleSpeaker(enabled);
    speakerEnabled.value = enabled;
  }

  return {
    joined,
    microphoneEnabled,
    speakerEnabled,
    participants,
    error,
    connecting,
    join,
    leave,
    setMicrophoneEnabled,
    setSpeakerEnabled,
  };
});
