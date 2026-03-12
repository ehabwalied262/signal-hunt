'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { CallWidget } from '@/components/call/call-widget';
import { useAuthStore } from '@/store/auth.store';
import { useSocket } from '@/hooks/use-socket';

/**
 * Dashboard layout — sidebar + top bar + main content + call widget.
 *
 * Protected: redirects to /login if not authenticated.
 * Initializes WebSocket connection for real-time call updates.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loadFromStorage } = useAuthStore();

  // Initialize WebSocket connection for call status updates
  useSocket();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    // Small delay to allow loadFromStorage to complete
    const timer = setTimeout(() => {
      if (!useAuthStore.getState().isAuthenticated) {
        router.push('/login');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Floating call widget — appears when a call is active */}
      <CallWidget />
    </div>
  );
}
