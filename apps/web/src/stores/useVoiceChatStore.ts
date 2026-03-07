import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useVoiceChatStore = defineStore('voiceChat', () => {
  const joined = ref(false);
  const microphoneEnabled = ref(false);
  const speakerEnabled = ref(true);
  const participants = ref<string[]>([]);

  function setJoined(j: boolean): void {
    joined.value = j;
  }

  function setMicrophoneEnabled(m: boolean): void {
    microphoneEnabled.value = m;
  }

  function setSpeakerEnabled(s: boolean): void {
    speakerEnabled.value = s;
  }

  function setParticipants(list: string[]): void {
    participants.value = list;
  }

  return {
    joined,
    microphoneEnabled,
    speakerEnabled,
    participants,
    setJoined,
    setMicrophoneEnabled,
    setSpeakerEnabled,
    setParticipants,
  };
});
