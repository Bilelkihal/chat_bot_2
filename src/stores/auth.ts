import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: number; username: string } | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  );

  async function login(username: string) {
    // Simple login logic
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'password' }), // Mock password
    });
    
    if (res.ok) {
      const userData = await res.json();
      user.value = userData;
      localStorage.setItem('user', JSON.stringify(userData));
      return true;
    }
    return false;
  }

  function logout() {
    user.value = null;
    localStorage.removeItem('user');
  }

  return { user, login, logout };
});
