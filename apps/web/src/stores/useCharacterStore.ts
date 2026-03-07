import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Character } from '@ddp/shared-types';

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<Character[]>([]);
  const loading = ref(false);

  function setCharacters(list: Character[]): void {
    characters.value = list;
  }

  function setLoading(l: boolean): void {
    loading.value = l;
  }

  return { characters, loading, setCharacters, setLoading };
});
