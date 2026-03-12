import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CallStatus } from '@prisma/client';
import * as twilio from 'twilio';
import { TelephonyProvider } from '../telephony.interface';
import {
  CallResult,
  CallStatusEvent,
  RecordingEvent,
} from '../telephony.models';

/**
 * Twilio implementation of the TelephonyProvider interface.
 *
 * Maps Twilio-specific APIs, webhook formats, and status strings
 * to our provider-agnostic models. No other part of the codebase
 * should import from 'twilio' directly.
 */
@Injectable()
export class TwilioProvider implements TelephonyProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: twilio.Twilio;
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly twimlAppSid: string;

  constructor(private configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    this.apiKey = this.configService.get<string>('TWILIO_API_KEY', '');
    this.apiSecret = this.configService.get<string>('TWILIO_API_SECRET', '');
    this.twimlAppSid = this.configService.get<string>('TWILIO_TWIML_APP_SID', '');

    // Only initialize the Twilio client if credentials are provided
    // When using mock provider, these will be empty and that's OK
    if (this.accountSid && this.authToken) {
      this.client = twilio.default(this.accountSid, this.authToken);
    }
  }

  /**
   * Generate a Twilio Access Token for browser-based calling.
   * The token authorizes the Twilio Client JS SDK to make/receive calls.
   */
  generateAccessToken(identity: string): string {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(
      this.accountSid,
      this.apiKey,
      this.apiSecret,
      { identity, ttl: 3600 }, // 1 hour
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: this.twimlAppSid,
      incomingAllow: false, // Outbound only for V1
    });

    token.addGrant(voiceGrant);

    return token.toJwt();
  }

  /**
   * Initiate an outbound call via Twilio REST API.
   */
  async makeCall(params: {
    to: string;
    from: string;
    webhookUrl: string;
  }): Promise<CallResult> {
    try {
      const call = await this.client.calls.create({
        to: params.to,
        from: params.from,
        url: params.webhookUrl, // Twilio will POST here when call connects
        statusCallback: `${params.webhookUrl}/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      this.logger.log(`Call initiated: ${call.sid} → ${params.to}`);

      return {
        providerCallId: call.sid,
        status: CallStatus.INITIATING,
      };
    } catch (error) {
      this.logger.error(`Failed to initiate call to ${params.to}`, error);
      throw error;
    }
  }

  /**
   * End an active call.
   */
  async endCall(providerCallId: string): Promise<void> {
    try {
      await this.client.calls(providerCallId).update({ status: 'completed' });
      this.logger.log(`Call ended: ${providerCallId}`);
    } catch (error) {
      this.logger.error(`Failed to end call: ${providerCallId}`, error);
      throw error;
    }
  }

  /**
   * Generate TwiML response for when a call connects.
   * This is returned as the response to Twilio's webhook POST.
   */
  generateCallResponse(params: {
    record: boolean;
    recordingStatusCallbackUrl?: string;
  }): string {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (params.record) {
      // Record both sides of the conversation
      // Recording starts only when the call is answered (record-from-answer-dual)
      response.dial({
        record: 'record-from-answer-dual' as any,
        recordingStatusCallback: params.recordingStatusCallbackUrl,
        recordingStatusCallbackEvent: ['completed'] as any,
      });

      return response.toString();
    }

    return response.toString();
  }

  /**
   * Parse Twilio's status callback webhook into our normalized model.
   *
   * Twilio sends statuses: queued, ringing, in-progress, completed,
   * busy, failed, no-answer, canceled
   */
  parseStatusWebhook(rawBody: Record<string, any>): CallStatusEvent {
    const twilioStatus = rawBody.CallStatus as string;
    const providerCallId = rawBody.CallSid as string;

    return {
      providerCallId,
      status: this.mapTwilioStatus(twilioStatus),
      timestamp: new Date(),
      duration: rawBody.CallDuration
        ? parseInt(rawBody.CallDuration, 10)
        : undefined,
      errorCode: rawBody.ErrorCode,
      errorMessage: rawBody.ErrorMessage,
    };
  }

  /**
   * Parse Twilio's recording status callback.
   */
  parseRecordingWebhook(rawBody: Record<string, any>): RecordingEvent {
    return {
      providerCallId: rawBody.CallSid,
      recordingSid: rawBody.RecordingSid,
      recordingUrl: rawBody.RecordingUrl,
      duration: parseInt(rawBody.RecordingDuration || '0', 10),
      status: rawBody.RecordingStatus === 'completed' ? 'completed' : 'failed',
    };
  }

  /**
   * Validate Twilio webhook signature.
   * Prevents webhook forgery — CRITICAL for security.
   */
  validateWebhookSignature(params: {
    signature: string;
    url: string;
    body: Record<string, any>;
  }): boolean {
    return twilio.validateRequest(
      this.authToken,
      params.signature,
      params.url,
      params.body,
    );
  }

  /**
   * Get a playable recording URL.
   * Twilio recordings are accessible via:
   * https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Recordings/{RecordingSid}.mp3
   */
  getRecordingUrl(recordingSid: string): string {
    return `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Recordings/${recordingSid}.mp3`;
  }

  /**
   * Map Twilio's status strings to our CallStatus enum.
   * This is the ONLY place where Twilio status strings exist.
   */
  private mapTwilioStatus(twilioStatus: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      queued: CallStatus.INITIATING,
      initiated: CallStatus.INITIATING,
      ringing: CallStatus.RINGING,
      'in-progress': CallStatus.IN_PROGRESS,
      completed: CallStatus.COMPLETED,
      busy: CallStatus.BUSY,
      failed: CallStatus.FAILED,
      'no-answer': CallStatus.NO_ANSWER,
      canceled: CallStatus.CANCELED,
    };

    return statusMap[twilioStatus] || CallStatus.FAILED;
  }
}
