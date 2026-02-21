import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';

export interface Message {
  id?: number;
  role: 'user' | 'model';
  content: string;
}

export interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore();
  const conversations = ref<Conversation[]>([]);
  const currentConversation = ref<Conversation | null>(null);
  const messages = ref<Message[]>([]);
  const loading = ref(false);

  async function fetchConversations() {
    if (!auth.user) return;
    const res = await fetch(`/api/conversations?userId=${auth.user.id}`);
    conversations.value = await res.json();
  }

  async function selectConversation(conv: Conversation) {
    currentConversation.value = conv;
    const res = await fetch(`/api/conversations/${conv.id}/messages`);
    messages.value = await res.json();
  }

  async function createConversation(title: string) {
    if (!auth.user) return;
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: auth.user.id, title }),
    });
    const newConv = await res.json();
    conversations.value.unshift(newConv);
    await selectConversation(newConv);
    return newConv;
  }

  async function addMessage(convId: number, role: 'user' | 'model', content: string) {
    await fetch(`/api/conversations/${convId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content }),
    });
    if (currentConversation.value?.id === convId) {
      messages.value.push({ role, content });
    }
  }

  async function deleteConversation(id: number) {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    conversations.value = conversations.value.filter(c => c.id !== id);
    if (currentConversation.value?.id === id) {
      currentConversation.value = null;
      messages.value = [];
    }
  }

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    fetchConversations,
    selectConversation,
    createConversation,
    addMessage,
    deleteConversation
  };
});
