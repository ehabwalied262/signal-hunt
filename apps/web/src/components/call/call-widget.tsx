'use client';

import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import { useCallStore } from '@/store/call.store';
import { useCall } from '@/hooks/use-call';
import { CallTimer } from './call-timer';
import { DispositionForm } from './disposition-form';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function CallWidget() {
  const { activeCall, isOnCall, showDispositionForm, clearCall } = useCallStore();
  const { endCall, submitDisposition } = useCall();
  const [leadInfo, setLeadInfo] = useState<{ contactName: string; companyName: string }>({
    contactName: '',
    companyName: '',
  });
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    if (!activeCall?.leadId) {
      setLeadInfo({ contactName: '', companyName: '' });
      return;
    }
    apiClient
      .get(`/leads/${activeCall.leadId}`)
      .then((res) => {
        setLeadInfo({
          contactName: res.data.contactName || 'Unknown Contact',
          companyName: res.data.companyName || '',
        });
      })
      .catch(() => {
        setLeadInfo({ contactName: 'Lead', companyName: '' });
      });
  }, [activeCall?.leadId]);

  const handleEndCall = async () => {
    setIsEnding(true);
    try {
      await endCall(activeCall?.callId);
    } catch {
      // handled via WebSocket
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

  if (!activeCall && !showDispositionForm) return null;

  if (showDispositionForm && activeCall) {
    return (
      <DispositionForm
        callId={activeCall.callId}
        onSubmit={handleDispositionSubmit}
        onSkip={handleDispositionSkip}
      />
    );
  }

  if (!isOnCall || !activeCall) return null;

  const statusLabel =
    activeCall.status === 'INITIATING'
      ? 'Connecting...'
      : activeCall.status === 'RINGING'
        ? 'Ringing...'
        : 'On Call';

  const statusBarColor =
    activeCall.status === 'IN_PROGRESS'
      ? 'bg-green-600'
      : activeCall.status === 'RINGING'
        ? 'bg-yellow-600'
        : 'bg-gray-600';

  const dotColor =
    activeCall.status === 'IN_PROGRESS'
      ? 'bg-green-400'
      : activeCall.status === 'RINGING'
        ? 'bg-yellow-400'
        : 'bg-gray-400';

  return (
    <div
      className="fixed bottom-6 right-6 z-40 w-80 overflow-hidden rounded-2xl shadow-2xl"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
    >
      {/* Status bar */}
      <div className={cn('flex items-center gap-2 px-4 py-2 text-sm font-medium text-white', statusBarColor)}>
        <div className="relative flex h-2 w-2">
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', dotColor)} />
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', dotColor)} />
        </div>
        {statusLabel}
      </div>

      {/* Call info */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {leadInfo.contactName}
            </p>
            {leadInfo.companyName && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {leadInfo.companyName}
              </p>
            )}
            <div className="mt-1">
              {activeCall.status === 'IN_PROGRESS' ? (
                <CallTimer
                  startFrom={activeCall.answeredAt}
                  isRunning={activeCall.status === 'IN_PROGRESS'}
                />
              ) : (
                <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
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
      <div
        className="border-t px-4 py-1.5"
        style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--accent-soft)' }}
      >
        <p className="text-center text-xs" style={{ color: 'var(--accent-text)' }}>
          Mock Mode — No real call
        </p>
      </div>
    </div>
  );
}