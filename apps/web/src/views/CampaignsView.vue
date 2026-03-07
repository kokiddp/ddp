<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/useAuthStore.js';
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '../services/campaign.service.js';
import type { Models } from 'appwrite';

const authStore = useAuthStore();

const campaigns = ref<Models.Document[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showForm = ref(false);
const editingId = ref<string | null>(null);
const form = ref({ title: '', description: '', settingDescriptor: '', rulesetDescriptor: '' });

onMounted(async () => {
  if (authStore.user) {
    loading.value = true;
    try {
      campaigns.value = await listCampaigns(authStore.user.$id);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load campaigns';
    } finally {
      loading.value = false;
    }
  }
});

function resetForm() {
  form.value = { title: '', description: '', settingDescriptor: '', rulesetDescriptor: '' };
  editingId.value = null;
  showForm.value = false;
}

function startCreate() {
  resetForm();
  showForm.value = true;
}

function startEdit(doc: Models.Document) {
  form.value = {
    title: doc.title,
    description: doc.description,
    settingDescriptor: doc.settingDescriptor || '',
    rulesetDescriptor: doc.rulesetDescriptor || '',
  };
  editingId.value = doc.$id;
  showForm.value = true;
}

async function handleSubmit() {
  error.value = null;
  try {
    if (editingId.value) {
      const doc = await updateCampaign(editingId.value, {
        title: form.value.title,
        description: form.value.description,
        settingDescriptor: form.value.settingDescriptor,
        rulesetDescriptor: form.value.rulesetDescriptor,
      });
      const idx = campaigns.value.findIndex((c) => c.$id === editingId.value);
      if (idx !== -1) campaigns.value[idx] = doc;
    } else if (authStore.user) {
      const doc = await createCampaign({
        title: form.value.title,
        description: form.value.description,
        settingDescriptor: form.value.settingDescriptor,
        rulesetDescriptor: form.value.rulesetDescriptor,
        ownerUserId: authStore.user.$id,
      });
      campaigns.value.unshift(doc);
    }
    resetForm();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save campaign';
  }
}

async function handleDelete(id: string) {
  error.value = null;
  try {
    await deleteCampaign(id);
    campaigns.value = campaigns.value.filter((c) => c.$id !== id);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to delete campaign';
  }
}
</script>

<template>
  <div class="campaigns-page">
    <div class="page-header">
      <h1>Campaigns</h1>
      <button class="btn-primary" @click="startCreate">New Campaign</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editingId ? 'Edit Campaign' : 'New Campaign' }}</h2>
      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="title">Title</label>
          <input id="title" v-model="form.title" type="text" required />
        </div>
        <div class="field">
          <label for="description">Description</label>
          <textarea id="description" v-model="form.description" rows="3"></textarea>
        </div>
        <div class="field">
          <label for="setting">Setting Descriptor</label>
          <input id="setting" v-model="form.settingDescriptor" type="text" placeholder="e.g. Dark Fantasy, Sci-Fi" />
        </div>
        <div class="field">
          <label for="ruleset">Ruleset Descriptor</label>
          <input id="ruleset" v-model="form.rulesetDescriptor" type="text" placeholder="e.g. Custom, d20-based" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">{{ editingId ? 'Save' : 'Create' }}</button>
          <button type="button" class="btn-secondary" @click="resetForm">Cancel</button>
        </div>
      </form>
    </div>

    <div v-if="loading" class="loading">Loading campaigns...</div>

    <div v-else-if="campaigns.length === 0 && !showForm" class="empty">
      <p>No campaigns yet. Create your first one!</p>
    </div>

    <div v-else class="campaign-list">
      <div v-for="campaign in campaigns" :key="campaign.$id" class="campaign-card">
        <div class="campaign-info">
          <h3>{{ campaign.title }}</h3>
          <div class="meta">
            <span v-if="campaign.settingDescriptor">{{ campaign.settingDescriptor }}</span>
            <span v-if="campaign.rulesetDescriptor"> &middot; {{ campaign.rulesetDescriptor }}</span>
          </div>
          <p v-if="campaign.description" class="description">{{ campaign.description }}</p>
        </div>
        <div class="campaign-actions">
          <button class="btn-small" @click="startEdit(campaign)">Edit</button>
          <button class="btn-small btn-danger" @click="handleDelete(campaign.$id)">Delete</button>
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
.field input,
.field textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #0f0f1a;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 1rem;
  font-family: inherit;
}
.field input:focus,
.field textarea:focus {
  outline: none;
  border-color: #6060a0;
}
.form-actions {
  display: flex;
  gap: 0.75rem;
}
.campaign-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.campaign-card {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.campaign-info h3 {
  margin-bottom: 0.25rem;
}
.meta {
  color: #8080c0;
  font-size: 0.875rem;
}
.description {
  margin-top: 0.5rem;
  color: #a0a0b0;
  font-size: 0.875rem;
}
.campaign-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
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
.btn-small {
  padding: 0.25rem 0.625rem;
  background: transparent;
  color: #a0a0c0;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}
.btn-small:hover {
  border-color: #6060a0;
  color: #e0e0e0;
}
.btn-danger:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}
</style>
