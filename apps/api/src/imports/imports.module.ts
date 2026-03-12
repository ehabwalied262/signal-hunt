import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportsProcessor } from './imports.processor';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'csv-import',
    }),
    LeadsModule,
  ],
  controllers: [ImportsController],
  providers: [ImportsService, ImportsProcessor],
})
export class ImportsModule {}
