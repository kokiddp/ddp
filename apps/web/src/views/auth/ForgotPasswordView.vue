<script setup lang="ts">
import { ref } from 'vue';
import { requestPasswordRecovery } from '../../services/auth.service.js';

const email = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const message = ref<string | null>(null);

async function handleSubmit() {
  loading.value = true;
  error.value = null;
  message.value = null;

  try {
    await requestPasswordRecovery(email.value.trim());
    message.value = 'Password reset link sent. Check your email.';
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to request password reset';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Reset Password</h1>
      <p class="helper">Enter your account email and we will send a reset link.</p>
      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" required autocomplete="email" />
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="message" class="success">{{ message }}</div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Sending...' : 'Send reset link' }}
        </button>
      </form>
      <p class="alt-action">
        Back to <router-link to="/auth/login">Sign In</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
.auth-card {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
}
.auth-card h1 {
  margin-bottom: 0.75rem;
  text-align: center;
}
.helper {
  color: #9a9ab0;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
  text-align: center;
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
.error {
  color: #ff6b6b;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}
.success {
  color: #80c080;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}
button {
  width: 100%;
  padding: 0.625rem;
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
.alt-action {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: #808090;
}
.alt-action a {
  color: #8080c0;
}
</style>
