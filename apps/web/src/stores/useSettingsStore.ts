import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'dark' | 'light'>('dark');

  function setTheme(t: 'dark' | 'light'): void {
    theme.value = t;
  }

  return { theme, setTheme };
});
