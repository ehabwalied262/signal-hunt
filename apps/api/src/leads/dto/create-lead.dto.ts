import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  Matches,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsString()
  @IsOptional()
  contactTitle?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +442071234567)',
  })
  phoneNumber: string;

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
}
