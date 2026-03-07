import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { TextMessage } from '@ddp/shared-types';

export const useTextChatStore = defineStore('textChat', () => {
  const messages = ref<TextMessage[]>([]);
  const loading = ref(false);

  function addMessage(msg: TextMessage): void {
    messages.value.push(msg);
  }

  function setMessages(list: TextMessage[]): void {
    messages.value = list;
  }

  function clear(): void {
    messages.value = [];
  }

  return { messages, loading, addMessage, setMessages, clear };
});
