import { IsString, IsOptional, IsInt, IsNumber, IsEnum, IsBoolean, Matches } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class UpdateLeadDto {
  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsString()
  @IsOptional()
  contactTitle?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @IsOptional()
  headcount?: number;

  @IsNumber()
  @IsOptional()
  headcountGrowth6m?: number;

  @IsNumber()
  @IsOptional()
  headcountGrowth12m?: number;

  @IsString()
  @IsOptional()
  companyOverview?: string;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsBoolean()
  @IsOptional()
  isWrongNumber?: boolean;
}
