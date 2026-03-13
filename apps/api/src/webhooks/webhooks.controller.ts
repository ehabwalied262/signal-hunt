import {
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  Inject,
  Logger,
  SetMetadata,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CallsService } from '../calls/calls.service';
import {
  TelephonyProvider,
  TELEPHONY_PROVIDER,
} from '../telephony/telephony.interface';
import { WebhookGuard } from './webhooks.guard';

/**
 * Webhook endpoints for telephony provider callbacks.
 *
 * These are called by Twilio (not by our frontend) when:
 *   - A call connects (voice) — we respond with TwiML
 *   - A call status changes (status) — we update our DB
 *   - A recording completes (recording) — we save the URL
 *
 * IMPORTANT: These routes are NOT behind JWT auth.
 * They are protected by webhook signature validation instead.
 */
@Controller({ path: 'webhooks/twilio', version: VERSION_NEUTRAL })
@SetMetadata('isPublic', true) // No JWT — protected by WebhookGuard
@UseGuards(WebhookGuard)
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private callsService: CallsService,
    @Inject(TELEPHONY_PROVIDER) private telephony: TelephonyProvider,
  ) {}

  /**
   * POST /api/webhooks/twilio/voice
   *
   * Called when an outbound call connects.
   * Returns TwiML that tells Twilio to:
   *   1. Record the call (both sides)
   *   2. Connect the audio
   */
  @Post('voice')
  async handleVoice(@Req() req: Request, @Res() res: Response) {
    this.logger.log('Voice webhook received');

    const twiml = this.telephony.generateCallResponse({
      record: true,
      recordingStatusCallbackUrl: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/twilio/recording`,
    });

    res.type('text/xml');
    res.send(twiml);
  }

  /**
   * POST /api/webhooks/twilio/status
   *
   * Called when a call status changes.
   * Updates the call record and pushes status via WebSocket.
   */
  @Post('status')
  async handleStatus(@Req() req: Request) {
    const event = this.telephony.parseStatusWebhook(req.body);
    this.logger.log(
      `Status webhook: ${event.providerCallId} → ${event.status}`,
    );

    await this.callsService.handleStatusUpdate(event);

    return { received: true };
  }

  /**
   * POST /api/webhooks/twilio/recording
   *
   * Called when a recording is completed.
   * Saves the recording URL to the call record.
   */
  @Post('recording')
  async handleRecording(@Req() req: Request) {
    const event = this.telephony.parseRecordingWebhook(req.body);
    this.logger.log(
      `Recording webhook: ${event.providerCallId} — ${event.status}`,
    );

    await this.callsService.handleRecordingComplete(event);

    return { received: true };
  }
}
