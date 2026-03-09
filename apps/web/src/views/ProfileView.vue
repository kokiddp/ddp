<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useSettingsStore } from '../stores/useSettingsStore.js';
import { updateDisplayName, updatePreferences, uploadAvatarFile } from '../services/auth.service.js';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const displayName = ref('');
const preferredTheme = ref<'dark' | 'light'>('dark');
const preferredTimezone = ref('UTC');
const avatarUrl = ref('');
const avatarFile = ref<File | null>(null);
const saving = ref(false);
const message = ref('');
const error = ref('');

onMounted(() => {
  displayName.value = authStore.user?.name || '';
  const prefs = authStore.user?.prefs ?? {};
  preferredTheme.value = prefs['preferredTheme'] === 'light' ? 'light' : 'dark';
  preferredTimezone.value = String(
    prefs['preferredTimezone'] ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  );
  avatarUrl.value = String(prefs['avatarUrl'] ?? '');
  settingsStore.setTheme(preferredTheme.value);
});

function handleAvatarChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  avatarFile.value = file;

  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    avatarUrl.value = typeof reader.result === 'string' ? reader.result : avatarUrl.value;
  };
  reader.readAsDataURL(file);
}

async function handleSave() {
  saving.value = true;
  message.value = '';
  error.value = '';

  try {
    const existingPrefs = authStore.user?.prefs ?? {};
    let uploadedAvatarUrl = String(existingPrefs['avatarUrl'] ?? avatarUrl.value ?? '');
    let uploadedAvatarFileId = String(existingPrefs['avatarFileId'] ?? '');

    if (avatarFile.value) {
      const uploaded = await uploadAvatarFile(avatarFile.value);
      uploadedAvatarUrl = uploaded.url;
      uploadedAvatarFileId = uploaded.fileId;
    }

    await updateDisplayName(displayName.value);
    await updatePreferences({
      ...existingPrefs,
      preferredTheme: preferredTheme.value,
      preferredTimezone: preferredTimezone.value,
      avatarUrl: uploadedAvatarUrl,
      avatarFileId: uploadedAvatarFileId,
    });

    settingsStore.setTheme(preferredTheme.value);
    await authStore.init();
    avatarFile.value = null;
    message.value = 'Profile updated.';
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update profile.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="profile-page">
    <h1>Profile</h1>
    <div class="profile-card">
      <div class="avatar-block">
        <div class="avatar-preview" aria-label="Avatar preview">
          <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" />
          <span v-else>{{ (displayName || authStore.user?.name || '?').slice(0, 1).toUpperCase() }}</span>
        </div>
        <div class="field">
          <label for="avatar">Avatar Image</label>
          <input id="avatar" type="file" accept="image/*" @change="handleAvatarChange" />
          <p class="hint">Max 5MB. Requires `VITE_APPWRITE_AVATAR_BUCKET_ID`.</p>
        </div>
      </div>

      <div class="field">
        <label>Email</label>
        <p class="readonly">{{ authStore.user?.email }}</p>
      </div>

      <form @submit.prevent="handleSave">
        <div class="field">
          <label for="displayName">Display Name</label>
          <input id="displayName" v-model="displayName" type="text" required />
        </div>

        <div class="field">
          <label for="preferredTheme">Preferred Theme</label>
          <select id="preferredTheme" v-model="preferredTheme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div class="field">
          <label for="preferredTimezone">Preferred Timezone</label>
          <input id="preferredTimezone" v-model="preferredTimezone" type="text" />
        </div>

        <div v-if="error" class="error">{{ error }}</div>
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
  max-width: 640px;
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
.field select {
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
.field select:focus {
  outline: none;
  border-color: #6060a0;
}
.avatar-block {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}
.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #2a2a4e;
  border: 1px solid #3a3a4e;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-preview span {
  font-size: 1.5rem;
  color: #d0d0f0;
  font-weight: 700;
}
.hint {
  margin-top: 0.25rem;
  color: #808090;
  font-size: 0.75rem;
}
.error {
  font-size: 0.875rem;
  color: #ff6b6b;
  margin-bottom: 1rem;
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
