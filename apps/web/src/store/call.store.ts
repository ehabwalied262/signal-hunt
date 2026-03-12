import { create } from 'zustand';
import { CallStatus, ACTIVE_CALL_STATUSES } from '@signalhunt/shared-types';

interface ActiveCall {
  callId: string;
  leadId: string;
  status: CallStatus;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  duration: number | null;
}

interface CallState {
  activeCall: ActiveCall | null;
  isOnCall: boolean;
  showDispositionForm: boolean;

  // Actions
  setCallStatus: (payload: {
    callId: string;
    leadId: string;
    status: CallStatus;
    startedAt?: string;
    answeredAt?: string;
    endedAt?: string;
    duration?: number;
  }) => void;
  clearCall: () => void;
  setShowDisposition: (show: boolean) => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  isOnCall: false,
  showDispositionForm: false,

  setCallStatus: (payload) => {
    const isActive = ACTIVE_CALL_STATUSES.includes(payload.status);
    const isTerminal = !isActive && payload.status !== CallStatus.INITIATING;

    set({
      activeCall: {
        callId: payload.callId,
        leadId: payload.leadId,
        status: payload.status,
        startedAt: payload.startedAt || null,
        answeredAt: payload.answeredAt || null,
        endedAt: payload.endedAt || null,
        duration: payload.duration || null,
      },
      isOnCall: isActive,
      // Show disposition form when call ends (completed, no answer, etc.)
      showDispositionForm:
        isTerminal && payload.status !== CallStatus.CANCELED,
    });
  },

  clearCall: () => {
    set({
      activeCall: null,
      isOnCall: false,
      showDispositionForm: false,
    });
  },

  setShowDisposition: (show) => {
    set({ showDispositionForm: show });
  },
}));
