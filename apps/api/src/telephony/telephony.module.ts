import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TELEPHONY_PROVIDER } from './telephony.interface';
import { TwilioProvider } from './twilio/twilio.provider';
import { TelnyxProvider } from './telnyx/telnyx.provider';

/**
 * Telephony module — provides the active telephony provider via DI.
 *
 * To switch from Twilio to Telnyx:
 *   1. Set TELEPHONY_PROVIDER=telnyx in .env
 *   2. Implement TelnyxProvider fully
 *   3. Done. Zero changes to business logic.
 *
 * @Global() makes this injectable everywhere without importing.
 */
@Global()
@Module({
  providers: [
    TwilioProvider,
    TelnyxProvider,
    {
      provide: TELEPHONY_PROVIDER,
      useFactory: (configService: ConfigService, twilio: TwilioProvider, telnyx: TelnyxProvider) => {
        const provider = configService.get<string>('TELEPHONY_PROVIDER_NAME', 'twilio');

        switch (provider) {
          case 'telnyx':
            return telnyx;
          case 'twilio':
          default:
            return twilio;
        }
      },
      inject: [ConfigService, TwilioProvider, TelnyxProvider],
    },
  ],
  exports: [TELEPHONY_PROVIDER],
})
export class TelephonyModule {}
