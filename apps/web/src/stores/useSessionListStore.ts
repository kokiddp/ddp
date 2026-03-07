import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Models } from 'appwrite';
import {
  listSessions,
  createSession,
  deleteSession,
} from '../services/session.service.js';

export const useSessionListStore = defineStore('sessionList', () => {
  const sessions = ref<Models.Document[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchSessions(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      sessions.value = await listSessions();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load sessions';
    } finally {
      loading.value = false;
    }
  }

  async function addSession(data: {
    title: string;
    hostUserId: string;
    campaignId: string | null;
    rulesProfileId: string | null;
    textChatEnabled: boolean;
    voiceChatEnabled: boolean;
    maxPlayers: number;
  }): Promise<Models.Document | null> {
    error.value = null;
    try {
      const doc = await createSession(data);
      sessions.value.unshift(doc);
      return doc;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create session';
      return null;
    }
  }

  async function removeSession(sessionId: string): Promise<boolean> {
    error.value = null;
    try {
      await deleteSession(sessionId);
      sessions.value = sessions.value.filter((s) => s.$id !== sessionId);
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to delete session';
      return false;
    }
  }

  return { sessions, loading, error, fetchSessions, addSession, removeSession };
});
