<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Models } from 'appwrite';
import {
  listRulesProfiles,
  createRulesProfile,
  updateRulesProfile,
  deleteRulesProfile,
} from '../services/rules-profile.service.js';

const profiles = ref<Models.Document[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showForm = ref(false);
const editingId = ref<string | null>(null);

const form = ref({
  name: '',
  description: '',
  version: '1.0.0',
  configBlob: '{\n  \n}',
});

async function fetchProfiles(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    profiles.value = await listRulesProfiles();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load rules profiles';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await fetchProfiles();
});

function resetForm() {
  form.value = {
    name: '',
    description: '',
    version: '1.0.0',
    configBlob: '{\n  \n}',
  };
  editingId.value = null;
  showForm.value = false;
}

function startCreate() {
  resetForm();
  showForm.value = true;
}

function startEdit(doc: Models.Document) {
  form.value = {
    name: String(doc['name'] ?? ''),
    description: String(doc['description'] ?? ''),
    version: String(doc['version'] ?? '1.0.0'),
    configBlob: String(doc['configBlob'] ?? '{}'),
  };
  editingId.value = doc.$id;
  showForm.value = true;
}

async function handleSubmit() {
  error.value = null;

  try {
    // Validate config blob as JSON before saving.
    JSON.parse(form.value.configBlob || '{}');
  } catch {
    error.value = 'Config blob must be valid JSON.';
    return;
  }

  try {
    if (editingId.value) {
      const updated = await updateRulesProfile(editingId.value, {
        name: form.value.name,
        description: form.value.description,
        version: form.value.version,
        configBlob: form.value.configBlob,
      });
      const idx = profiles.value.findIndex((p) => p.$id === editingId.value);
      if (idx !== -1) profiles.value[idx] = updated;
    } else {
      const created = await createRulesProfile({
        name: form.value.name,
        description: form.value.description,
        version: form.value.version,
        configBlob: form.value.configBlob,
      });
      profiles.value.unshift(created);
    }

    resetForm();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save rules profile';
  }
}

async function handleDelete(profileId: string) {
  if (!confirm('Delete this rules profile?')) return;

  error.value = null;
  try {
    await deleteRulesProfile(profileId);
    profiles.value = profiles.value.filter((p) => p.$id !== profileId);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to delete rules profile';
  }
}

function prettyConfig(blob: unknown): string {
  const raw = String(blob ?? '{}');
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
</script>

<template>
  <div class="rules-profiles-page">
    <div class="page-header">
      <h1>Rules Profiles</h1>
      <button class="btn-primary" @click="startCreate">New Profile</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editingId ? 'Edit Rules Profile' : 'Create Rules Profile' }}</h2>
      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="name">Name</label>
          <input id="name" v-model="form.name" type="text" required />
        </div>

        <div class="field">
          <label for="version">Version</label>
          <input id="version" v-model="form.version" type="text" required />
        </div>

        <div class="field">
          <label for="description">Description</label>
          <textarea id="description" v-model="form.description" rows="3"></textarea>
        </div>

        <div class="field">
          <label for="configBlob">Config Blob (JSON)</label>
          <textarea id="configBlob" v-model="form.configBlob" rows="8"></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">{{ editingId ? 'Save' : 'Create' }}</button>
          <button type="button" class="btn-secondary" @click="resetForm">Cancel</button>
        </div>
      </form>
    </div>

    <div v-if="loading" class="loading">Loading rules profiles...</div>

    <div v-else-if="profiles.length === 0 && !showForm" class="empty">
      <p>No rules profiles yet. Create one to attach to sessions.</p>
    </div>

    <div v-else class="profile-list">
      <div v-for="profile in profiles" :key="profile.$id" class="profile-card">
        <div class="profile-info">
          <h3>{{ profile.name }} <span class="version">v{{ profile.version }}</span></h3>
          <p v-if="profile.description" class="description">{{ profile.description }}</p>
          <details>
            <summary>Config</summary>
            <pre>{{ prettyConfig(profile.configBlob) }}</pre>
          </details>
        </div>

        <div class="profile-actions">
          <button class="btn-small" @click="startEdit(profile)">Edit</button>
          <button class="btn-small btn-danger" @click="handleDelete(profile.$id)">Delete</button>
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
.profile-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.profile-card {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.version {
  font-size: 0.8rem;
  color: #8080c0;
  margin-left: 0.25rem;
}
.description {
  color: #a0a0b0;
  margin-top: 0.5rem;
}
details {
  margin-top: 0.75rem;
}
summary {
  cursor: pointer;
  color: #a0a0c0;
}
pre {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #0f0f1a;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  color: #d0d0e0;
  font-size: 0.8rem;
  overflow-x: auto;
}
.profile-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.error {
  color: #ff6b6b;
  margin-bottom: 1rem;
}
.loading,
.empty {
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
