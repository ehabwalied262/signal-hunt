'use client';

import { Phone } from 'lucide-react';

/**
 * Dialer page — Phase 3/4 implementation.
 * Will contain the Twilio Client SDK integration.
 */
export default function DialerPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="rounded-full bg-blue-50 p-6">
        <Phone className="h-12 w-12 text-blue-600" />
      </div>
      <h1 className="mt-4 text-xl font-bold text-gray-900">Dialer</h1>
      <p className="mt-2 text-sm text-gray-500">
        The dialer will be available here once the Twilio integration is
        configured.
      </p>
      <p className="mt-1 text-xs text-gray-400">
        For now, use the &ldquo;Call Now&rdquo; button on each lead&apos;s detail page.
      </p>
    </div>
  );
}
