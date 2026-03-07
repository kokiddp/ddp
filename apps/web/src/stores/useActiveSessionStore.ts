import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Models } from 'appwrite';
import {
  getSession,
  updateSession,
  listSessionPlayers,
  joinSession,
  updatePlayer,
  leaveSession,
} from '../services/session.service.js';

export const useActiveSessionStore = defineStore('activeSession', () => {
  const session = ref<Models.Document | null>(null);
  const players = ref<Models.Document[]>([]);
  const currentPlayerId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isHost = computed(() => {
    const p = players.value.find((pl) => pl.$id === currentPlayerId.value);
    return p?.role === 'host';
  });

  async function loadSession(sessionId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      session.value = await getSession(sessionId);
      players.value = await listSessionPlayers(sessionId);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load session';
    } finally {
      loading.value = false;
    }
  }

  async function join(sessionId: string, userId: string, role: string): Promise<boolean> {
    error.value = null;
    try {
      const doc = await joinSession({ gameSessionId: sessionId, userId, role });
      players.value.push(doc);
      currentPlayerId.value = doc.$id;
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to join session';
      return false;
    }
  }

  async function leave(): Promise<boolean> {
    if (!currentPlayerId.value) return false;
    error.value = null;
    try {
      await leaveSession(currentPlayerId.value);
      players.value = players.value.filter((p) => p.$id !== currentPlayerId.value);
      currentPlayerId.value = null;
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to leave session';
      return false;
    }
  }

  async function toggleReady(): Promise<boolean> {
    if (!currentPlayerId.value) return false;
    const player = players.value.find((p) => p.$id === currentPlayerId.value);
    if (!player) return false;

    const newStatus = player.status === 'ready' ? 'joined' : 'ready';
    error.value = null;
    try {
      const doc = await updatePlayer(currentPlayerId.value, { status: newStatus });
      const idx = players.value.findIndex((p) => p.$id === currentPlayerId.value);
      if (idx !== -1) players.value[idx] = doc;
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to toggle ready';
      return false;
    }
  }

  async function bindCharacter(characterId: string): Promise<boolean> {
    if (!currentPlayerId.value) return false;
    error.value = null;
    try {
      const doc = await updatePlayer(currentPlayerId.value, { characterId });
      const idx = players.value.findIndex((p) => p.$id === currentPlayerId.value);
      if (idx !== -1) players.value[idx] = doc;
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to bind character';
      return false;
    }
  }

  async function startSession(): Promise<boolean> {
    if (!session.value) return false;
    error.value = null;
    try {
      session.value = await updateSession(session.value.$id, {
        status: 'active',
        startedAt: new Date().toISOString(),
      });
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to start session';
      return false;
    }
  }

  function clear(): void {
    session.value = null;
    players.value = [];
    currentPlayerId.value = null;
    error.value = null;
  }

  return {
    session,
    players,
    currentPlayerId,
    loading,
    error,
    isHost,
    loadSession,
    join,
    leave,
    toggleReady,
    bindCharacter,
    startSession,
    clear,
  };
});
