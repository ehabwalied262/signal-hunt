import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { DispositionType } from '@prisma/client';

export class CreateDispositionDto {
  @IsUUID()
  @IsNotEmpty()
  callId: string;

  @IsEnum(DispositionType)
  @IsNotEmpty()
  type: DispositionType;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  painPoints?: string;

  @IsDateString()
  @IsOptional()
  callbackScheduledAt?: string;
}
