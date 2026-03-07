<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useCharacterStore } from '../stores/useCharacterStore.js';

const authStore = useAuthStore();
const characterStore = useCharacterStore();

const showForm = ref(false);
const editingId = ref<string | null>(null);
const form = ref({ name: '', archetype: '', summary: '', tags: '' });

onMounted(async () => {
  if (authStore.user) {
    await characterStore.fetchCharacters(authStore.user.$id);
  }
});

function resetForm() {
  form.value = { name: '', archetype: '', summary: '', tags: '' };
  editingId.value = null;
  showForm.value = false;
}

function startCreate() {
  resetForm();
  showForm.value = true;
}

function startEdit(doc: { $id: string; name: string; archetype: string; summary: string; tags: string[] }) {
  form.value = {
    name: doc.name,
    archetype: doc.archetype,
    summary: doc.summary,
    tags: doc.tags?.join(', ') || '',
  };
  editingId.value = doc.$id;
  showForm.value = true;
}

async function handleSubmit() {
  const tags = form.value.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (editingId.value) {
    const ok = await characterStore.editCharacter(editingId.value, {
      name: form.value.name,
      archetype: form.value.archetype,
      summary: form.value.summary,
      tags,
    });
    if (ok) resetForm();
  } else if (authStore.user) {
    const doc = await characterStore.addCharacter({
      name: form.value.name,
      archetype: form.value.archetype,
      summary: form.value.summary,
      tags,
      ownerUserId: authStore.user.$id,
    });
    if (doc) resetForm();
  }
}

async function handleArchive(id: string) {
  await characterStore.removeCharacter(id);
}
</script>

<template>
  <div class="characters-page">
    <div class="page-header">
      <h1>Characters</h1>
      <button class="btn-primary" @click="startCreate">New Character</button>
    </div>

    <div v-if="characterStore.error" class="error">{{ characterStore.error }}</div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editingId ? 'Edit Character' : 'New Character' }}</h2>
      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="name">Name</label>
          <input id="name" v-model="form.name" type="text" required />
        </div>
        <div class="field">
          <label for="archetype">Archetype</label>
          <input id="archetype" v-model="form.archetype" type="text" placeholder="e.g. Warrior, Scholar, Trickster" />
        </div>
        <div class="field">
          <label for="summary">Summary</label>
          <textarea id="summary" v-model="form.summary" rows="3"></textarea>
        </div>
        <div class="field">
          <label for="tags">Tags (comma-separated)</label>
          <input id="tags" v-model="form.tags" type="text" placeholder="brave, cunning" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">{{ editingId ? 'Save' : 'Create' }}</button>
          <button type="button" class="btn-secondary" @click="resetForm">Cancel</button>
        </div>
      </form>
    </div>

    <div v-if="characterStore.loading" class="loading">Loading characters...</div>

    <div v-else-if="characterStore.characters.length === 0 && !showForm" class="empty">
      <p>No characters yet. Create your first one!</p>
    </div>

    <div v-else class="character-list">
      <div v-for="char in characterStore.characters" :key="char.$id" class="character-card">
        <div class="character-info">
          <h3>{{ char.name }}</h3>
          <span v-if="char.archetype" class="archetype">{{ char.archetype }}</span>
          <p v-if="char.summary" class="summary">{{ char.summary }}</p>
          <div v-if="char.tags?.length" class="tags">
            <span v-for="tag in char.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
        <div class="character-actions">
          <button class="btn-small" @click="startEdit(char as never)">Edit</button>
          <button class="btn-small btn-danger" @click="handleArchive(char.$id)">Archive</button>
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
.character-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.character-card {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.character-info h3 {
  margin-bottom: 0.25rem;
}
.archetype {
  color: #8080c0;
  font-size: 0.875rem;
}
.summary {
  margin-top: 0.5rem;
  color: #a0a0b0;
  font-size: 0.875rem;
}
.tags {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.tag {
  background: #2a2a4e;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #b0b0d0;
}
.character-actions {
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
