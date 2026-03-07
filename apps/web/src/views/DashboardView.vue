<script setup lang="ts">
import { useAuthStore } from '../stores/useAuthStore.js';

const authStore = useAuthStore();
</script>

<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p class="welcome">Welcome back, {{ authStore.user?.name || 'Adventurer' }}.</p>

    <div class="quick-links">
      <router-link to="/app/characters" class="link-card">
        <h3>Characters</h3>
        <p>Create and manage your characters</p>
      </router-link>
      <router-link to="/app/campaigns" class="link-card">
        <h3>Campaigns</h3>
        <p>Organize your campaign worlds</p>
      </router-link>
      <router-link to="/app/sessions" class="link-card">
        <h3>Sessions</h3>
        <p>Find or create game sessions</p>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.welcome {
  color: #a0a0c0;
  margin-top: 0.5rem;
  margin-bottom: 2rem;
}
.quick-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
.link-card {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s;
}
.link-card:hover {
  border-color: #5050a0;
}
.link-card h3 {
  margin-bottom: 0.5rem;
  color: #e0e0f0;
}
.link-card p {
  color: #808090;
  font-size: 0.875rem;
}
</style>
