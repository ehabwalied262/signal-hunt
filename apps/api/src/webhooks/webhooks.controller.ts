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

@Controller({ path: 'webhooks/twilio', version: VERSION_NEUTRAL })
@SetMetadata('isPublic', true)
@SetMetadata('skipCsrf', true)
@UseGuards(WebhookGuard)
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private callsService: CallsService,
    @Inject(TELEPHONY_PROVIDER) private telephony: TelephonyProvider,
  ) {}

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

  @Post('status')
  async handleStatus(@Req() req: Request) {
    const event = this.telephony.parseStatusWebhook(req.body);
    this.logger.log(
      `Status webhook: ${event.providerCallId} → ${event.status}`,
    );

    await this.callsService.handleStatusUpdate(event);

    return { received: true };
  }

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