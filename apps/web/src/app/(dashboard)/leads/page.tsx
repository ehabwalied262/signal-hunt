'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Upload, Search, Phone } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  contactTitle: string | null;
  phoneNumber: string;
  country: string | null;
  status: string;
  _count: { calls: number };
}

interface LeadsResponse {
  data: Lead[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const statusColors: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  INTERESTED: 'bg-green-100 text-green-700',
  NOT_INTERESTED: 'bg-red-100 text-red-700',
  CALLBACK_SCHEDULED: 'bg-yellow-100 text-yellow-700',
  WRONG_NUMBER: 'bg-red-200 text-red-800',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<LeadsResponse['meta'] | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLeads = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 25 };
      if (search) params.search = search;

      const response = await apiClient.get<LeadsResponse>('/leads', { params });
      setLeads(response.data.data);
      setMeta(response.data.meta);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            {meta ? `${meta.total} leads total` : 'Loading...'}
          </p>
        </div>
        <Link
          href="/leads/import"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, contact, or phone..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Calls
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                  Loading leads...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Users className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No leads found</p>
                  <Link
                    href="/leads/import"
                    className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
                  >
                    Import your first CSV
                  </Link>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      {lead.companyName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {lead.contactName || '—'}
                    </div>
                    {lead.contactTitle && (
                      <div className="text-xs text-gray-500">
                        {lead.contactTitle}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {lead.phoneNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {lead.country || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                        statusColors[lead.status] || statusColors.NEW,
                      )}
                    >
                      {lead.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {lead._count.calls}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Phone className="h-3 w-3" />
                      View & Call
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLeads(meta.page - 1)}
              disabled={meta.page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => fetchLeads(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
