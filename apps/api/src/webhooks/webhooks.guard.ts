import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TelephonyProvider,
  TELEPHONY_PROVIDER,
} from '../telephony/telephony.interface';

/**
 * Guard that validates Twilio webhook signatures.
 *
 * CRITICAL SECURITY: Without this, anyone who discovers your
 * webhook URL can forge fake call events and corrupt your database.
 *
 * In development, validation can be skipped if WEBHOOK_VALIDATION=false.
 */
@Injectable()
export class WebhookGuard implements CanActivate {
  private readonly logger = new Logger(WebhookGuard.name);

  constructor(
    @Inject(TELEPHONY_PROVIDER) private telephony: TelephonyProvider,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip validation in development if configured
    if (
      this.configService.get<string>('NODE_ENV') === 'development' &&
      this.configService.get<string>('WEBHOOK_VALIDATION') === 'false'
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-twilio-signature'] as string;

    if (!signature) {
      this.logger.warn('Webhook request missing signature header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const webhookBaseUrl = this.configService.get<string>('WEBHOOK_BASE_URL');
    const url = `${webhookBaseUrl}${request.originalUrl}`;

    const isValid = this.telephony.validateWebhookSignature({
      signature,
      url,
      body: request.body,
    });

    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for ${request.originalUrl}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
