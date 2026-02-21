<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-zinc-50">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-zinc-200 p-8">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-zinc-900 rounded-2xl mb-4">
          <span class="text-white text-2xl font-bold">G</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p class="text-zinc-500 mt-2">Enter your username to start chatting</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-zinc-700 mb-1">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            class="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
            placeholder="e.g. alex_doe"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const username = ref('');
const loading = ref(false);
const router = useRouter();
const auth = useAuthStore();

async function handleLogin() {
  if (!username.value) return;
  loading.value = true;
  try {
    const success = await auth.login(username.value);
    if (success) {
      router.push({ name: 'chat' });
    }
  } finally {
    loading.value = false;
  }
}
</script>
