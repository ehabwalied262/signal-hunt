import { IsNotEmpty, IsUUID } from 'class-validator';

export class InitiateCallDto {
  @IsUUID()
  @IsNotEmpty()
  leadId: string;
}
