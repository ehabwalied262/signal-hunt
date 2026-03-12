import { Injectable, NotImplementedException } from '@nestjs/common';
import { TelephonyProvider } from '../telephony.interface';
import {
  CallResult,
  CallStatusEvent,
  RecordingEvent,
} from '../telephony.models';

/**
 * Telnyx implementation STUB.
 *
 * This exists to prove the abstraction works.
 * Will be fully implemented in V2 when migrating from Twilio.
 *
 * Each method throws NotImplementedException so if someone
 * accidentally switches to Telnyx, they get a clear error
 * instead of undefined behavior.
 */
@Injectable()
export class TelnyxProvider implements TelephonyProvider {
  generateAccessToken(_identity: string): string {
    throw new NotImplementedException(
      'Telnyx provider not yet implemented. Use Twilio for now.',
    );
  }

  async makeCall(_params: {
    to: string;
    from: string;
    webhookUrl: string;
  }): Promise<CallResult> {
    throw new NotImplementedException('Telnyx makeCall not yet implemented');
  }

  async endCall(_providerCallId: string): Promise<void> {
    throw new NotImplementedException('Telnyx endCall not yet implemented');
  }

  generateCallResponse(_params: {
    record: boolean;
    recordingStatusCallbackUrl?: string;
  }): string {
    throw new NotImplementedException(
      'Telnyx generateCallResponse not yet implemented',
    );
  }

  parseStatusWebhook(_rawBody: Record<string, any>): CallStatusEvent {
    throw new NotImplementedException(
      'Telnyx parseStatusWebhook not yet implemented',
    );
  }

  parseRecordingWebhook(_rawBody: Record<string, any>): RecordingEvent {
    throw new NotImplementedException(
      'Telnyx parseRecordingWebhook not yet implemented',
    );
  }

  validateWebhookSignature(_params: {
    signature: string;
    url: string;
    body: Record<string, any>;
  }): boolean {
    throw new NotImplementedException(
      'Telnyx validateWebhookSignature not yet implemented',
    );
  }

  getRecordingUrl(_recordingSid: string): string {
    throw new NotImplementedException(
      'Telnyx getRecordingUrl not yet implemented',
    );
  }
}
