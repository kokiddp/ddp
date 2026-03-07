<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useActiveSessionStore } from '../stores/useActiveSessionStore.js';
import { useCharacterStore } from '../stores/useCharacterStore.js';
import {
  joinSessionRoom,
  leaveSessionRoom,
  sendToggleReady,
  sendBindCharacter,
  sendStartSession,
} from '../services/colyseus.service.js';

const props = defineProps<{ sessionId: string }>();
const authStore = useAuthStore();
const sessionStore = useActiveSessionStore();
const characterStore = useCharacterStore();
const router = useRouter();

const hasJoined = computed(() => sessionStore.currentPlayerId !== null);
const currentPlayer = computed(() =>
  sessionStore.players.find((p) => p.$id === sessionStore.currentPlayerId),
);
const isReady = computed(() => currentPlayer.value?.status === 'ready');

// Real-time state from Colyseus
const connectedToRoom = ref(false);
const connectionError = ref<string | null>(null);
const sessionStatus = ref('lobby');
const startError = ref<string | null>(null);

// Track real-time player roster from Colyseus
interface LobbyPlayer {
  userId: string;
  role: string;
  ready: boolean;
}
const livePlayers = ref<LobbyPlayer[]>([]);

async function connectToColyseusRoom() {
  try {
    const hostUserId = sessionStore.session?.['hostUserId'] as string | undefined;
    await joinSessionRoom(props.sessionId, {
      onSessionStatus: (data) => {
        sessionStatus.value = data.status;
        if (data.status === 'active') {
          // Also update Appwrite status so it persists on reload
          sessionStore.startSession().then(() => {
            router.push(`/app/sessions/${props.sessionId}/play`);
          });
        }
      },
      onPlayerJoined: (data) => {
        const exists = livePlayers.value.find((p) => p.userId === data.userId);
        if (!exists) {
          livePlayers.value.push({ userId: data.userId, role: data.role, ready: false });
        }
      },
      onPlayerLeft: (data) => {
        livePlayers.value = livePlayers.value.filter((p) => p.userId !== data.userId);
      },
      onPlayerReady: (data) => {
        const p = livePlayers.value.find((pl) => pl.userId === data.userId);
        if (p) p.ready = data.ready;
      },
      onStartRejected: (data) => {
        startError.value = data.reason;
        setTimeout(() => { startError.value = null; }, 5000);
      },
      onError: (code, message) => {
        connectionError.value = message ?? `Connection error (code: ${code})`;
      },
    }, hostUserId);
    connectedToRoom.value = true;
  } catch (e: unknown) {
    connectionError.value = e instanceof Error ? e.message : 'Failed to connect to session room';
  }
}

onMounted(async () => {
  await sessionStore.loadSession(props.sessionId);

  // Check if we're already in the roster
  if (authStore.user) {
    const existing = sessionStore.players.find((p) => p.userId === authStore.user!.$id && p.status !== 'left');
    if (existing) {
      sessionStore.currentPlayerId = existing.$id;
    }

    // Load characters for binding
    await characterStore.fetchCharacters(authStore.user.$id);
  }

  // Only connect to Colyseus if we're already a member (onAuth requires membership)
  if (hasJoined.value) {
    await connectToColyseusRoom();
  }
});

onUnmounted(async () => {
  await leaveSessionRoom();
  sessionStore.clear();
});

async function handleJoin() {
  if (!authStore.user) return;
  const isHost = sessionStore.session?.hostUserId === authStore.user.$id;
  const ok = await sessionStore.join(props.sessionId, authStore.user.$id, isHost ? 'host' : 'player');
  if (ok && !connectedToRoom.value) {
    await connectToColyseusRoom();
  }
}

async function handleLeave() {
  const ok = await sessionStore.leave();
  if (ok) {
    router.push('/app/sessions');
  }
}

async function handleToggleReady() {
  // Send via Colyseus for real-time broadcast
  sendToggleReady();
  // Also update Appwrite for persistence
  await sessionStore.toggleReady();
}

async function handleBindCharacter(event: Event) {
  const select = event.target as HTMLSelectElement;
  const charId = select.value;
  if (charId) {
    sendBindCharacter(charId);
    await sessionStore.bindCharacter(charId);
  }
}

function handleStart() {
  startError.value = null;
  // Send via Colyseus — the server will validate all-players-ready
  // and broadcast sessionStatus 'active' which triggers navigation
  sendStartSession();
}

// Merge Appwrite players with live Colyseus data
const displayPlayers = computed(() => {
  if (livePlayers.value.length > 0) {
    // Use live data, enriched with Appwrite player info
    return livePlayers.value.map((lp) => {
      const awPlayer = sessionStore.players.find((p) => p.userId === lp.userId);
      return {
        userId: lp.userId,
        role: lp.role,
        ready: lp.ready,
        characterId: awPlayer?.characterId ?? '',
        $id: awPlayer?.$id ?? lp.userId,
      };
    });
  }
  // Fallback: Appwrite roster only
  return sessionStore.players.map((p) => ({
    userId: p.userId as string,
    role: p.role as string,
    ready: p.status === 'ready',
    characterId: (p.characterId as string) ?? '',
    $id: p.$id,
  }));
});
</script>

<template>
  <div class="lobby-page">
    <div class="lobby-header">
      <div>
        <h1>{{ sessionStore.session?.title || 'Session Lobby' }}</h1>
        <div class="session-meta">
          <span class="badge" :class="`badge-${sessionStatus}`">
            {{ sessionStatus }}
          </span>
          <span v-if="sessionStore.session?.textChatEnabled" class="feature">Text Chat</span>
          <span v-if="sessionStore.session?.voiceChatEnabled" class="feature">Voice Chat</span>
          <span>{{ sessionStore.session?.maxPlayers }} max players</span>
          <span v-if="connectedToRoom" class="live-indicator">LIVE</span>
        </div>
      </div>
      <div class="lobby-actions">
        <button v-if="!hasJoined" class="btn-primary" @click="handleJoin">Join Session</button>
        <template v-if="hasJoined">
          <button class="btn-secondary" :class="{ active: isReady }" @click="handleToggleReady">
            {{ isReady ? 'Ready!' : 'Ready Up' }}
          </button>
          <button v-if="sessionStore.isHost" class="btn-primary" @click="handleStart">
            Start Session
          </button>
          <button class="btn-danger-outline" @click="handleLeave">Leave</button>
        </template>
      </div>
    </div>

    <div v-if="sessionStore.error || connectionError" class="error">
      {{ sessionStore.error || connectionError }}
    </div>
    <div v-if="startError" class="error">{{ startError }}</div>

    <div v-if="sessionStore.loading" class="loading">Loading lobby...</div>

    <div v-else class="lobby-content">
      <!-- Character selection -->
      <div v-if="hasJoined" class="character-select">
        <label for="char-select">Your Character</label>
        <select id="char-select" :value="currentPlayer?.characterId || ''" @change="handleBindCharacter">
          <option value="">— Select a character —</option>
          <option
            v-for="char in characterStore.characters"
            :key="char.$id"
            :value="char.$id"
          >
            {{ char.name }}{{ char.archetype ? ` (${char.archetype})` : '' }}
          </option>
        </select>
      </div>

      <!-- Player roster -->
      <h2>Players ({{ displayPlayers.length }})</h2>
      <div class="roster">
        <div
          v-for="player in displayPlayers"
          :key="player.$id"
          class="player-row"
          :class="{ 'is-ready': player.ready }"
        >
          <div class="player-info">
            <span class="player-name">{{ player.userId }}</span>
            <span class="player-role">{{ player.role }}</span>
            <span v-if="player.characterId" class="player-char">Character bound</span>
          </div>
          <span class="ready-indicator">
            {{ player.ready ? 'Ready' : 'Not ready' }}
          </span>
        </div>

        <div v-if="displayPlayers.length === 0" class="empty">
          No players have joined yet.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}
.session-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #808090;
}
.badge {
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 600;
}
.badge-lobby { background: #2a2a4a; color: #a0a0ff; }
.badge-open { background: #1a3a1a; color: #60c060; }
.badge-active { background: #1a1a3a; color: #6080ff; }
.badge-paused { background: #3a3a1a; color: #c0c060; }
.badge-ended { background: #2a2a2a; color: #808080; }
.feature {
  background: #2a2a4e;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #b0b0d0;
}
.live-indicator {
  background: #1a3a1a;
  color: #60c060;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.lobby-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.character-select {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}
.character-select label {
  display: block;
  margin-bottom: 0.5rem;
  color: #a0a0c0;
  font-size: 0.875rem;
}
.character-select select {
  width: 100%;
  max-width: 400px;
  padding: 0.5rem 0.75rem;
  background: #0f0f1a;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 1rem;
}
.lobby-content h2 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
}
.roster {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.player-row {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.player-row.is-ready {
  border-color: #3a6a3a;
}
.player-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.player-name {
  font-weight: 500;
}
.player-role {
  color: #8080c0;
  font-size: 0.8rem;
}
.player-char {
  color: #60a060;
  font-size: 0.8rem;
}
.ready-indicator {
  font-size: 0.8rem;
  color: #808090;
}
.is-ready .ready-indicator {
  color: #60c060;
  font-weight: 600;
}
.error {
  color: #ff6b6b;
  margin-bottom: 1rem;
}
.loading, .empty {
  color: #808090;
  text-align: center;
  padding: 2rem;
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
.btn-secondary.active {
  border-color: #3a6a3a;
  color: #60c060;
}
.btn-danger-outline {
  padding: 0.5rem 1rem;
  background: transparent;
  color: #a0a0c0;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  cursor: pointer;
}
.btn-danger-outline:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}
</style>
