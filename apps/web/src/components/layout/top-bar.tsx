'use client';

import { useCallStore } from '@/store/call.store';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { activeCall, isOnCall } = useCallStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />

      {/* Call status indicator */}
      {isOnCall && activeCall && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium',
            activeCall.status === 'RINGING'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-green-50 text-green-700',
          )}
        >
          {activeCall.status === 'RINGING' ? (
            <Phone className="h-4 w-4 animate-pulse" />
          ) : (
            <PhoneOff className="h-4 w-4" />
          )}
          {activeCall.status === 'RINGING' ? 'Ringing...' : 'On Call'}
        </div>
      )}
    </header>
  );
}
