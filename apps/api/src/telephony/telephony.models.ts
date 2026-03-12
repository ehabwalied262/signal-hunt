import { CallStatus } from '@prisma/client';

/**
 * Provider-agnostic call result.
 * Returned when a call is initiated.
 */
export interface CallResult {
  providerCallId: string; // Twilio Call SID / Telnyx call_control_id
  status: CallStatus;
}

/**
 * Provider-agnostic call status event.
 * Parsed from incoming webhooks.
 */
export interface CallStatusEvent {
  providerCallId: string;
  status: CallStatus;
  timestamp: Date;
  duration?: number; // seconds
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Provider-agnostic recording event.
 * Parsed from incoming recording webhooks.
 */
export interface RecordingEvent {
  providerCallId: string;
  recordingSid: string;
  recordingUrl: string;
  duration: number; // seconds
  status: 'completed' | 'failed';
}

/**
 * TwiML/TeXML response wrapper.
 * Used to return XML to the telephony provider.
 */
export interface TwimlResponse {
  contentType: string;
  body: string;
}
