import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeadsModule } from './leads/leads.module';
import { CallsModule } from './calls/calls.module';
import { DispositionsModule } from './dispositions/dispositions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TelephonyModule } from './telephony/telephony.module';
import { ImportsModule } from './imports/imports.module';

@Module({
  imports: [
    // Global config — reads .env from project root
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Rate limiting — applied globally via APP_GUARD below.
    // Override per-route with @Throttle({ default: { limit, ttl } })
    // Auth endpoints get tighter limits in AuthController.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,   // 1 minute window
        limit: 60,     // 60 req/min default (generous for normal API use)
      },
    ]),

    // BullMQ — Redis-backed job queues
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
      inject: [ConfigService],
    }),

    // Core modules
    PrismaModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    CallsModule,
    DispositionsModule,
    WebhooksModule,
    TelephonyModule,
    ImportsModule,
  ],
  providers: [
    // Apply ThrottlerGuard globally — every route is rate-limited by default.
    // Webhook routes are excluded via the guard's skip logic below.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}