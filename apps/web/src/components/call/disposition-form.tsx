'use client';

import { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  CalendarClock,
  PhoneOff,
  Phone,
  Voicemail,
  Shield,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DispositionFormProps {
  callId: string;
  onSubmit: (data: {
    callId: string;
    type: string;
    notes?: string;
    painPoints?: string;
    callbackScheduledAt?: string;
  }) => Promise<void>;
  onSkip: () => void;
}

const DISPOSITIONS = [
  {
    type: 'INTERESTED',
    label: 'Interested',
    icon: ThumbsUp,
    color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    activeColor: 'bg-green-100 border-green-500 ring-2 ring-green-500/20',
  },
  {
    type: 'NOT_INTERESTED',
    label: 'Not Interested',
    icon: ThumbsDown,
    color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    activeColor: 'bg-red-100 border-red-500 ring-2 ring-red-500/20',
  },
  {
    type: 'CALLBACK',
    label: 'Callback',
    icon: CalendarClock,
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    activeColor: 'bg-blue-100 border-blue-500 ring-2 ring-blue-500/20',
  },
  {
    type: 'WRONG_NUMBER',
    label: 'Wrong Number',
    icon: PhoneOff,
    color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    activeColor: 'bg-orange-100 border-orange-500 ring-2 ring-orange-500/20',
  },
  {
    type: 'NO_ANSWER',
    label: 'No Answer',
    icon: Phone,
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    activeColor: 'bg-yellow-100 border-yellow-500 ring-2 ring-yellow-500/20',
  },
  {
    type: 'VOICEMAIL',
    label: 'Voicemail',
    icon: Voicemail,
    color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    activeColor: 'bg-purple-100 border-purple-500 ring-2 ring-purple-500/20',
  },
  {
    type: 'GATEKEEPER',
    label: 'Gatekeeper',
    icon: Shield,
    color: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    activeColor: 'bg-gray-100 border-gray-500 ring-2 ring-gray-500/20',
  },
  {
    type: 'OPT_OUT',
    label: 'Opt Out',
    icon: X,
    color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    activeColor: 'bg-orange-100 border-orange-500 ring-2 ring-orange-500/20',
  },
  {
    type: 'OTHER',
    label: 'Other',
    icon: HelpCircle,
    color: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    activeColor: 'bg-gray-100 border-gray-500 ring-2 ring-gray-500/20',
  },
];

export function DispositionForm({ callId, onSubmit, onSkip }: DispositionFormProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [callbackDate, setCallbackDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        callId,
        type: selectedType,
        notes: notes.trim() || undefined,
        painPoints: painPoints.trim() || undefined,
        callbackScheduledAt: callbackDate || undefined,
      });
    } catch {
      // handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-lg rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--card-border)' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Call Disposition
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              How did the call go?
            </p>
          </div>
          <button
            onClick={onSkip}
            className="rounded-lg p-2 transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
            }
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Disposition buttons */}
          <div className="grid grid-cols-4 gap-2">
            {DISPOSITIONS.map((disp) => {
              const Icon = disp.icon;
              const isSelected = selectedType === disp.type;
              return (
                <button
                  key={disp.type}
                  onClick={() => setSelectedType(disp.type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all',
                    isSelected ? disp.activeColor : disp.color,
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {disp.label}
                </button>
              );
            })}
          </div>

          {selectedType === 'CALLBACK' && (
            <div className="mt-4">
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Callback Date & Time
              </label>
              <input
                type="datetime-local"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          )}

          <div className="mt-4">
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--foreground)' }}
            >
              Notes{' '}
              <span className="font-normal" style={{ color: 'var(--muted)' }}>
                (optional)
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Key takeaways from the call..."
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {(selectedType === 'INTERESTED' || selectedType === 'CALLBACK') && (
            <div className="mt-3">
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: 'var(--foreground)' }}
              >
                Pain Points{' '}
                <span className="font-normal" style={{ color: 'var(--muted)' }}>
                  (optional)
                </span>
              </label>
              <textarea
                value={painPoints}
                onChange={(e) => setPainPoints(e.target.value)}
                rows={2}
                placeholder="What problems are they trying to solve?"
                className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--foreground)',
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--card-border)' }}
        >
          <button
            onClick={onSkip}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
            }
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Disposition
          </button>
        </div>
      </div>
    </div>
  );
}