<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useTextChatStore } from '../stores/useTextChatStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import {
  joinSessionRoom,
  leaveSessionRoom,
  requestChatHistory,
} from '../services/colyseus.service.js';
import TextChatPanel from '../components/TextChatPanel.vue';
import {
  type TextMessage,
  textMessageId,
  gameSessionId as toGameSessionId,
  userId as toUserId,
  characterId as toCharacterId,
} from '@ddp/shared-types';

const props = defineProps<{ sessionId: string }>();

const chatStore = useTextChatStore();
const authStore = useAuthStore();

function mapTextMessage(msg: {
  gameSessionId: string;
  senderUserId: string;
  senderCharacterId: string | null;
  kind: string;
  body: string;
  createdAt: string;
}): TextMessage {
  return {
    id: textMessageId(''),
    gameSessionId: toGameSessionId(msg.gameSessionId),
    senderUserId: toUserId(msg.senderUserId),
    senderCharacterId: msg.senderCharacterId ? toCharacterId(msg.senderCharacterId) : null,
    kind: msg.kind as TextMessage['kind'],
    body: msg.body,
    createdAt: msg.createdAt,
  };
}

const connected = ref(false);
const connectionError = ref<string | null>(null);
const sessionStatus = ref('connecting');

onMounted(async () => {
  try {
    await joinSessionRoom(props.sessionId, {
      onStateChange: (state) => {
        const s = state as Record<string, unknown>;
        if (typeof s.status === 'string') {
          sessionStatus.value = s.status;
        }
      },
      onTextMessage: (msg) => {
        chatStore.addMessage(mapTextMessage(msg));
      },
      onChatHistory: (messages) => {
        chatStore.setMessages(messages.map(mapTextMessage));
      },
      onError: (code, message) => {
        connectionError.value = message ?? `Connection error (code: ${code})`;
      },
      onLeave: () => {
        connected.value = false;
      },
    });

    connected.value = true;
    sessionStatus.value = 'connected';
    requestChatHistory();
  } catch (e: unknown) {
    connectionError.value = e instanceof Error ? e.message : 'Failed to connect';
  }
});

onUnmounted(async () => {
  await leaveSessionRoom();
  chatStore.clear();
});
</script>

<template>
  <div class="session-play">
    <header class="session-play__header">
      <h1>Session</h1>
      <span class="session-play__status">{{ sessionStatus }}</span>
      <span v-if="authStore.user" class="session-play__user">{{ authStore.user.name }}</span>
    </header>

    <div v-if="connectionError" class="session-play__error">
      {{ connectionError }}
    </div>

    <div v-else class="session-play__layout">
      <main class="session-play__main">
        <p>Session: {{ sessionId }}</p>
        <p>Game area — actions and scene display will go here.</p>
      </main>

      <aside class="session-play__sidebar">
        <TextChatPanel />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.session-play {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0f0f23;
  color: #e0e0e0;
}

.session-play__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  border-bottom: 1px solid #333;
  background: #16213e;
}

.session-play__header h1 {
  margin: 0;
  font-size: 18px;
}

.session-play__status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: #0f3460;
}

.session-play__user {
  margin-left: auto;
  font-size: 13px;
  color: #999;
}

.session-play__error {
  padding: 24px;
  text-align: center;
  color: #e74c3c;
}

.session-play__layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.session-play__main {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.session-play__sidebar {
  width: 320px;
  min-width: 280px;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .session-play__layout {
    flex-direction: column;
  }

  .session-play__sidebar {
    width: 100%;
    min-width: unset;
    height: 40vh;
    border-left: none;
    border-top: 1px solid #333;
  }
}
</style>
