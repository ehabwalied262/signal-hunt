import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhookGuard } from './webhooks.guard';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [CallsModule],
  controllers: [WebhooksController],
  providers: [WebhookGuard],
})
export class WebhooksModule {}
