import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { GameSession } from '@ddp/shared-types';

export const useSessionListStore = defineStore('sessionList', () => {
  const sessions = ref<GameSession[]>([]);
  const loading = ref(false);

  function setSessions(list: GameSession[]): void {
    sessions.value = list;
  }

  function setLoading(l: boolean): void {
    loading.value = l;
  }

  return { sessions, loading, setSessions, setLoading };
});
