import { IsOptional, IsString } from 'class-validator';

export class UpdateDispositionDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  painPoints?: string;
}
