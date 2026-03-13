'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Search,
  ArrowRight,
  Zap,
  Building2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCall } from '@/hooks/use-call';
import { useCallStore } from '@/store/call.store';
import { cn } from '@/lib/utils';

interface LeadQuick {
  id: string;
  companyName: string;
  contactName: string | null;
  contactTitle: string | null;
  phoneNumber: string;
  status: string;
  country: string | null;
  industry: string | null;
  isWrongNumber: boolean;
}

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
          <div className="rounded-lg badge-bg-new p-2">
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
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, or phone number..."
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
                {/* Lead name prominent */}
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {lead.contactName || 'Unknown Contact'}
                  </p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      lead.status === 'NEW'
                        ? 'badge-new'
                        : lead.status === 'CONTACTED'
                          ? 'badge-new'
                          : 'badge-tag',
                    )}
                  >
                    {lead.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {/* Phone + Company on second line */}
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.phoneNumber}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {lead.companyName}
                  </span>
                  {lead.country && (
                    <span>{lead.country}</span>
                  )}
                </div>
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
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all',
                    isOnCall || isInitiating
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105',
                  )}
                  title={`Call ${lead.contactName || lead.companyName}`}
                >
                  <Phone className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
