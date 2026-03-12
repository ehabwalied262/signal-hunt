import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { LeadStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class LeadFilterDto {
  @IsOptional()
  @IsString()
  search?: string; // Searches company name, contact name, phone

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;
}
