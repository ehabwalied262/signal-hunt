'use client';

import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import { useCallStore } from '@/store/call.store';
import { useCall } from '@/hooks/use-call';
import { CallTimer } from './call-timer';
import { DispositionForm } from './disposition-form';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/**
 * Floating call widget.
 *
 * Appears at the bottom-right of the screen when a call is active.
 * Shows:
 *   - Lead company name
 *   - Call status (Initiating / Ringing / On Call)
 *   - Live timer (starts when call is answered)
 *   - Hang Up button
 *
 * After the call ends, shows the DispositionForm modal.
 */
export function CallWidget() {
  const { activeCall, isOnCall, showDispositionForm, clearCall, setShowDisposition } =
    useCallStore();
  const { endCall, submitDisposition } = useCall();
  const [leadName, setLeadName] = useState<string>('');
  const [isEnding, setIsEnding] = useState(false);

  // Fetch lead name when call becomes active
  useEffect(() => {
    if (!activeCall?.leadId) {
      setLeadName('');
      return;
    }

    apiClient
      .get(`/leads/${activeCall.leadId}`)
      .then((res) => {
        setLeadName(res.data.companyName || 'Unknown Lead');
      })
      .catch(() => {
        setLeadName('Lead');
      });
  }, [activeCall?.leadId]);

  const handleEndCall = async () => {
    setIsEnding(true);
    try {
      await endCall();
    } catch {
      // Error will be handled via WebSocket status update
    } finally {
      setIsEnding(false);
    }
  };

  const handleDispositionSubmit = async (data: {
    callId: string;
    type: string;
    notes?: string;
    painPoints?: string;
    callbackScheduledAt?: string;
  }) => {
    await submitDisposition(data);
  };

  const handleDispositionSkip = () => {
    clearCall();
  };

  // Don't render if no active call and no disposition form
  if (!activeCall && !showDispositionForm) {
    return null;
  }

  // Show disposition form as a modal
  if (showDispositionForm && activeCall) {
    return (
      <DispositionForm
        callId={activeCall.callId}
        onSubmit={handleDispositionSubmit}
        onSkip={handleDispositionSkip}
      />
    );
  }

  // Show the floating call widget
  if (!isOnCall || !activeCall) return null;

  const statusLabel =
    activeCall.status === 'INITIATING'
      ? 'Connecting...'
      : activeCall.status === 'RINGING'
        ? 'Ringing...'
        : 'On Call';

  const statusColor =
    activeCall.status === 'INITIATING'
      ? 'bg-gray-500'
      : activeCall.status === 'RINGING'
        ? 'bg-yellow-500'
        : 'bg-green-500';

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      {/* Status bar */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white',
          activeCall.status === 'IN_PROGRESS'
            ? 'bg-green-600'
            : activeCall.status === 'RINGING'
              ? 'bg-yellow-600'
              : 'bg-gray-600',
        )}
      >
        <div className="relative flex h-2 w-2">
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              statusColor,
            )}
          />
          <span
            className={cn(
              'relative inline-flex h-2 w-2 rounded-full',
              statusColor,
            )}
          />
        </div>
        {statusLabel}
      </div>

      {/* Call info */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{leadName}</p>
            <div className="mt-1 flex items-center gap-2">
              {activeCall.status === 'IN_PROGRESS' ? (
                <CallTimer
                  startFrom={activeCall.answeredAt}
                  isRunning={activeCall.status === 'IN_PROGRESS'}
                />
              ) : (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  {activeCall.status === 'RINGING' && (
                    <>
                      <Phone className="h-3.5 w-3.5 animate-bounce" />
                      <span>Waiting for answer...</span>
                    </>
                  )}
                  {activeCall.status === 'INITIATING' && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Setting up call...</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hang up button */}
          <button
            onClick={handleEndCall}
            disabled={isEnding}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl active:scale-95 disabled:bg-red-400"
            title="End Call"
          >
            {isEnding ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PhoneOff className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mock mode indicator */}
      <div className="border-t border-gray-100 bg-amber-50 px-4 py-1.5">
        <p className="text-center text-xs text-amber-600">
          Mock Mode — No real call
        </p>
      </div>
    </div>
  );
}
