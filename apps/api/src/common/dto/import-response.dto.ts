import { Exclude, Expose, Type } from 'class-transformer';

/* ------------------------------------------------------------------ */
/*  Import upload response                                             */
/* ------------------------------------------------------------------ */

@Exclude()
class DuplicateIncomingDto {
  @Expose() companyName: string;
  @Expose() contactName: string;
  @Expose() phoneNumber: string;
}

@Exclude()
class DuplicateExistingOwnerDto {
  @Expose() id: string;
  @Expose() fullName: string;
}

@Exclude()
class DuplicateExistingDto {
  @Expose() id: string;
  @Expose() phoneNumber: string;
  @Expose() companyName: string;
  @Expose() contactName: string;

  @Expose()
  @Type(() => DuplicateExistingOwnerDto)
  owner: DuplicateExistingOwnerDto;
}

@Exclude()
class DuplicateEntryDto {
  @Expose()
  @Type(() => DuplicateIncomingDto)
  incoming: DuplicateIncomingDto;

  @Expose()
  @Type(() => DuplicateExistingDto)
  existing: DuplicateExistingDto;
}

@Exclude()
class ImportErrorDto {
  @Expose() message: string;
}

@Exclude()
export class ImportUploadResponseDto {
  @Expose() importId: string;
  @Expose() status: string;
  @Expose() totalRows: number;
  @Expose() validRows: number;

  @Expose()
  @Type(() => ImportErrorDto)
  errors: ImportErrorDto[];

  @Expose()
  @Type(() => DuplicateEntryDto)
  duplicates: DuplicateEntryDto[];
}

/* ------------------------------------------------------------------ */
/*  Import resolve response                                            */
/* ------------------------------------------------------------------ */

@Exclude()
export class ImportResolveResponseDto {
  @Expose() importId: string;
  @Expose() status: string;
  @Expose() rowsToImport: number;
  @Expose() merged: number;
  @Expose() skipped: number;
}

/* ------------------------------------------------------------------ */
/*  Import status / list response                                      */
/* ------------------------------------------------------------------ */

@Exclude()
export class ImportStatusResponseDto {
  @Expose() id: string;
  @Expose() filename: string;
  @Expose() status: string;
  @Expose() totalRows: number;
  @Expose() processedRows: number;
  @Expose() newLeads: number;
  @Expose() duplicatesFound: number;
  @Expose() createdAt: Date;
}
