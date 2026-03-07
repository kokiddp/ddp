<script setup lang="ts">
defineProps<{ sessionId: string }>();
</script>

<template>
  <div>
    <h1>Session Lobby</h1>
    <p>Session: {{ sessionId }}</p>
    <p>Lobby not yet implemented.</p>
  </div>
</template>
