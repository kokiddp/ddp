<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const error = ref<Error | null>(null);
const errorInfo = ref('');

onErrorCaptured((err, _instance, info) => {
  error.value = err instanceof Error ? err : new Error(String(err));
  errorInfo.value = info;
  console.error('[DDP] Captured error:', err, info);
  return false; // prevent further propagation
});

function dismiss() {
  error.value = null;
  errorInfo.value = '';
}
</script>

<template>
  <div v-if="error" class="error-boundary">
    <div class="error-boundary__card">
      <h2>Something went wrong</h2>
      <p class="error-boundary__message">{{ error.message }}</p>
      <p v-if="errorInfo" class="error-boundary__info">{{ errorInfo }}</p>
      <button class="error-boundary__btn" @click="dismiss">Dismiss</button>
    </div>
  </div>
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 2rem;
}

.error-boundary__card {
  background: #1a1a2e;
  border: 1px solid #5a2a2a;
  border-radius: 8px;
  padding: 1.5rem 2rem;
  max-width: 500px;
  text-align: center;
}

.error-boundary__card h2 {
  color: #ff6b6b;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.error-boundary__message {
  color: #e0e0e0;
  margin-bottom: 0.5rem;
  word-break: break-word;
}

.error-boundary__info {
  color: #808090;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.error-boundary__btn {
  padding: 0.4rem 1rem;
  background: #3a3a5a;
  color: #e0e0e0;
  border: 1px solid #4a4a6a;
  border-radius: 4px;
  cursor: pointer;
}

.error-boundary__btn:hover {
  background: #4a4a6a;
}
</style>
