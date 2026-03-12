import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TELEPHONY_PROVIDER } from './telephony.interface';
import { TwilioProvider } from './twilio/twilio.provider';
import { TelnyxProvider } from './telnyx/telnyx.provider';
import { MockTelephonyProvider } from './mock/mock.provider';

const logger = new Logger('TelephonyModule');

/**
 * Telephony module — provides the active telephony provider via DI.
 *
 * Provider selection logic:
 *   1. TELEPHONY_PROVIDER_NAME=mock  → MockTelephonyProvider (dev/testing)
 *   2. TELEPHONY_PROVIDER_NAME=telnyx → TelnyxProvider
 *   3. TELEPHONY_PROVIDER_NAME=twilio → TwilioProvider (default)
 *
 * @Global() makes this injectable everywhere without importing.
 */
@Global()
@Module({
  providers: [
    TwilioProvider,
    TelnyxProvider,
    MockTelephonyProvider,
    {
      provide: TELEPHONY_PROVIDER,
      useFactory: (
        configService: ConfigService,
        twilio: TwilioProvider,
        telnyx: TelnyxProvider,
        mock: MockTelephonyProvider,
      ) => {
        const provider = configService.get<string>('TELEPHONY_PROVIDER_NAME', 'twilio');

        switch (provider) {
          case 'mock':
            logger.log('Using MOCK telephony provider');
            return mock;
          case 'telnyx':
            logger.log('Using TELNYX telephony provider');
            return telnyx;
          case 'twilio':
          default:
            logger.log('Using TWILIO telephony provider');
            return twilio;
        }
      },
      inject: [ConfigService, TwilioProvider, TelnyxProvider, MockTelephonyProvider],
    },
  ],
  exports: [TELEPHONY_PROVIDER],
})
export class TelephonyModule {}
