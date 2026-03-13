import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

export interface ThemeBackground {
  value: string;
  label: string;
}

export const LIGHT_BACKGROUNDS: ThemeBackground[] = [
  { value: '#ffffff', label: 'White' },
  { value: '#fefae0', label: 'Warm Cream' },
  { value: '#faedcd', label: 'Soft Sand' },
  { value: '#f4f1de', label: 'Ivory' },
];

export const DARK_BACKGROUNDS: ThemeBackground[] = [
  { value: '#212529', label: 'Charcoal' },
  { value: '#111111', label: 'Midnight' },
  { value: '#343434', label: 'Slate' },
];

interface ThemeState {
  mode: ThemeMode;
  lightBg: string;
  darkBg: string;

  setMode: (mode: ThemeMode) => void;
  setLightBg: (bg: string) => void;
  setDarkBg: (bg: string) => void;
  toggleMode: () => void;
  loadFromStorage: () => void;
  applyTheme: (mode: ThemeMode, lightBg: string, darkBg: string) => void;
}

const STORAGE_KEY = 'signalhunt_theme';

function saveToStorage(state: { mode: ThemeMode; lightBg: string; darkBg: string }) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

/**
 * THIS is the missing piece — sets data-theme on <html> so globals.css
 * dark variables actually activate, and overrides --background with the
 * user-chosen background swatch.
 */
function applyToDom(mode: ThemeMode, lightBg: string, darkBg: string) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.style.setProperty(
    '--background',
    mode === 'dark' ? darkBg : lightBg,
  );
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  lightBg: '#ffffff',
  darkBg: '#212529',

  applyTheme: (mode, lightBg, darkBg) => {
    applyToDom(mode, lightBg, darkBg);
  },

  setMode: (mode) => {
    const { lightBg, darkBg } = get();
    set({ mode });
    applyToDom(mode, lightBg, darkBg);
    saveToStorage({ ...get(), mode });
  },

  setLightBg: (lightBg) => {
    const { mode, darkBg } = get();
    set({ lightBg });
    applyToDom(mode, lightBg, darkBg);
    saveToStorage({ ...get(), lightBg });
  },

  setDarkBg: (darkBg) => {
    const { mode, lightBg } = get();
    set({ darkBg });
    applyToDom(mode, lightBg, darkBg);
    saveToStorage({ ...get(), darkBg });
  },

  toggleMode: () => {
    const { mode, lightBg, darkBg } = get();
    const newMode = mode === 'light' ? 'dark' : 'light';
    set({ mode: newMode });
    applyToDom(newMode, lightBg, darkBg);
    saveToStorage({ ...get(), mode: newMode });
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const mode = parsed.mode || 'light';
        const lightBg = parsed.lightBg || '#ffffff';
        const darkBg = parsed.darkBg || '#212529';
        set({ mode, lightBg, darkBg });
        applyToDom(mode, lightBg, darkBg);
      } catch {
        // Corrupt storage — ignore
      }
    } else {
      // No stored theme — apply default (light)
      applyToDom('light', '#ffffff', '#212529');
    }
  },
}));