import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Models } from 'appwrite';
import {
  listSessions,
  createSession,
  updateSession,
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

  async function editSession(
    sessionId: string,
    data: { title: string; textChatEnabled: boolean; voiceChatEnabled: boolean; maxPlayers: number },
  ): Promise<boolean> {
    error.value = null;
    try {
      const doc = await updateSession(sessionId, data);
      const idx = sessions.value.findIndex((s) => s.$id === sessionId);
      if (idx !== -1) sessions.value[idx] = doc;
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update session';
      return false;
    }
  }

  async function cancelSession(sessionId: string): Promise<boolean> {
    error.value = null;
    try {
      const doc = await updateSession(sessionId, { status: 'ended', endedAt: new Date().toISOString() });
      const idx = sessions.value.findIndex((s) => s.$id === sessionId);
      if (idx !== -1) sessions.value[idx] = doc;
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to cancel session';
      return false;
    }
  }

  return { sessions, loading, error, fetchSessions, addSession, editSession, cancelSession, removeSession };
});
