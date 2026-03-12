import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
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
})
export class AppModule {}
