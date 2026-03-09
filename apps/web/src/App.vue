<script setup lang="ts">
import { useAuthStore } from './stores/useAuthStore.js';
import { useRouter } from 'vue-router';
import ErrorBoundary from './components/ErrorBoundary.vue';

const authStore = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await authStore.logout();
  router.push('/auth/login');
}
</script>

<template>
  <div id="ddp-app">
    <header v-if="authStore.isAuthenticated" class="app-header">
      <nav>
        <router-link to="/app/dashboard">Dashboard</router-link>
        <router-link to="/app/characters">Characters</router-link>
        <router-link to="/app/campaigns">Campaigns</router-link>
        <router-link to="/app/rules-profiles">Rules Profiles</router-link>
        <router-link to="/app/sessions">Sessions</router-link>
      </nav>
      <div class="user-menu">
        <router-link to="/app/profile" class="user-name">
          {{ authStore.user?.name || 'Profile' }}
        </router-link>
        <button class="logout-btn" @click="handleLogout">Sign Out</button>
      </div>
    </header>
    <main class="app-main">
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f0f0f;
  color: #e0e0e0;
}

.app-header {
  padding: 1rem 2rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2a2a3e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-header nav {
  display: flex;
  gap: 1.5rem;
}

.app-header a {
  color: #a0a0c0;
  text-decoration: none;
  font-weight: 500;
}

.app-header a:hover,
.app-header a.router-link-active {
  color: #ffffff;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-size: 0.875rem;
}

.logout-btn {
  padding: 0.375rem 0.75rem;
  background: transparent;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  color: #a0a0c0;
  cursor: pointer;
  font-size: 0.8rem;
}

.logout-btn:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.app-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
