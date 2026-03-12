import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CallStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { TelephonyProvider } from '../telephony.interface';
import {
  CallResult,
  CallStatusEvent,
  RecordingEvent,
} from '../telephony.models';

/**
 * Mock telephony provider for development.
 *
 * Simulates the full call lifecycle WITHOUT any real telephony provider:
 *   1. makeCall() → returns fake SID, schedules simulated webhook callbacks
 *   2. Background timers fire status webhooks to our own API:
 *      RINGING → IN_PROGRESS (after 2s, simulates prospect answering)
 *   3. endCall() → fires COMPLETED webhook + simulated recording
 *   4. Disposition form appears as usual
 *
 * The mock fires real HTTP requests to our webhook endpoints,
 * testing the FULL pipeline: webhooks → CallsService → WebSocket → frontend.
 *
 * Usage: Set TELEPHONY_PROVIDER_NAME=mock in .env
 */
@Injectable()
export class MockTelephonyProvider implements TelephonyProvider {
  private readonly logger = new Logger(MockTelephonyProvider.name);
  private activeCalls = new Map<string, NodeJS.Timeout[]>();

  constructor(private configService: ConfigService) {
    this.logger.warn(
      '🧪 MOCK TELEPHONY PROVIDER ACTIVE — No real calls will be made',
    );
  }

  /**
   * Returns a fake access token.
   * In production, this would be a Twilio Access Token for WebRTC.
   */
  generateAccessToken(identity: string): string {
    this.logger.log(`Mock: generateAccessToken for ${identity}`);
    return `mock-token-${identity}-${Date.now()}`;
  }

  /**
   * Simulates an outbound call.
   * Returns immediately, then fires background webhooks to simulate
   * the call progressing through states.
   */
  async makeCall(params: {
    to: string;
    from: string;
    webhookUrl: string;
  }): Promise<CallResult> {
    const callSid = `MOCK_${randomUUID().split('-')[0].toUpperCase()}`;

    this.logger.log(
      `Mock: makeCall ${params.from} → ${params.to} (SID: ${callSid})`,
    );

    // Schedule simulated call lifecycle in background
    this.simulateCallLifecycle(callSid);

    return {
      providerCallId: callSid,
      status: CallStatus.RINGING,
    };
  }

  /**
   * Simulates ending a call.
   * Clears pending timers and fires COMPLETED status webhook.
   */
  async endCall(providerCallId: string): Promise<void> {
    this.logger.log(`Mock: endCall ${providerCallId}`);

    // Clear any pending simulation timers
    const timers = this.activeCalls.get(providerCallId) || [];
    timers.forEach((t) => clearTimeout(t));
    this.activeCalls.delete(providerCallId);

    // Fire COMPLETED webhook in background (don't block the response)
    this.fireStatusWebhook(providerCallId, 'completed', 500);

    // Simulate recording becoming available 2s after call ends
    this.fireRecordingWebhook(providerCallId, 2500);
  }

  /**
   * Returns mock TwiML (not actually used in mock mode,
   * but satisfies the interface).
   */
  generateCallResponse(params: {
    record: boolean;
    recordingStatusCallbackUrl?: string;
  }): string {
    this.logger.log(`Mock: generateCallResponse (record: ${params.record})`);
    return '<Response><Say>This is a simulated call from SignalHunt mock provider.</Say></Response>';
  }

  /**
   * Parses mock webhook body.
   * Uses the same field names as Twilio for consistency.
   */
  parseStatusWebhook(rawBody: Record<string, any>): CallStatusEvent {
    const statusMap: Record<string, CallStatus> = {
      queued: CallStatus.INITIATING,
      ringing: CallStatus.RINGING,
      'in-progress': CallStatus.IN_PROGRESS,
      completed: CallStatus.COMPLETED,
      'no-answer': CallStatus.NO_ANSWER,
      busy: CallStatus.BUSY,
      failed: CallStatus.FAILED,
      canceled: CallStatus.CANCELED,
    };

    return {
      providerCallId: rawBody.CallSid,
      status: statusMap[rawBody.CallStatus] || CallStatus.FAILED,
      timestamp: new Date(),
      duration: rawBody.CallDuration
        ? parseInt(rawBody.CallDuration, 10)
        : undefined,
    };
  }

  /**
   * Parses mock recording webhook body.
   */
  parseRecordingWebhook(rawBody: Record<string, any>): RecordingEvent {
    return {
      providerCallId: rawBody.CallSid,
      recordingSid: rawBody.RecordingSid,
      recordingUrl: rawBody.RecordingUrl,
      duration: parseInt(rawBody.RecordingDuration || '0', 10),
      status: 'completed',
    };
  }

  /**
   * Mock always returns true — no signature to validate.
   */
  validateWebhookSignature(): boolean {
    return true;
  }

  /**
   * Returns a placeholder recording URL.
   */
  getRecordingUrl(recordingSid: string): string {
    return `/api/mock/recordings/${recordingSid}`;
  }

  // ============================================
  // Internal simulation methods
  // ============================================

  /**
   * Simulates the call progressing through states:
   * (call created as RINGING by CallsService) → IN_PROGRESS (2s later, prospect answers)
   *
   * The call stays IN_PROGRESS until the agent hangs up.
   */
  private simulateCallLifecycle(callSid: string) {
    const timers: NodeJS.Timeout[] = [];

    // After 2 seconds: prospect answers → IN_PROGRESS
    const answerTimer = setTimeout(() => {
      this.fireStatusWebhook(callSid, 'in-progress');
    }, 2000);
    timers.push(answerTimer);

    this.activeCalls.set(callSid, timers);
  }

  /**
   * Fires a simulated status webhook to our own API.
   * Uses the same endpoint real Twilio webhooks would hit.
   */
  private fireStatusWebhook(
    callSid: string,
    status: string,
    delayMs = 0,
  ) {
    const apiUrl = this.configService.get<string>(
      'API_URL',
      'http://localhost:4000',
    );

    const fire = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/webhooks/twilio/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            CallSid: callSid,
            CallStatus: status,
            CallDuration: status === 'completed' ? '30' : undefined,
          }),
        });

        if (!response.ok) {
          this.logger.error(
            `Mock webhook failed (${response.status}): ${await response.text()}`,
          );
        } else {
          this.logger.log(`Mock webhook fired: ${callSid} → ${status}`);
        }
      } catch (error) {
        this.logger.error(`Mock webhook error: ${error}`);
      }
    };

    if (delayMs > 0) {
      setTimeout(fire, delayMs);
    } else {
      fire();
    }
  }

  /**
   * Fires a simulated recording webhook after a call completes.
   */
  private fireRecordingWebhook(callSid: string, delayMs = 2000) {
    const apiUrl = this.configService.get<string>(
      'API_URL',
      'http://localhost:4000',
    );

    const recordingSid = `MOCKREC_${randomUUID().split('-')[0].toUpperCase()}`;

    setTimeout(async () => {
      try {
        await fetch(`${apiUrl}/api/webhooks/twilio/recording`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            CallSid: callSid,
            RecordingSid: recordingSid,
            RecordingUrl: `https://mock-recordings.signalhunt.dev/${recordingSid}.mp3`,
            RecordingDuration: '30',
            RecordingStatus: 'completed',
          }),
        });

        this.logger.log(
          `Mock recording webhook fired: ${callSid} (rec: ${recordingSid})`,
        );
      } catch (error) {
        this.logger.error(`Mock recording webhook error: ${error}`);
      }
    }, delayMs);
  }
}
