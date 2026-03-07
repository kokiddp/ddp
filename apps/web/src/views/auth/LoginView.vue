<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/useAuthStore.js';

const authStore = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');

async function handleLogin() {
  const success = await authStore.login({ email: email.value, password: password.value });
  if (success) {
    router.push('/app/dashboard');
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Sign In</h1>
      <form @submit.prevent="handleLogin">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" required autocomplete="email" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" required autocomplete="current-password" />
        </div>
        <div v-if="authStore.error" class="error">{{ authStore.error }}</div>
        <button type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
      <p class="alt-action">
        Don't have an account? <router-link to="/auth/register">Register</router-link>
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
  max-width: 400px;
}
.auth-card h1 {
  margin-bottom: 1.5rem;
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
  margin-bottom: 1rem;
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
