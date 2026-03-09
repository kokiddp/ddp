<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { completePasswordRecovery } from '../../services/auth.service.js';

const route = useRoute();
const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const message = ref<string | null>(null);

const userId = computed(() => String(route.query.userId ?? ''));
const secret = computed(() => String(route.query.secret ?? ''));
const hasToken = computed(() => userId.value.length > 0 && secret.value.length > 0);

async function handleSubmit() {
  if (!hasToken.value) {
    error.value = 'Reset link is invalid or missing required token parameters.';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.';
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.';
    return;
  }

  loading.value = true;
  error.value = null;
  message.value = null;

  try {
    await completePasswordRecovery({
      userId: userId.value,
      secret: secret.value,
      password: password.value,
    });
    message.value = 'Password has been reset. Redirecting to sign in...';
    setTimeout(() => {
      router.push('/auth/login');
    }, 1200);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to reset password';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>Set New Password</h1>
      <p class="helper">Choose a new password for your account.</p>

      <div v-if="!hasToken" class="error">
        This reset link is invalid. Request a new link from the forgot password page.
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="password">New Password</label>
          <input id="password" v-model="password" type="password" minlength="8" required autocomplete="new-password" />
        </div>
        <div class="field">
          <label for="confirmPassword">Confirm Password</label>
          <input id="confirmPassword" v-model="confirmPassword" type="password" minlength="8" required autocomplete="new-password" />
        </div>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="message" class="success">{{ message }}</div>
        <button type="submit" :disabled="loading || !hasToken">
          {{ loading ? 'Updating...' : 'Update password' }}
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
