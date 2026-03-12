'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useCallStore } from '@/store/call.store';

/**
 * Hook for call management actions.
 *
 * Provides initiateCall and endCall functions that talk to the API,
 * plus loading/error state for the UI.
 */
export function useCall() {
  const [isInitiating, setIsInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeCall, clearCall } = useCallStore();

  /**
   * Start an outbound call to a lead.
   * The backend handles concurrency, ownership, and provider selection.
   * Status updates arrive via WebSocket → call store.
   */
  const initiateCall = useCallback(async (leadId: string) => {
    setIsInitiating(true);
    setError(null);

    try {
      const response = await apiClient.post('/calls/initiate', { leadId });
      return response.data;
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Failed to initiate call';
      setError(message);
      throw err;
    } finally {
      setIsInitiating(false);
    }
  }, []);

  /**
   * End the currently active call.
   * The backend sends a hangup command to the provider.
   * COMPLETED status arrives via webhook → WebSocket → call store.
   */
  const endCall = useCallback(async () => {
    if (!activeCall?.callId) return;
    setError(null);

    try {
      await apiClient.post(`/calls/${activeCall.callId}/end`);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to end call';
      setError(message);
      throw err;
    }
  }, [activeCall?.callId]);

  /**
   * Submit a disposition for a completed call.
   */
  const submitDisposition = useCallback(
    async (data: {
      callId: string;
      type: string;
      notes?: string;
      painPoints?: string;
      callbackScheduledAt?: string;
    }) => {
      setError(null);

      try {
        const response = await apiClient.post('/dispositions', data);
        clearCall();
        return response.data;
      } catch (err: any) {
        const message =
          err.response?.data?.message || 'Failed to submit disposition';
        setError(message);
        throw err;
      }
    },
    [clearCall],
  );

  return {
    initiateCall,
    endCall,
    submitDisposition,
    isInitiating,
    error,
    clearError: () => setError(null),
  };
}
