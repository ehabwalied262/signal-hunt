'use client';

import { useCallStore } from '@/store/call.store';
import { Phone } from 'lucide-react';
import { CallTimer } from '@/components/call/call-timer';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { activeCall, isOnCall } = useCallStore();

  return (
    <header
      className="flex h-14 items-center justify-between px-6"
      style={{
        backgroundColor: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--topbar-border)',
      }}
    >
      <div />

      {isOnCall && activeCall && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium',
            activeCall.status === 'RINGING' || activeCall.status === 'INITIATING'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700',
          )}
        >
          {activeCall.status === 'RINGING' || activeCall.status === 'INITIATING' ? (
            <>
              <Phone className="h-4 w-4 animate-pulse" />
              {activeCall.status === 'INITIATING' ? 'Connecting...' : 'Ringing...'}
            </>
          ) : (
            <>
              <Phone className="h-4 w-4" />
              <span>On Call</span>
              <span className="mx-1 opacity-40">|</span>
              <CallTimer
                startFrom={activeCall.answeredAt}
                isRunning={activeCall.status === 'IN_PROGRESS'}
              />
            </>
          )}
        </div>
      )}
    </header>
  );
}