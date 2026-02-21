<template>
  <div class="flex h-screen bg-white">
    <!-- Sidebar -->
    <aside class="w-72 border-r border-zinc-200 flex flex-col bg-zinc-50">
      <div class="p-4 border-b border-zinc-200 flex items-center justify-between bg-white">
        <h2 class="font-bold text-lg tracking-tight">Conversations</h2>
        <button 
          @click="createNewChat"
          class="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          title="New Chat"
        >
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div 
          v-for="conv in chatStore.conversations" 
          :key="conv.id"
          @click="chatStore.selectConversation(conv)"
          class="group relative flex items-center p-3 rounded-xl cursor-pointer transition-all"
          :class="chatStore.currentConversation?.id === conv.id ? 'bg-white shadow-sm border border-zinc-200' : 'hover:bg-zinc-200/50'"
        >
          <MessageSquareIcon class="w-4 h-4 mr-3 text-zinc-400" />
          <span class="text-sm font-medium truncate flex-1">{{ conv.title }}</span>
          <button 
            @click.stop="chatStore.deleteConversation(conv.id)"
            class="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 rounded transition-all"
          >
            <Trash2Icon class="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      <div class="p-4 border-t border-zinc-200 bg-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {{ authStore.user?.username[0].toUpperCase() }}
            </div>
            <span class="text-sm font-medium">{{ authStore.user?.username }}</span>
          </div>
          <button @click="handleLogout" class="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <LogOutIcon class="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Chat Area -->
    <main class="flex-1 flex flex-col relative bg-white">
      <header class="h-16 border-b border-zinc-200 flex items-center px-6 justify-between">
        <h1 class="font-semibold">{{ chatStore.currentConversation?.title || 'New Conversation' }}</h1>
        <div class="flex items-center space-x-2">
          <div v-if="chatStore.loading" class="flex items-center space-x-2 text-xs text-zinc-400">
            <div class="w-2 h-2 bg-zinc-400 rounded-full animate-pulse"></div>
            <span>Gemini is thinking...</span>
          </div>
        </div>
      </header>

      <!-- Messages -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6" ref="messageContainer">
        <div v-if="!chatStore.currentConversation && chatStore.messages.length === 0" class="h-full flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-4">
            <SparklesIcon class="w-8 h-8 text-zinc-400" />
          </div>
          <h3 class="text-xl font-bold">How can I help you today?</h3>
          <p class="text-zinc-500 mt-2 max-w-sm">Start a new conversation or select one from the sidebar to begin chatting with Gemini.</p>
        </div>

        <div 
          v-for="(msg, index) in chatStore.messages" 
          :key="index"
          class="flex"
          :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div 
            class="max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed"
            :class="msg.role === 'user' ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-100 text-zinc-800'"
          >
            {{ msg.content }}
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-6 border-t border-zinc-200">
        <div class="max-w-4xl mx-auto relative">
          <textarea
            v-model="input"
            @keydown.enter.prevent="handleSend"
            placeholder="Message Gemini..."
            rows="1"
            class="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all resize-none"
          ></textarea>
          <button 
            @click="handleSend"
            :disabled="!input.trim() || chatStore.loading"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SendIcon class="w-4 h-4" />
          </button>
        </div>
        <p class="text-[10px] text-center text-zinc-400 mt-3 uppercase tracking-widest font-medium">
          Vibe coded in 5 mins
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { 
  PlusIcon, 
  MessageSquareIcon, 
  Trash2Icon, 
  LogOutIcon, 
  SendIcon, 
  SparklesIcon 
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';
import { generateResponse } from '../services/gemini';

const authStore = useAuthStore();
const chatStore = useChatStore();
const router = useRouter();
const input = ref('');
const messageContainer = ref<HTMLElement | null>(null);

onMounted(async () => {
  await chatStore.fetchConversations();
});

function handleLogout() {
  authStore.logout();
  router.push({ name: 'login' });
}

async function createNewChat() {
  chatStore.currentConversation = null;
  chatStore.messages = [];
  input.value = '';
}

async function handleSend() {
  if (!input.value.trim() || chatStore.loading) return;

  const userMessage = input.value.trim();
  input.value = '';

  let conv = chatStore.currentConversation;
  if (!conv) {
    conv = await chatStore.createConversation(userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : ''));
  }

  if (!conv) return;

  // Add user message to store and DB
  await chatStore.addMessage(conv.id, 'user', userMessage);
  scrollToBottom();

  chatStore.loading = true;
  try {
    // Prepare history for Gemini
    const history = chatStore.messages.slice(0, -1).map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const aiResponse = await generateResponse(userMessage, history);
    
    // Add AI message to store and DB
    await chatStore.addMessage(conv.id, 'model', aiResponse || 'Sorry, I could not generate a response.');
    scrollToBottom();
  } catch (error) {
    console.error('Gemini error:', error);
    await chatStore.addMessage(conv.id, 'model', 'An error occurred while communicating with the AI.');
  } finally {
    chatStore.loading = false;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  });
}

watch(() => chatStore.messages.length, scrollToBottom);
</script>
