<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/useAuthStore.js';
import { updateDisplayName } from '../services/auth.service.js';

const authStore = useAuthStore();
const displayName = ref('');
const saving = ref(false);
const message = ref('');

onMounted(() => {
  displayName.value = authStore.user?.name || '';
});

async function handleSave() {
  saving.value = true;
  message.value = '';
  try {
    await updateDisplayName(displayName.value);
    await authStore.init();
    message.value = 'Profile updated.';
  } catch (e: unknown) {
    message.value = e instanceof Error ? e.message : 'Failed to update profile.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="profile-page">
    <h1>Profile</h1>
    <div class="profile-card">
      <div class="field">
        <label>Email</label>
        <p class="readonly">{{ authStore.user?.email }}</p>
      </div>
      <form @submit.prevent="handleSave">
        <div class="field">
          <label for="displayName">Display Name</label>
          <input id="displayName" v-model="displayName" type="text" required />
        </div>
        <div v-if="message" class="message">{{ message }}</div>
        <button type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 500px;
}
.profile-card {
  margin-top: 1.5rem;
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 1.5rem;
}
.field {
  margin-bottom: 1rem;
}
.field label {
  display: block;
  margin-bottom: 0.25rem;
  color: #a0a0c0;
  font-size: 0.875rem;
}
.readonly {
  color: #808090;
}
.field input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #0f0f1a;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 1rem;
}
.field input:focus {
  outline: none;
  border-color: #6060a0;
}
.message {
  font-size: 0.875rem;
  color: #80c080;
  margin-bottom: 1rem;
}
button {
  padding: 0.5rem 1.5rem;
  background: #4040a0;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: #5050b0;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
