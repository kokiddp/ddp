<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Models } from 'appwrite';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useSessionListStore } from '../stores/useSessionListStore.js';
import { listCampaigns } from '../services/campaign.service.js';

const authStore = useAuthStore();
const sessionStore = useSessionListStore();
const router = useRouter();

const showForm = ref(false);
const campaigns = ref<Models.Document[]>([]);
const form = ref({
  title: '',
  campaignId: '' as string,
  textChatEnabled: true,
  voiceChatEnabled: false,
  maxPlayers: 6,
});

onMounted(async () => {
  await sessionStore.fetchSessions();
  if (authStore.user) {
    campaigns.value = await listCampaigns(authStore.user.$id);
  }
});

function resetForm() {
  form.value = { title: '', campaignId: '', textChatEnabled: true, voiceChatEnabled: false, maxPlayers: 6 };
  showForm.value = false;
}

async function handleCreate() {
  if (!authStore.user) return;
  const doc = await sessionStore.addSession({
    title: form.value.title,
    hostUserId: authStore.user.$id,
    campaignId: form.value.campaignId || null,
    rulesProfileId: null,
    textChatEnabled: form.value.textChatEnabled,
    voiceChatEnabled: form.value.voiceChatEnabled,
    maxPlayers: form.value.maxPlayers,
  });
  if (doc) {
    resetForm();
    router.push(`/app/sessions/${doc.$id}/lobby`);
  }
}

function goToLobby(sessionId: string) {
  router.push(`/app/sessions/${sessionId}/lobby`);
}

const editingSessionId = ref<string | null>(null);
const editForm = ref({
  title: '',
  textChatEnabled: true,
  voiceChatEnabled: false,
  maxPlayers: 6,
});

function statusBadgeClass(status: string) {
  return `badge badge-${status}`;
}

function campaignName(session: Models.Document): string | null {
  if (!session['campaignId']) return null;
  const c = campaigns.value.find((camp) => camp.$id === session['campaignId']);
  return c ? (c.title as string) : null;
}

function isOwnSession(session: Models.Document) {
  return authStore.user && session['hostUserId'] === authStore.user.$id;
}

function canEdit(session: Models.Document) {
  return isOwnSession(session) && (session['status'] === 'open' || session['status'] === 'draft');
}

function startEdit(session: Models.Document) {
  editingSessionId.value = session.$id;
  editForm.value = {
    title: session['title'] as string,
    textChatEnabled: session['textChatEnabled'] as boolean,
    voiceChatEnabled: session['voiceChatEnabled'] as boolean,
    maxPlayers: session['maxPlayers'] as number,
  };
}

function cancelEdit() {
  editingSessionId.value = null;
}

async function handleEdit() {
  if (!editingSessionId.value) return;
  const updated = await sessionStore.editSession(editingSessionId.value, {
    title: editForm.value.title,
    textChatEnabled: editForm.value.textChatEnabled,
    voiceChatEnabled: editForm.value.voiceChatEnabled,
    maxPlayers: editForm.value.maxPlayers,
  });
  if (updated) {
    editingSessionId.value = null;
  }
}

async function handleCancel(sessionId: string) {
  if (!confirm('Are you sure you want to cancel this session?')) return;
  await sessionStore.cancelSession(sessionId);
}
</script>

<template>
  <div class="sessions-page">
    <div class="page-header">
      <h1>Sessions</h1>
      <button class="btn-primary" @click="showForm = true">New Session</button>
    </div>

    <div v-if="sessionStore.error" class="error">{{ sessionStore.error }}</div>

    <div v-if="showForm" class="form-card">
      <h2>Create Session</h2>
      <form @submit.prevent="handleCreate">
        <div class="field">
          <label for="title">Session Title</label>
          <input id="title" v-model="form.title" type="text" required />
        </div>
        <div class="field">
          <label for="campaign">Campaign</label>
          <select id="campaign" v-model="form.campaignId">
            <option value="">— No campaign —</option>
            <option v-for="c in campaigns" :key="c.$id" :value="c.$id">{{ c.title }}</option>
          </select>
        </div>
        <div class="field">
          <label for="maxPlayers">Max Players</label>
          <input id="maxPlayers" v-model.number="form.maxPlayers" type="number" min="2" max="20" />
        </div>
        <div class="field-row">
          <label class="checkbox-label">
            <input v-model="form.textChatEnabled" type="checkbox" />
            Enable Text Chat
          </label>
          <label class="checkbox-label">
            <input v-model="form.voiceChatEnabled" type="checkbox" />
            Enable Voice Chat
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Create & Join Lobby</button>
          <button type="button" class="btn-secondary" @click="resetForm">Cancel</button>
        </div>
      </form>
    </div>

    <div v-if="sessionStore.loading" class="loading">Loading sessions...</div>

    <div v-else-if="sessionStore.sessions.length === 0 && !showForm" class="empty">
      <p>No sessions available. Create one to get started!</p>
    </div>

    <div v-else class="session-list">
      <div
        v-for="session in sessionStore.sessions"
        :key="session.$id"
        class="session-card"
      >
        <!-- Edit mode -->
        <div v-if="editingSessionId === session.$id" class="edit-form">
          <form @submit.prevent="handleEdit">
            <div class="field">
              <input v-model="editForm.title" type="text" required placeholder="Session title" />
            </div>
            <div class="field">
              <input v-model.number="editForm.maxPlayers" type="number" min="2" max="20" />
            </div>
            <div class="field-row">
              <label class="checkbox-label">
                <input v-model="editForm.textChatEnabled" type="checkbox" />
                Text Chat
              </label>
              <label class="checkbox-label">
                <input v-model="editForm.voiceChatEnabled" type="checkbox" />
                Voice Chat
              </label>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn-primary btn-sm">Save</button>
              <button type="button" class="btn-secondary btn-sm" @click="cancelEdit">Cancel</button>
            </div>
          </form>
        </div>

        <!-- Display mode -->
        <div v-else class="session-info" @click="goToLobby(session.$id)">
          <h3>{{ session.title }}</h3>
          <div class="session-meta">
            <span :class="statusBadgeClass(session.status)">{{ session.status }}</span>
            <span v-if="campaignName(session)" class="campaign-tag">{{ campaignName(session) }}</span>
            <span>{{ session.maxPlayers }} players max</span>
            <span v-if="session.textChatEnabled" class="feature">Text</span>
            <span v-if="session.voiceChatEnabled" class="feature">Voice</span>
          </div>
        </div>

        <div v-if="canEdit(session) && editingSessionId !== session.$id" class="session-actions">
          <button class="btn-sm btn-secondary" @click.stop="startEdit(session)">Edit</button>
          <button class="btn-sm btn-danger" @click.stop="handleCancel(session.$id)">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.form-card {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.form-card h2 {
  margin-bottom: 1rem;
  font-size: 1.1rem;
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
.field-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #a0a0c0;
  font-size: 0.875rem;
  cursor: pointer;
}
.checkbox-label input {
  accent-color: #5050a0;
}
.form-actions {
  display: flex;
  gap: 0.75rem;
}
.session-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.session-card {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: border-color 0.2s;
}
.session-card:hover {
  border-color: #5050a0;
}
.session-info h3 {
  margin-bottom: 0.5rem;
}
.session-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.8rem;
  color: #808090;
}
.badge {
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 600;
}
.badge-open {
  background: #1a3a1a;
  color: #60c060;
}
.badge-active {
  background: #1a1a3a;
  color: #6080ff;
}
.badge-paused {
  background: #3a3a1a;
  color: #c0c060;
}
.badge-ended {
  background: #2a2a2a;
  color: #808080;
}
.badge-draft {
  background: #2a2a2a;
  color: #a0a0a0;
}
.feature {
  background: #2a2a4e;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #b0b0d0;
}
.campaign-tag {
  background: #2e1a3e;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #c0a0e0;
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
.field select:focus {
  outline: none;
  border-color: #6060a0;
}
.error {
  color: #ff6b6b;
  margin-bottom: 1rem;
}
.loading, .empty {
  color: #808090;
  text-align: center;
  padding: 3rem;
}
.btn-primary {
  padding: 0.5rem 1rem;
  background: #4040a0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary:hover {
  background: #5050b0;
}
.btn-secondary {
  padding: 0.5rem 1rem;
  background: transparent;
  color: #a0a0c0;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  cursor: pointer;
}
.btn-secondary:hover {
  border-color: #6060a0;
}
.btn-sm {
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
}
.btn-danger {
  padding: 0.5rem 1rem;
  background: #a04040;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-danger:hover {
  background: #c05050;
}
.session-card {
  position: relative;
}
.session-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #2a2a3e;
}
.edit-form {
  padding: 0.5rem 0;
}
.edit-form .field {
  margin-bottom: 0.75rem;
}
.edit-form .field input[type="text"],
.edit-form .field input[type="number"] {
  width: 100%;
  padding: 0.4rem 0.6rem;
  background: #0f0f1a;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 0.9rem;
}
</style>
