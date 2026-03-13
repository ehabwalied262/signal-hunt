'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, PhoneOff, Building2, MapPin, Users, Clock,
  AlertTriangle, Loader2, Disc, Globe, Linkedin, Mail, Copy,
  Check, Pencil, Save, X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useCall } from '@/hooks/use-call';
import { useCallStore } from '@/store/call.store';
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
  email: string | null;
  website: string | null;
  personalLinkedin: string | null;
  companyLinkedin: string | null;
  industry: string | null;
  companyOverview: string | null;
  status: string;
  isWrongNumber: boolean;
  isOptOut: boolean;
  calls: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    answeredAt: string | null;
    endedAt: string | null;
    durationSeconds: number | null;
    talkTimeSeconds: number | null;
    recordingUrl: string | null;
    disposition: {
      id: string;
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
  const [copiedEmail, setCopiedEmail] = useState(false);
  const { initiateCall, isInitiating, error: callError } = useCall();
  const { isOnCall, activeCall } = useCallStore();

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const response = await apiClient.get(`/leads/${params.id}`);
      setLead(response.data);
    } catch (error) {
      console.error('Failed to fetch lead:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  useEffect(() => {
    if (
      activeCall?.leadId === params.id &&
      activeCall?.status &&
      ['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED'].includes(activeCall.status)
    ) {
      const timer = setTimeout(fetchLead, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeCall?.status, activeCall?.leadId, params.id, fetchLead]);

  const handleCallNow = async () => {
    if (!lead) return;
    try { await initiateCall(lead.id); } catch {}
  };

  const copyEmail = () => {
    if (lead?.email) {
      navigator.clipboard.writeText(lead.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const startEditNote = (dispositionId: string, currentNotes: string | null) => {
    setEditingNoteId(dispositionId);
    setEditNoteText(currentNotes || '');
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditNoteText('');
  };

  const saveNote = async (dispositionId: string) => {
    setSavingNote(true);
    try {
      await apiClient.patch(`/dispositions/${dispositionId}`, { notes: editNoteText });
      setEditingNoteId(null);
      fetchLead();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" style={{ color: 'var(--muted)' }}>
        Loading lead details...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8" style={{ color: 'var(--muted)' }} />
        <p style={{ color: 'var(--muted)' }}>Lead not found</p>
      </div>
    );
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canCall = !lead.isWrongNumber && !lead.isOptOut && !isOnCall && !isInitiating;
  const isCallingThisLead = isOnCall && activeCall?.leadId === lead.id;

  /* Reusable card style */
  const card = {
    backgroundColor: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '0.75rem',
    padding: '1.5rem',
  };

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm transition-colors"
        style={{ color: 'var(--muted)' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--foreground)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--muted)')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leads
      </button>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 space-y-6">
          {/* Lead card */}
          <div style={card}>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                  {lead.contactName || 'Unknown Contact'}
                </h1>
                <p className="mt-1" style={{ color: 'var(--muted)' }}>
                  {lead.contactTitle && (
                    <span style={{ color: 'var(--foreground)' }}>{lead.contactTitle}</span>
                  )}
                  {lead.contactTitle && ' at '}
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {lead.companyName}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                {lead.isWrongNumber && (
                  <span className="rounded-full badge-no px-3 py-1 text-xs font-medium">
                    Wrong Number
                  </span>
                )}
                {lead.isOptOut && (
                  <span className="rounded-full badge-no px-3 py-1 text-xs font-medium">
                    Opted Out
                  </span>
                )}
              </div>
            </div>

            {lead.industry && (
              <div className="mt-3">
                <span
                  className="inline-flex rounded-md px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}
                >
                  {lead.industry}
                </span>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                <Phone className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                {lead.phoneNumber}
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                  <Mail className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                  <span className="truncate">{lead.email}</span>
                  <button
                    onClick={copyEmail}
                    className="flex-shrink-0 rounded p-0.5 transition-colors"
                    style={{ color: 'var(--muted)' }}
                  >
                    {copiedEmail ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}
              {(lead.location || lead.country) && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                  <MapPin className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                  {[lead.location, lead.country].filter(Boolean).join(', ')}
                </div>
              )}
              {lead.headcount && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                  <Users className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                  {lead.headcount} employees
                </div>
              )}
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                <Building2 className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                {lead.status.replace(/_/g, ' ')}
              </div>
            </div>

            {(lead.website || lead.personalLinkedin || lead.companyLinkedin) && (
              <div className="mt-4 flex gap-3 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--tag-bg)')
                    }
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </a>
                )}
                {lead.personalLinkedin && (
                  <a
                    href={lead.personalLinkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
                {lead.companyLinkedin && (
                  <a
                    href={lead.companyLinkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    Company Page
                  </a>
                )}
              </div>
            )}

            {lead.companyOverview && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                <h3 className="mb-2 text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Company Overview
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {lead.companyOverview}
                </p>
              </div>
            )}
          </div>

          {/* Call history */}
          <div style={card}>
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Call History
            </h2>

            {lead.calls.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
                No calls yet
              </p>
            ) : (
              <div className="space-y-3">
                {lead.calls.map((call) => (
                  <div
                    key={call.id}
                    className="rounded-lg p-4"
                    style={{
                      border: '1px solid var(--card-border)',
                      backgroundColor: 'var(--subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full',
                            call.status === 'COMPLETED'
                              ? 'badge-bg-int'
                              : call.status === 'NO_ANSWER'
                                ? 'badge-bg-cb'
                                : call.status === 'IN_PROGRESS'
                                  ? 'badge-bg-new'
                                  : 'badge-bg-no',
                          )}
                        >
                          {call.status === 'COMPLETED' ? (
                            <Phone className="h-4 w-4 text-green-600" />
                          ) : call.status === 'IN_PROGRESS' ? (
                            <Phone className="h-4 w-4 animate-pulse text-blue-600" />
                          ) : (
                            <PhoneOff className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {call.status.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            {call.startedAt ? new Date(call.startedAt).toLocaleString() : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {call.talkTimeSeconds !== null && call.talkTimeSeconds > 0 && (
                          <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--muted)' }}>
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.talkTimeSeconds)}
                          </div>
                        )}
                        {call.recordingUrl && (
                          <div className="flex items-center gap-1 text-xs text-blue-500">
                            <Disc className="h-3 w-3" />
                            Recorded
                          </div>
                        )}
                        {call.disposition && (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: 'var(--tag-bg)', color: 'var(--tag-text)' }}
                          >
                            {call.disposition.type.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {call.disposition && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                        {editingNoteId === call.disposition.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editNoteText}
                              onChange={(e) => setEditNoteText(e.target.value)}
                              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{
                                backgroundColor: 'var(--input-bg)',
                                borderColor: 'var(--input-border)',
                                color: 'var(--foreground)',
                              }}
                              rows={2}
                              placeholder="Add notes..."
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveNote(call.disposition!.id)}
                                disabled={savingNote}
                                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                <Save className="h-3 w-3" />
                                {savingNote ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEditNote}
                                className="flex items-center gap-1 rounded-lg border px-3 py-1 text-xs transition-colors"
                                style={{
                                  borderColor: 'var(--card-border)',
                                  color: 'var(--muted)',
                                }}
                              >
                                <X className="h-3 w-3" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              {call.disposition.notes ? (
                                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                                  {call.disposition.notes}
                                </p>
                              ) : (
                                <p className="text-sm italic" style={{ color: 'var(--muted)' }}>
                                  No notes
                                </p>
                              )}
                              {call.disposition.painPoints && (
                                <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                                  Pain points: {call.disposition.painPoints}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => startEditNote(call.disposition!.id, call.disposition!.notes)}
                              className="flex-shrink-0 rounded p-1 transition-colors"
                              style={{ color: 'var(--muted)' }}
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)')
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
                              }
                              title="Edit notes"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Call button card */}
          <div style={card}>
            <h3 className="mb-4 text-sm font-medium" style={{ color: 'var(--muted)' }}>
              Quick Actions
            </h3>

            {isCallingThisLead && (
              <div className="mb-3 flex items-center gap-2 rounded-lg badge-int px-3 py-2 text-sm">
                <Phone className="h-4 w-4 animate-pulse" />
                Call in progress
              </div>
            )}

            {callError && (
              <div className="mb-3 rounded-lg badge-no px-3 py-2 text-sm">
                {callError}
              </div>
            )}

            <button
              onClick={handleCallNow}
              disabled={!canCall}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                canCall
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'cursor-not-allowed opacity-50',
              )}
              style={!canCall ? { backgroundColor: 'var(--hover-bg)', color: 'var(--muted)' } : {}}
            >
              {isInitiating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting Call...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  {lead.isWrongNumber
                    ? 'Wrong Number'
                    : lead.isOptOut
                      ? 'Opted Out'
                      : isOnCall
                        ? 'Already on a Call'
                        : 'Call Now'}
                </>
              )}
            </button>
            <p className="mt-2 text-center text-xs" style={{ color: 'var(--muted)' }}>
              {lead.phoneNumber}
            </p>
          </div>

          {/* Growth metrics */}
          {(lead.headcountGrowth6m !== null || lead.headcountGrowth12m !== null) && (
            <div style={card}>
              <h3 className="mb-3 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                Growth
              </h3>
              <div className="space-y-2">
                {lead.headcountGrowth6m !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted)' }}>6 months</span>
                    <span
                      className={cn('font-medium', Number(lead.headcountGrowth6m) > 0 ? 'text-green-500' : 'text-red-500')}
                    >
                      {Number(lead.headcountGrowth6m) > 0 ? '+' : ''}
                      {lead.headcountGrowth6m}%
                    </span>
                  </div>
                )}
                {lead.headcountGrowth12m !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--muted)' }}>12 months</span>
                    <span
                      className={cn('font-medium', Number(lead.headcountGrowth12m) > 0 ? 'text-green-500' : 'text-red-500')}
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