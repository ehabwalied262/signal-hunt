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
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, accessToken } = response.data;

      // Persist to localStorage
      localStorage.setItem('signalhunt_token', accessToken);
      localStorage.setItem('signalhunt_user', JSON.stringify(user));

      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('signalhunt_token');
    localStorage.removeItem('signalhunt_user');

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('signalhunt_token');
    const userStr = localStorage.getItem('signalhunt_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        // Corrupt storage — clear it
        localStorage.removeItem('signalhunt_token');
        localStorage.removeItem('signalhunt_user');
      }
    }
  },
}));
