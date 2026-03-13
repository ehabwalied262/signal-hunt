import { Exclude, Expose, Type } from 'class-transformer';
import { CallStatus } from '@prisma/client';
import { UserSummaryDto } from './user-response.dto';
import { DispositionResponseDto } from './disposition-response.dto';
import { TranscriptionResponseDto } from './transcription-response.dto';

/**
 * Safe response shape for a Call.
 *
 * @Exclude() at the class level means every property is hidden by default.
 * Only fields marked @Expose() are sent to the client.
 *
 * Internal fields intentionally NOT exposed:
 *   - agentId       (raw FK — clients get the nested `agent` object instead)
 *   - leadId        (raw FK — clients get the nested `lead` reference instead)
 *   - phoneNumberId (internal infrastructure detail)
 *   - recordingSid  (internal Twilio SID — clients get recordingUrl instead)
 *   - providerCallId (internal Twilio SID — never needed by frontend)
 */
@Exclude()
export class CallResponseDto {
  @Expose()
  id: string;

  @Expose()
  leadId: string; // Exposed as a reference — frontend needs this to navigate

  @Expose()
  status: CallStatus;

  @Expose()
  startedAt: Date | null;

  @Expose()
  answeredAt: Date | null;

  @Expose()
  endedAt: Date | null;

  @Expose()
  durationSeconds: number | null;

  @Expose()
  talkTimeSeconds: number | null;

  @Expose()
  recordingUrl: string | null;

  @Expose()
  errorCode: string | null;

  @Expose()
  createdAt: Date;

  // Nested agent — safe summary only, never the full User with passwordHash
  @Expose()
  @Type(() => UserSummaryDto)
  agent?: UserSummaryDto;

  // Nested disposition — when included in call history queries
  @Expose()
  @Type(() => DispositionResponseDto)
  disposition?: DispositionResponseDto | null;

  // Nested transcription — when included in call history / lead detail queries
  @Expose()
  @Type(() => TranscriptionResponseDto)
  transcription?: TranscriptionResponseDto | null;

  // providerCallId, recordingSid, phoneNumberId intentionally NOT exposed.
}