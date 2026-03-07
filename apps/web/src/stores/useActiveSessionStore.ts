import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { GameSession, GamePlayer } from '@ddp/shared-types';

export const useActiveSessionStore = defineStore('activeSession', () => {
  const session = ref<GameSession | null>(null);
  const players = ref<GamePlayer[]>([]);
  const connected = ref(false);

  function setSession(s: GameSession | null): void {
    session.value = s;
  }

  function setPlayers(list: GamePlayer[]): void {
    players.value = list;
  }

  function setConnected(c: boolean): void {
    connected.value = c;
  }

  return { session, players, connected, setSession, setPlayers, setConnected };
});
