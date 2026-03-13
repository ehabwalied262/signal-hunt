'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { CallWidget } from '@/components/call/call-widget';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useSocket } from '@/hooks/use-socket';

/**
 * Dashboard layout — sidebar + top bar + main content + call widget.
 *
 * Protected: redirects to /login if not authenticated.
 * Initializes WebSocket connection for real-time call updates.
 * Applies theme mode and background color from theme store.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loadFromStorage } = useAuthStore();
  const { mode, lightBg, darkBg, loadFromStorage: loadTheme } = useThemeStore();

  // Initialize WebSocket connection for call status updates
  useSocket();

  useEffect(() => {
    loadFromStorage();
    loadTheme();
  }, [loadFromStorage, loadTheme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().isAuthenticated) {
        router.push('/login');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);

    // Set the actual background color based on mode
    const bg = mode === 'dark' ? darkBg : lightBg;
    root.style.setProperty('--background', bg);

    // Update CSS variables for dark mode sidebar/card backgrounds
    if (mode === 'dark') {
      // Derive slightly lighter shade for cards from the chosen dark bg
      const lighterBg = lightenColor(bg, 15);
      root.style.setProperty('--card-bg', lighterBg);
      root.style.setProperty('--sidebar-bg', darkenColor(bg, 10));
    }
  }, [mode, lightBg, darkBg]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <CallWidget />
    </div>
  );
}

/** Lighten a hex color by a percentage */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Darken a hex color by a percentage */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
