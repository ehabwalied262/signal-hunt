import {
  CallResult,
  CallStatusEvent,
  RecordingEvent,
  TwimlResponse,
} from './telephony.models';

/**
 * Abstract telephony provider interface.
 *
 * ALL telephony operations go through this interface.
 * Business logic (CallService, etc.) NEVER imports Twilio/Telnyx directly.
 *
 * To switch providers: implement this interface + update factory.
 */
export interface TelephonyProvider {
  /**
   * Generate an access token for browser-based calling (WebRTC).
   * Used by Twilio Client SDK / Telnyx WebRTC SDK.
   */
  generateAccessToken(identity: string): string;

  /**
   * Initiate an outbound call from the platform.
   * For preview dialer: agent clicks call → this is invoked.
   */
  makeCall(params: {
    to: string;
    from: string;
    webhookUrl: string;
  }): Promise<CallResult>;

  /**
   * End an active call.
   */
  endCall(providerCallId: string): Promise<void>;

  /**
   * Generate TwiML/TeXML response for when a call connects.
   * Controls recording behavior and call flow.
   */
  generateCallResponse(params: {
    record: boolean;
    recordingStatusCallbackUrl?: string;
  }): string;

  /**
   * Parse an incoming status webhook into a normalized event.
   * Maps provider-specific status strings to our CallStatus enum.
   */
  parseStatusWebhook(rawBody: Record<string, any>): CallStatusEvent;

  /**
   * Parse an incoming recording webhook into a normalized event.
   */
  parseRecordingWebhook(rawBody: Record<string, any>): RecordingEvent;

  /**
   * Validate webhook signature to prevent forgery.
   * Returns true if the webhook is authentic.
   */
  validateWebhookSignature(params: {
    signature: string;
    url: string;
    body: Record<string, any>;
  }): boolean;

  /**
   * Get a playable URL for a recording.
   * May need to proxy through our server for auth.
   */
  getRecordingUrl(recordingSid: string): string;
}

/**
 * Injection token for the telephony provider.
 * Used with NestJS DI: @Inject(TELEPHONY_PROVIDER)
 */
export const TELEPHONY_PROVIDER = 'TELEPHONY_PROVIDER';
