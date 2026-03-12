'use client';

import { Settings } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Reports</h1>
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white">
        <Settings className="h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          Disposition reports and analytics will be available in Phase 6.
        </p>
      </div>
    </div>
  );
}
