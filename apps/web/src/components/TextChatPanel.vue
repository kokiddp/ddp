<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useTextChatStore } from '../stores/useTextChatStore.js';
import { sendTextMessage } from '../services/colyseus.service.js';
import { useAuthStore } from '../stores/useAuthStore.js';

interface PlayerInfo {
  userId: string;
  userName: string;
  characterName: string | null;
}

const props = defineProps<{
  senderCharacterId?: string;
  playerInfoMap?: Map<string, PlayerInfo>;
}>();

const chatStore = useTextChatStore();
const authStore = useAuthStore();

const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

function handleSend(): void {
  const body = messageInput.value.trim();
  if (!body) return;
  sendTextMessage(body, props.senderCharacterId);
  messageInput.value = '';
}

function scrollToBottom(): void {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(() => chatStore.messages.length, scrollToBottom);

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isOwnMessage(senderUserId: string): boolean {
  return senderUserId === authStore.user?.$id;
}

function senderTooltip(senderUserId: string): string {
  const info = props.playerInfoMap?.get(senderUserId);
  if (!info) return senderUserId;
  const parts: string[] = [];
  if (info.characterName) parts.push(`Character: ${info.characterName}`);
  parts.push(`User: ${info.userName}`);
  parts.push(`ID: ${info.userId}`);
  return parts.join('\n');
}
</script>

<template>
  <div class="chat-panel">
    <div class="chat-header">
      <h3>Chat</h3>
    </div>

    <div ref="messagesContainer" class="chat-messages">
      <div
        v-for="(msg, i) in chatStore.messages"
        :key="i"
        class="chat-message"
        :class="{
          'chat-message--own': isOwnMessage(msg.senderUserId),
          'chat-message--system': msg.kind === 'system',
        }"
      >
        <template v-if="msg.kind === 'system'">
          <div class="chat-message__system">{{ msg.body }}</div>
        </template>
        <template v-else>
          <div class="chat-message__meta">
            <span class="chat-message__sender" :title="senderTooltip(msg.senderUserId)">{{ msg.senderDisplayName || msg.senderUserId }}</span>
            <span class="chat-message__time">{{ formatTime(msg.createdAt) }}</span>
          </div>
          <div class="chat-message__body">{{ msg.body }}</div>
        </template>
      </div>

      <div v-if="chatStore.messages.length === 0" class="chat-empty">
        No messages yet.
      </div>
    </div>

    <form class="chat-input" @submit.prevent="handleSend">
      <input
        v-model="messageInput"
        type="text"
        placeholder="Type a message..."
        maxlength="5000"
        autocomplete="off"
      />
      <button type="submit" :disabled="!messageInput.trim()">Send</button>
    </form>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a2e;
}

.chat-header {
  padding: 8px 12px;
  border-bottom: 1px solid #333;
  background: #16213e;
}

.chat-header h3 {
  margin: 0;
  font-size: 14px;
  color: #e0e0e0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-message {
  max-width: 85%;
}

.chat-message--own {
  align-self: flex-end;
}

.chat-message--own .chat-message__body {
  background: #0f3460;
}

.chat-message--system .chat-message__system {
  text-align: center;
  color: #888;
  font-size: 12px;
  font-style: italic;
  width: 100%;
}

.chat-message--system {
  align-self: center;
  max-width: 100%;
}

.chat-message__meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #999;
  margin-bottom: 2px;
}

.chat-message__sender {
  font-weight: 600;
  color: #c0c0c0;
  cursor: default;
}

.chat-message__body {
  background: #2a2a4a;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: #e0e0e0;
  word-break: break-word;
}

.chat-empty {
  text-align: center;
  color: #666;
  padding: 24px 0;
  font-size: 13px;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #333;
  background: #16213e;
}

.chat-input input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #1a1a2e;
  color: #e0e0e0;
  font-size: 13px;
}

.chat-input input:focus {
  outline: none;
  border-color: #0f3460;
}

.chat-input button {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: #0f3460;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 13px;
}

.chat-input button:hover:not(:disabled) {
  background: #1a4f8a;
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
