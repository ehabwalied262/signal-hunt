import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { LeadStatus } from '@prisma/client';
import { UserSummaryDto } from './user-response.dto';
import { CallResponseDto } from './call-response.dto';

/**
 * Safe response shape for a Lead.
 *
 * @Exclude() at the class level means every property is hidden by default.
 * Only fields marked @Expose() are sent to the client. Adding a new column
 * to the leads table does NOT expose it automatically — it must be declared
 * here first.
 *
 * Internal fields intentionally NOT exposed:
 *   - ownerId     (raw FK — clients get the nested `owner` object instead)
 *   - sourceImportId (internal tracking, not useful to frontend)
 */
@Exclude()
export class LeadResponseDto {
  @Expose()
  id: string;

  @Expose()
  companyName: string;

  @Expose()
  contactName: string | null;

  @Expose()
  contactTitle: string | null;

  @Expose()
  phoneNumber: string;

  @Expose()
  country: string | null;

  @Expose()
  location: string | null;

  @Expose()
  headcount: number | null;

  @Expose()
  @Transform(({ value }) => value?.toString() ?? null)
  headcountGrowth6m: string | null; // Prisma Decimal → string over JSON

  @Expose()
  @Transform(({ value }) => value?.toString() ?? null)
  headcountGrowth12m: string | null;

  @Expose()
  email: string | null;

  @Expose()
  website: string | null;

  @Expose()
  personalLinkedin: string | null;

  @Expose()
  companyLinkedin: string | null;

  @Expose()
  industry: string | null;

  @Expose()
  companyOverview: string | null;

  @Expose()
  aiSummary: string | null;

  @Expose()
  status: LeadStatus;

  @Expose()
  isWrongNumber: boolean;

  @Expose()
  isOptOut: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // Nested owner — exposed as a safe UserSummaryDto, never as a raw User
  @Expose()
  @Type(() => UserSummaryDto)
  owner?: UserSummaryDto;

  // Call count (from Prisma _count) — exposed when present
  @Expose()
  _count?: { calls: number };

  // Nested calls — only present in lead detail view (findById)
  @Expose()
  @Type(() => CallResponseDto)
  calls?: CallResponseDto[];

  // ownerId and sourceImportId intentionally NOT exposed.
}