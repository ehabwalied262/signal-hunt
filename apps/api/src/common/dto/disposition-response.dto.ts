import { Exclude, Expose } from 'class-transformer';
import { DispositionType } from '@prisma/client';

/**
 * Safe response shape for a Disposition.
 *
 * @Exclude() at the class level means every property is hidden by default.
 * Only fields marked @Expose() are sent to the client.
 *
 * All disposition fields are safe to expose — there are no internal or
 * sensitive fields on this model. The @Exclude()/@Expose() pattern is
 * applied anyway so that future columns don't auto-leak.
 */
@Exclude()
export class DispositionResponseDto {
  @Expose()
  id: string;

  @Expose()
  callId: string;

  @Expose()
  type: DispositionType;

  @Expose()
  notes: string | null;

  @Expose()
  painPoints: string | null;

  @Expose()
  callbackScheduledAt: Date | null;

  @Expose()
  createdAt: Date;

  // callId is exposed — frontend needs it to correlate disposition → call.
  // No fields are withheld here, but the explicit opt-in pattern still
  // protects against future column additions leaking automatically.
}