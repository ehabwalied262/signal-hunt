import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'BDR' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      // Cookie is set by the server — no token handling needed here
      const response = await apiClient.post('/auth/login', { email, password });
      const { user } = response.data;

      // Fetch CSRF token now that we're authenticated
      await apiClient.get('/auth/csrf-token');

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      // Tell the server to clear the httpOnly cookie
      await apiClient.post('/auth/logout');
    } catch {
      // Continue with client-side cleanup even if server call fails
    }

    set({
      user: null,
      isAuthenticated: false,
    });

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  loadFromStorage: async () => {
    try {
      // Verify the cookie is still valid by fetching the profile
      const response = await apiClient.get('/auth/profile');
      const user = response.data;

      // Refresh CSRF token on page load
      await apiClient.get('/auth/csrf-token');

      set({ user, isAuthenticated: true });
    } catch {
      // Cookie missing or expired — stay logged out
      set({ user: null, isAuthenticated: false });
    }
  },
}));