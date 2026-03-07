import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Models } from 'appwrite';
import {
  listCharacters,
  createCharacter,
  updateCharacter,
  archiveCharacter,
  deleteCharacter,
} from '../services/character.service.js';

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<Models.Document[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchCharacters(userId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      characters.value = await listCharacters(userId);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load characters';
    } finally {
      loading.value = false;
    }
  }

  async function addCharacter(data: {
    name: string;
    archetype: string;
    summary: string;
    tags: string[];
    ownerUserId: string;
  }): Promise<Models.Document | null> {
    error.value = null;
    try {
      const doc = await createCharacter(data);
      characters.value.unshift(doc);
      return doc;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create character';
      return null;
    }
  }

  async function editCharacter(
    characterId: string,
    data: Partial<{ name: string; archetype: string; summary: string; tags: string[] }>,
  ): Promise<boolean> {
    error.value = null;
    try {
      const doc = await updateCharacter(characterId, data);
      const idx = characters.value.findIndex((c) => c.$id === characterId);
      if (idx !== -1) characters.value[idx] = doc;
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update character';
      return false;
    }
  }

  async function removeCharacter(characterId: string, permanent = false): Promise<boolean> {
    error.value = null;
    try {
      if (permanent) {
        await deleteCharacter(characterId);
      } else {
        await archiveCharacter(characterId);
      }
      characters.value = characters.value.filter((c) => c.$id !== characterId);
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to remove character';
      return false;
    }
  }

  return { characters, loading, error, fetchCharacters, addCharacter, editCharacter, removeCharacter };
});
