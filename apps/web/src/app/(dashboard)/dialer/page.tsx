'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Search,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCall } from '@/hooks/use-call';
import { useCallStore } from '@/store/call.store';
import { cn } from '@/lib/utils';

interface LeadQuick {
  id: string;
  companyName: string;
  contactName: string | null;
  phoneNumber: string;
  status: string;
  country: string | null;
  isWrongNumber: boolean;
}

/**
 * Dialer page — Quick-call interface.
 *
 * Shows leads that are ready to be called (NEW or CONTACTED, not wrong number).
 * Agent can quickly search and one-click dial from this page.
 */
export default function DialerPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadQuick[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { initiateCall, isInitiating } = useCall();
  const { isOnCall } = useCallStore();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await apiClient.get('/leads', {
          params: {
            search: search || undefined,
            limit: 20,
            page: 1,
          },
        });
        setLeads(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchLeads, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleQuickCall = async (leadId: string) => {
    try {
      await initiateCall(leadId);
    } catch {
      // Error handled by useCall hook
    }
  };

  const callableLeads = leads.filter((l) => !l.isWrongNumber);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Quick Dialer</h1>
            <p className="text-sm text-gray-500">
              Search and call leads with one click
            </p>
          </div>
        </div>
      </div>

      {/* Mock mode banner */}
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-700">
          <strong>Mock Mode Active</strong> — Calls are simulated locally.
          The full call lifecycle (ringing → answered → completed) runs without
          real phone numbers.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, contact, or phone number..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Lead list */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Loading leads...
          </div>
        ) : callableLeads.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {search ? 'No leads match your search' : 'No leads available to call'}
          </div>
        ) : (
          callableLeads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-gray-300"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {lead.companyName}
                  </p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      lead.status === 'NEW'
                        ? 'bg-blue-50 text-blue-700'
                        : lead.status === 'CONTACTED'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-50 text-gray-700',
                    )}
                  >
                    {lead.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {lead.contactName && `${lead.contactName} · `}
                  {lead.phoneNumber}
                  {lead.country && ` · ${lead.country}`}
                </p>
              </div>

              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  title="View lead details"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleQuickCall(lead.id)}
                  disabled={isOnCall || isInitiating}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors',
                    isOnCall || isInitiating
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : 'bg-green-600 text-white hover:bg-green-700',
                  )}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
