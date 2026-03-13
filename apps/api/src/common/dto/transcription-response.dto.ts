import { Exclude, Expose } from 'class-transformer';

/**
 * Safe response shape for a Transcription summary.
 * Used when transcription is nested inside a Call response.
 */
@Exclude()
export class TranscriptionResponseDto {
  @Expose()
  id: string;

  @Expose()
  status: string;

  @Expose()
  text: string | null;

  @Expose()
  completedAt: Date | null;
}
