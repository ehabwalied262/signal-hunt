export enum CallStatus {
  INITIATING = 'INITIATING',
  RINGING = 'RINGING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NO_ANSWER = 'NO_ANSWER',
  BUSY = 'BUSY',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

export interface Call {
  id: string;
  leadId: string;
  agentId: string;
  phoneNumberId: string;
  providerCallId: string | null;
  status: CallStatus;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  talkTimeSeconds: number | null;
  recordingUrl: string | null;
  recordingSid: string | null;
  errorCode: string | null;
  createdAt: string;
}

/**
 * Active call states — used by frontend to determine if agent is on a call
 */
export const ACTIVE_CALL_STATUSES: CallStatus[] = [
  CallStatus.INITIATING,
  CallStatus.RINGING,
  CallStatus.IN_PROGRESS,
];

/**
 * Terminal call states — call is done, show disposition form
 */
export const TERMINAL_CALL_STATUSES: CallStatus[] = [
  CallStatus.COMPLETED,
  CallStatus.NO_ANSWER,
  CallStatus.BUSY,
  CallStatus.FAILED,
  CallStatus.CANCELED,
];
