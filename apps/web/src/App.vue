<script setup lang="ts">
</script>

<template>
  <div id="ddp-app">
    <header class="app-header">
      <nav>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/app/characters">Characters</router-link>
        <router-link to="/app/campaigns">Campaigns</router-link>
        <router-link to="/app/sessions">Sessions</router-link>
      </nav>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f0f0f;
  color: #e0e0e0;
}

.app-header {
  padding: 1rem 2rem;
  background: #1a1a2e;
  border-bottom: 1px solid #2a2a3e;
}

.app-header nav {
  display: flex;
  gap: 1.5rem;
}

.app-header a {
  color: #a0a0c0;
  text-decoration: none;
  font-weight: 500;
}

.app-header a:hover,
.app-header a.router-link-active {
  color: #ffffff;
}

.app-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
