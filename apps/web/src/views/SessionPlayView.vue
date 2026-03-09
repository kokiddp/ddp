<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useTextChatStore } from '../stores/useTextChatStore.js';
import { useVoiceChatStore } from '../stores/useVoiceChatStore.js';
import { useActiveSessionStore } from '../stores/useActiveSessionStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import {
  joinSessionRoom,
  leaveSessionRoom,
  requestChatHistory,
  sendStartSession,
  sendPauseSession,
  sendEndSession,
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
const voiceStore = useVoiceChatStore();
const sessionStore = useActiveSessionStore();
const authStore = useAuthStore();

function mapTextMessage(msg: {
  gameSessionId: string;
  senderUserId: string;
  senderCharacterId: string | null;
  senderDisplayName: string | null;
  kind: string;
  body: string;
  createdAt: string;
}): TextMessage {
  return {
    id: textMessageId(''),
    gameSessionId: toGameSessionId(msg.gameSessionId),
    senderUserId: toUserId(msg.senderUserId),
    senderCharacterId: msg.senderCharacterId ? toCharacterId(msg.senderCharacterId) : null,
    senderDisplayName: msg.senderDisplayName ?? null,
    kind: msg.kind as TextMessage['kind'],
    body: msg.body,
    createdAt: msg.createdAt,
  };
}

const connected = ref(false);
const connectionError = ref<string | null>(null);
const sessionStatus = ref('connecting');

const textChatEnabled = computed(() => sessionStore.session?.['textChatEnabled'] === true);
const voiceChatEnabled = computed(() => sessionStore.session?.['voiceChatEnabled'] === true);
const isHost = computed(() => {
  if (!authStore.user || !sessionStore.session) return false;
  return sessionStore.session['hostUserId'] === authStore.user.$id;
});
const myCharacterId = computed(() => {
  if (!authStore.user) return undefined;
  const player = sessionStore.players.find((p) => p.userId === authStore.user!.$id);
  return (player?.characterId as string) || undefined;
});

onMounted(async () => {
  // Load session metadata from Appwrite
  await sessionStore.loadSession(props.sessionId);

  try {
    const hostUserId = sessionStore.session?.['hostUserId'] as string | undefined;
    await joinSessionRoom(props.sessionId, {
      onSessionStatus: (data) => {
        sessionStatus.value = data.status;
      },
      onTextMessage: (msg) => {
        chatStore.addMessage(mapTextMessage(msg));
      },
      onChatHistory: (messages) => {
        chatStore.setMessages(messages.map(mapTextMessage));
      },
      onPlayerJoined: () => { /* handled by Colyseus state sync */ },
      onPlayerLeft: () => { /* handled by Colyseus state sync */ },
      onPlayerReady: () => { /* handled by Colyseus state sync */ },
      onError: (code, message) => {
        connectionError.value = message ?? `Connection error (code: ${code})`;
      },
      onLeave: () => {
        connected.value = false;
      },
    }, hostUserId);

    connected.value = true;
    sessionStatus.value = 'connected';
    requestChatHistory();
  } catch (e: unknown) {
    connectionError.value = e instanceof Error ? e.message : 'Failed to connect';
  }
});

onUnmounted(async () => {
  if (voiceStore.joined) {
    await voiceStore.leave();
  }
  await leaveSessionRoom();
  chatStore.clear();
});

async function handleJoinVoice() {
  await voiceStore.join(props.sessionId);
}

async function handleLeaveVoice() {
  await voiceStore.leave();
}

async function handleToggleMic() {
  await voiceStore.setMicrophoneEnabled(!voiceStore.microphoneEnabled);
}

function handleToggleSpeaker() {
  voiceStore.setSpeakerEnabled(!voiceStore.speakerEnabled);
}
</script>

<template>
  <div class="session-play">
    <header class="session-play__header">
      <h1>Session</h1>
      <span class="session-play__status" :class="'status--' + sessionStatus">{{ sessionStatus }}</span>
      <div v-if="connected && isHost" class="session-play__header-actions">
        <button v-if="sessionStatus === 'lobby'" class="btn-sm btn-host" @click="sendStartSession">Start</button>
        <button v-if="sessionStatus === 'active'" class="btn-sm btn-host" @click="sendPauseSession">Pause</button>
        <button v-if="sessionStatus !== 'ended'" class="btn-sm btn-danger-sm" @click="sendEndSession">End</button>
      </div>
      <span v-if="authStore.user" class="session-play__user">{{ authStore.user.name }}</span>
    </header>

    <div v-if="connectionError" class="session-play__error">
      {{ connectionError }}
    </div>

    <div v-else class="session-play__layout">
      <main class="session-play__main">
        <div class="game-area">
          <p class="game-area__info">Session: {{ sessionId }}</p>
          <p class="game-area__placeholder">Game area — actions and scene display will go here.</p>
        </div>

        <!-- Voice chat controls -->
        <div v-if="voiceChatEnabled" class="voice-panel">
          <div class="voice-panel__header">
            <h3>Voice Chat</h3>
            <span v-if="voiceStore.connecting" class="voice-connecting">Connecting...</span>
          </div>

          <div v-if="voiceStore.error" class="voice-error">{{ voiceStore.error }}</div>

          <div v-if="!voiceStore.joined" class="voice-panel__join">
            <button class="btn-voice btn-join" :disabled="voiceStore.connecting" @click="handleJoinVoice">
              Join Voice
            </button>
          </div>

          <div v-else class="voice-panel__controls">
            <div class="voice-buttons">
              <button
                class="btn-voice"
                :class="{ 'btn-active': voiceStore.microphoneEnabled }"
                @click="handleToggleMic"
              >
                {{ voiceStore.microphoneEnabled ? 'Mute Mic' : 'Unmute Mic' }}
              </button>
              <button
                class="btn-voice"
                :class="{ 'btn-active': !voiceStore.speakerEnabled }"
                @click="handleToggleSpeaker"
              >
                {{ voiceStore.speakerEnabled ? 'Deafen' : 'Undeafen' }}
              </button>
              <button class="btn-voice btn-leave" @click="handleLeaveVoice">
                Leave Voice
              </button>
            </div>

            <div v-if="voiceStore.participants.length > 0" class="voice-participants">
              <span class="voice-participants__label">In voice ({{ voiceStore.participants.length }}):</span>
              <span
                v-for="p in voiceStore.participants"
                :key="p"
                class="voice-participant"
              >{{ p }}</span>
            </div>
          </div>
        </div>

        <div v-if="!voiceChatEnabled && connected" class="feature-disabled">
          Voice chat is disabled for this session.
        </div>
      </main>

      <aside v-if="textChatEnabled" class="session-play__sidebar">
        <TextChatPanel :sender-character-id="myCharacterId" />
      </aside>

      <aside v-else-if="connected" class="session-play__sidebar session-play__sidebar--disabled">
        <div class="feature-disabled">Text chat is disabled for this session.</div>
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
  gap: 12px;
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
  text-transform: capitalize;
}

.status--connected,
.status--active {
  background: #1a3a1a;
  color: #60c060;
}

.status--lobby {
  background: #2a2a4a;
  color: #a0a0ff;
}

.status--paused {
  background: #3a3a1a;
  color: #c0c060;
}

.status--ended {
  background: #2a2a2a;
  color: #808080;
}

.status--connecting {
  background: #3a2a1a;
  color: #c0a060;
}

.session-play__header-actions {
  display: flex;
  gap: 6px;
}

.btn-sm {
  padding: 3px 10px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.btn-host {
  background: #2a4a8a;
  color: #e0e0e0;
}

.btn-host:hover {
  background: #3a5a9a;
}

.btn-danger-sm {
  background: #8a2a2a;
  color: #e0e0e0;
}

.btn-danger-sm:hover {
  background: #a04040;
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.session-play__sidebar {
  width: 320px;
  min-width: 280px;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.session-play__sidebar--disabled {
  justify-content: center;
  align-items: center;
}

.game-area {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 16px;
}

.game-area__info {
  color: #888;
  font-size: 13px;
  margin-bottom: 8px;
}

.game-area__placeholder {
  color: #666;
  font-style: italic;
}

/* Voice panel */
.voice-panel {
  background: #1a1a2e;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  padding: 12px 16px;
}

.voice-panel__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.voice-panel__header h3 {
  margin: 0;
  font-size: 14px;
}

.voice-connecting {
  font-size: 12px;
  color: #c0a060;
}

.voice-error {
  color: #e74c3c;
  font-size: 13px;
  margin-bottom: 8px;
}

.voice-panel__join {
  text-align: center;
}

.btn-voice {
  padding: 6px 14px;
  border: 1px solid #3a3a4e;
  border-radius: 4px;
  background: #2a2a4a;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 13px;
}

.btn-voice:hover:not(:disabled) {
  background: #3a3a5a;
}

.btn-voice:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-voice.btn-active {
  background: #1a4a3a;
  border-color: #3a7a5a;
}

.btn-join {
  background: #1a3a5a;
  border-color: #3a5a8a;
}

.btn-join:hover:not(:disabled) {
  background: #2a4a6a;
}

.btn-leave {
  background: #4a2a2a;
  border-color: #6a3a3a;
}

.btn-leave:hover {
  background: #5a3a3a;
}

.voice-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.voice-participants {
  margin-top: 10px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.voice-participants__label {
  font-size: 12px;
  color: #888;
}

.voice-participant {
  padding: 2px 8px;
  background: #2a2a4a;
  border-radius: 10px;
  font-size: 12px;
  color: #c0c0e0;
}

.feature-disabled {
  color: #666;
  font-size: 13px;
  font-style: italic;
  text-align: center;
  padding: 16px;
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
