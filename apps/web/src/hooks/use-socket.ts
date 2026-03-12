'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import { useCallStore } from '@/store/call.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * WebSocket hook for real-time call status updates.
 *
 * Connects to the NestJS /calls namespace with the current user's ID.
 * Listens for call:status events and updates the call store.
 *
 * Usage: Call once at the dashboard layout level.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuthStore();
  const { setCallStatus } = useCallStore();

  useEffect(() => {
    if (!user?.id) return;

    // Connect to the /calls namespace
    const socket = io(`${API_URL}/calls`, {
      query: { userId: user.id },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Connected to /calls namespace');
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
    });

    // Listen for call status updates from the server
    socket.on('call:status', (data) => {
      console.log('[WS] call:status', data);
      setCallStatus({
        callId: data.callId,
        leadId: data.leadId,
        status: data.status,
        startedAt: data.startedAt,
        answeredAt: data.answeredAt,
        endedAt: data.endedAt,
        duration: data.duration,
      });
    });

    // Listen for recording ready events
    socket.on('call:recording_ready', (data) => {
      console.log('[WS] call:recording_ready', data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, setCallStatus]);

  const getSocket = useCallback(() => socketRef.current, []);

  return { getSocket };
}
