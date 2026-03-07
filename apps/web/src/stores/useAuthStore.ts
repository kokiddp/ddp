import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@ddp/shared-types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => user.value !== null);

  function setUser(u: User | null): void {
    user.value = u;
  }

  function setLoading(l: boolean): void {
    loading.value = l;
  }

  return { user, loading, isAuthenticated, setUser, setLoading };
});
