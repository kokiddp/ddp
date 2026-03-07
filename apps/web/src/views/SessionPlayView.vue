<script setup lang="ts">
defineProps<{ sessionId: string }>();
</script>

<template>
  <div>
    <h1>Active Session</h1>
    <p>Session: {{ sessionId }}</p>
    <p>Active session view not yet implemented.</p>
  </div>
</template>
