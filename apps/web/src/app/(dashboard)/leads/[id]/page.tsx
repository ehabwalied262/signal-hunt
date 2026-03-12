'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  PhoneOff,
  Building2,
  User,
  MapPin,
  Users,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface LeadDetail {
  id: string;
  companyName: string;
  contactName: string | null;
  contactTitle: string | null;
  phoneNumber: string;
  country: string | null;
  location: string | null;
  headcount: number | null;
  headcountGrowth6m: number | null;
  headcountGrowth12m: number | null;
  companyOverview: string | null;
  status: string;
  isWrongNumber: boolean;
  calls: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    answeredAt: string | null;
    endedAt: string | null;
    talkTimeSeconds: number | null;
    disposition: {
      type: string;
      notes: string | null;
      painPoints: string | null;
    } | null;
  }>;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await apiClient.get(`/leads/${params.id}`);
        setLead(response.data);
      } catch (error) {
        console.error('Failed to fetch lead:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">
        Loading lead details...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-gray-300" />
        <p className="text-gray-500">Lead not found</p>
      </div>
    );
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </button>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column — Company info */}
        <div className="col-span-2 space-y-6">
          {/* Company card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {lead.companyName}
                </h1>
                {lead.contactName && (
                  <p className="mt-1 text-gray-600">
                    {lead.contactName}
                    {lead.contactTitle && (
                      <span className="text-gray-400">
                        {' '}
                        — {lead.contactTitle}
                      </span>
                    )}
                  </p>
                )}
              </div>
              {lead.isWrongNumber && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  Wrong Number
                </span>
              )}
            </div>

            {/* Meta grid */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                {lead.phoneNumber}
              </div>
              {lead.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {lead.location}, {lead.country}
                </div>
              )}
              {lead.headcount && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4 text-gray-400" />
                  {lead.headcount} employees
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4 text-gray-400" />
                {lead.status.replace('_', ' ')}
              </div>
            </div>

            {/* Company overview */}
            {lead.companyOverview && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-medium text-gray-700">
                  Company Overview
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {lead.companyOverview}
                </p>
              </div>
            )}
          </div>

          {/* Call history */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Call History
            </h2>

            {lead.calls.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No calls yet
              </p>
            ) : (
              <div className="space-y-3">
                {lead.calls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full',
                          call.status === 'COMPLETED'
                            ? 'bg-green-100'
                            : call.status === 'NO_ANSWER'
                              ? 'bg-yellow-100'
                              : 'bg-red-100',
                        )}
                      >
                        {call.status === 'COMPLETED' ? (
                          <Phone className="h-4 w-4 text-green-600" />
                        ) : (
                          <PhoneOff className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {call.status.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {call.startedAt
                            ? new Date(call.startedAt).toLocaleString()
                            : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {call.talkTimeSeconds !== null && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDuration(call.talkTimeSeconds)}
                        </div>
                      )}
                      {call.disposition && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {call.disposition.type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — Action panel */}
        <div className="space-y-4">
          {/* Call button */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-medium text-gray-700">
              Quick Actions
            </h3>
            <button
              disabled={lead.isWrongNumber}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Phone className="h-4 w-4" />
              {lead.isWrongNumber ? 'Wrong Number' : 'Call Now'}
            </button>
            <p className="mt-2 text-center text-xs text-gray-400">
              {lead.phoneNumber}
            </p>
          </div>

          {/* Growth metrics */}
          {(lead.headcountGrowth6m !== null ||
            lead.headcountGrowth12m !== null) && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Growth
              </h3>
              <div className="space-y-2">
                {lead.headcountGrowth6m !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">6 months</span>
                    <span
                      className={cn(
                        'font-medium',
                        Number(lead.headcountGrowth6m) > 0
                          ? 'text-green-600'
                          : 'text-red-600',
                      )}
                    >
                      {Number(lead.headcountGrowth6m) > 0 ? '+' : ''}
                      {lead.headcountGrowth6m}%
                    </span>
                  </div>
                )}
                {lead.headcountGrowth12m !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">12 months</span>
                    <span
                      className={cn(
                        'font-medium',
                        Number(lead.headcountGrowth12m) > 0
                          ? 'text-green-600'
                          : 'text-red-600',
                      )}
                    >
                      {Number(lead.headcountGrowth12m) > 0 ? '+' : ''}
                      {lead.headcountGrowth12m}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
