import { Exclude, Expose, Type } from 'class-transformer';
import { LeadResponseDto } from './lead-response.dto';

@Exclude()
class PaginationMetaDto {
  @Expose() total: number;
  @Expose() page: number;
  @Expose() limit: number;
  @Expose() totalPages: number;
}

/**
 * Paginated leads response — wraps { data: Lead[], meta: {...} }
 * through the DTO serialization layer.
 */
@Exclude()
export class PaginatedLeadsResponseDto {
  @Expose()
  @Type(() => LeadResponseDto)
  data: LeadResponseDto[];

  @Expose()
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto;
}
