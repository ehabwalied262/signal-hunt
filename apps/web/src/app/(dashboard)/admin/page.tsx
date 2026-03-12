'use client';

import { BarChart3, Phone, Users, Clock } from 'lucide-react';

/**
 * Admin dashboard — Phase 6 implementation.
 * Placeholder with metric card layout.
 */
export default function AdminPage() {
  const stats = [
    {
      label: 'Total Calls Today',
      value: '—',
      icon: Phone,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Conversations (>1 min)',
      value: '—',
      icon: Clock,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Active Agents',
      value: '—',
      icon: Users,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Connect Rate',
      value: '—',
      icon: BarChart3,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Admin Dashboard
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder for BDR table */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          BDR Performance
        </h2>
        <p className="py-8 text-center text-sm text-gray-400">
          Agent performance metrics will appear here once calls are being made.
        </p>
      </div>
    </div>
  );
}
