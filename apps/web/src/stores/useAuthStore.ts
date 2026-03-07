import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Models } from 'appwrite';
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  type AuthCredentials,
  type RegisterCredentials,
} from '../services/auth.service.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Models.User<Models.Preferences> | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  async function init(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      user.value = await getCurrentUser();
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function register(credentials: RegisterCredentials): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await signUp(credentials);
      user.value = await getCurrentUser();
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Registration failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function login(credentials: AuthCredentials): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await signIn(credentials);
      user.value = await getCurrentUser();
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Login failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await signOut();
    } catch {
      // Ignore errors on logout — session may already be gone
    } finally {
      user.value = null;
      loading.value = false;
    }
  }

  return { user, loading, error, isAuthenticated, init, register, login, logout };
});
