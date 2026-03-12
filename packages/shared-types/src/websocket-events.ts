import { CallStatus } from './call.types';

/**
 * WebSocket event contracts.
 *
 * Both the NestJS gateway (sender) and React hook (receiver)
 * import these types. If you change the shape here,
 * TypeScript will break both sides at compile time.
 */

// ============================================
// Server → Client events (NestJS → Browser)
// ============================================

export interface CallStatusPayload {
  callId: string;
  status: CallStatus;
  leadId: string;
  duration?: number;
  startedAt?: string;
  answeredAt?: string;
  endedAt?: string;
  errorMessage?: string;
}

export interface RecordingReadyPayload {
  callId: string;
  recordingUrl: string;
}

// ============================================
// Event name constants
// ============================================

export const WS_EVENTS = {
  // Server → Client
  CALL_STATUS: 'call:status',
  RECORDING_READY: 'call:recording_ready',

  // Client → Server (future)
  JOIN_ROOM: 'join',
} as const;
