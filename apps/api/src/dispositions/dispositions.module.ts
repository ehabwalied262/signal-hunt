import { Module } from '@nestjs/common';
import { DispositionsController } from './dispositions.controller';
import { DispositionsService } from './dispositions.service';

@Module({
  controllers: [DispositionsController],
  providers: [DispositionsService],
  exports: [DispositionsService],
})
export class DispositionsModule {}
