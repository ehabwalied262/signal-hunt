import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ImportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseLeadFile, ParseResult } from './csv-parser.util';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('csv-import') private importQueue: Queue,
  ) {}

  /**
   * Handle file upload: parse, validate, check for duplicates,
   * then either enqueue for processing or return duplicates for review.
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadedBy: string,
  ) {
    // Validate file type
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream', // Some systems send CSV as this
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Please upload a CSV or Excel file.',
      );
    }

    // Parse file
    const parseResult = this.parseFile(file);

    if (parseResult.rows.length === 0) {
      throw new BadRequestException(
        parseResult.errors.length > 0
          ? `File parsing failed: ${parseResult.errors[0].message}`
          : 'File contains no valid rows',
      );
    }

    // Check for duplicates against existing leads
    const phoneNumbers = parseResult.rows.map((r) => r.phoneNumber);
    const existingLeads = await this.prisma.lead.findMany({
      where: { phoneNumber: { in: phoneNumbers } },
      select: {
        id: true,
        phoneNumber: true,
        companyName: true,
        contactName: true,
        owner: { select: { id: true, fullName: true } },
      },
    });

    const duplicateMap = new Map(
      existingLeads.map((l) => [l.phoneNumber, l]),
    );

    const newRows = parseResult.rows.filter(
      (r) => !duplicateMap.has(r.phoneNumber),
    );
    const duplicateRows = parseResult.rows.filter((r) =>
      duplicateMap.has(r.phoneNumber),
    );

    // Create import record
    const csvImport = await this.prisma.csvImport.create({
      data: {
        uploadedBy,
        filename: file.originalname,
        totalRows: parseResult.totalRows,
        duplicatesFound: duplicateRows.length,
        status:
          duplicateRows.length > 0
            ? ImportStatus.AWAITING_DEDUP_REVIEW
            : ImportStatus.PENDING,
        duplicateData:
          duplicateRows.length > 0
            ? {
                duplicates: duplicateRows.map((row) => ({
                  incoming: {
                    companyName: row.companyName,
                    contactName: row.contactName,
                    phoneNumber: row.phoneNumber,
                    rowIndex: row.rowIndex,
                  },
                  existing: duplicateMap.get(row.phoneNumber),
                })),
              }
            : undefined,
      },
    });

    // If no duplicates, enqueue immediately
    if (duplicateRows.length === 0) {
      await this.enqueueImport(csvImport.id, newRows, uploadedBy);

      return {
        importId: csvImport.id,
        status: 'processing',
        totalRows: parseResult.totalRows,
        validRows: newRows.length,
        errors: parseResult.errors,
        duplicates: [],
      };
    }

    // Has duplicates — return for review
    // Store valid non-duplicate rows in queue payload for later
    await this.prisma.csvImport.update({
      where: { id: csvImport.id },
      data: {
        duplicateData: {
          duplicates: duplicateRows.map((row) => ({
            incoming: {
              companyName: row.companyName,
              contactName: row.contactName,
              contactTitle: row.contactTitle,
              phoneNumber: row.phoneNumber,
              country: row.country,
              location: row.location,
              headcount: row.headcount,
              headcountGrowth6m: row.headcountGrowth6m,
              headcountGrowth12m: row.headcountGrowth12m,
              companyOverview: row.companyOverview,
              rowIndex: row.rowIndex,
            },
            existing: duplicateMap.get(row.phoneNumber),
          })),
          newRows: newRows.map((r) => ({
            companyName: r.companyName,
            contactName: r.contactName,
            contactTitle: r.contactTitle,
            phoneNumber: r.phoneNumber,
            country: r.country,
            location: r.location,
            headcount: r.headcount,
            headcountGrowth6m: r.headcountGrowth6m,
            headcountGrowth12m: r.headcountGrowth12m,
            companyOverview: r.companyOverview,
          })),
        },
      },
    });

    return {
      importId: csvImport.id,
      status: 'awaiting_review',
      totalRows: parseResult.totalRows,
      validRows: newRows.length,
      errors: parseResult.errors,
      duplicates: duplicateRows.map((row) => ({
        incoming: {
          companyName: row.companyName,
          contactName: row.contactName,
          phoneNumber: row.phoneNumber,
        },
        existing: duplicateMap.get(row.phoneNumber),
      })),
    };
  }

  /**
   * After user reviews duplicates, they decide per duplicate:
   *   - skip: don't import the duplicate row
   *   - merge: update existing lead with new data
   *   - import: create as new lead anyway (override dedup)
   */
  async resolveDuplicates(
    importId: string,
    userId: string,
    decisions: Array<{
      phoneNumber: string;
      action: 'skip' | 'merge' | 'import';
    }>,
  ) {
    const csvImport = await this.prisma.csvImport.findUnique({
      where: { id: importId },
    });

    if (!csvImport) {
      throw new NotFoundException('Import not found');
    }

    if (csvImport.status !== ImportStatus.AWAITING_DEDUP_REVIEW) {
      throw new BadRequestException('Import is not awaiting review');
    }

    const duplicateData = csvImport.duplicateData as any;
    if (!duplicateData) {
      throw new BadRequestException('No duplicate data found');
    }

    const decisionMap = new Map(
      decisions.map((d) => [d.phoneNumber, d.action]),
    );

    // Process merge decisions immediately
    for (const dup of duplicateData.duplicates) {
      const action = decisionMap.get(dup.incoming.phoneNumber) || 'skip';

      if (action === 'merge') {
        // Update existing lead with incoming data
        await this.prisma.lead.update({
          where: { id: dup.existing.id },
          data: {
            companyName: dup.incoming.companyName || undefined,
            contactName: dup.incoming.contactName || undefined,
            contactTitle: dup.incoming.contactTitle || undefined,
            country: dup.incoming.country || undefined,
            location: dup.incoming.location || undefined,
            headcount: dup.incoming.headcount || undefined,
            headcountGrowth6m: dup.incoming.headcountGrowth6m || undefined,
            headcountGrowth12m: dup.incoming.headcountGrowth12m || undefined,
            companyOverview: dup.incoming.companyOverview || undefined,
          },
        });
      }
    }

    // Collect rows to import:
    // 1. All non-duplicate rows (already stored in duplicateData.newRows)
    // 2. Duplicate rows where user chose "import"
    const rowsToImport = [
      ...(duplicateData.newRows || []),
      ...duplicateData.duplicates
        .filter(
          (d: any) =>
            decisionMap.get(d.incoming.phoneNumber) === 'import',
        )
        .map((d: any) => d.incoming),
    ];

    // Update import status and enqueue
    await this.prisma.csvImport.update({
      where: { id: importId },
      data: { status: ImportStatus.PENDING },
    });

    if (rowsToImport.length > 0) {
      await this.enqueueImport(importId, rowsToImport, userId);
    } else {
      // Nothing to import — mark as completed
      await this.prisma.csvImport.update({
        where: { id: importId },
        data: {
          status: ImportStatus.COMPLETED,
          processedRows: 0,
          newLeads: 0,
        },
      });
    }

    return {
      importId,
      status: rowsToImport.length > 0 ? 'processing' : 'completed',
      rowsToImport: rowsToImport.length,
      merged: decisions.filter((d) => d.action === 'merge').length,
      skipped: decisions.filter((d) => d.action === 'skip').length,
    };
  }

  /**
   * Get import status.
   */
  async getImportStatus(importId: string) {
    const csvImport = await this.prisma.csvImport.findUnique({
      where: { id: importId },
    });

    if (!csvImport) {
      throw new NotFoundException('Import not found');
    }

    return {
      id: csvImport.id,
      filename: csvImport.filename,
      status: csvImport.status,
      totalRows: csvImport.totalRows,
      processedRows: csvImport.processedRows,
      newLeads: csvImport.newLeads,
      duplicatesFound: csvImport.duplicatesFound,
      createdAt: csvImport.createdAt,
    };
  }

  /**
   * Get all imports for a user (or all imports for admin).
   */
  async getImports(userId: string, isAdmin: boolean) {
    return this.prisma.csvImport.findMany({
      where: isAdmin ? {} : { uploadedBy: userId },
      select: {
        id: true,
        filename: true,
        status: true,
        totalRows: true,
        processedRows: true,
        newLeads: true,
        duplicatesFound: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  private parseFile(file: Express.Multer.File): ParseResult {
    return parseLeadFile(file.buffer, file.originalname);
  }

  private async enqueueImport(
    importId: string,
    rows: any[],
    ownerId: string,
  ) {
    await this.importQueue.add(
      'process-csv',
      { importId, rows, ownerId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(
      `Enqueued CSV import ${importId} with ${rows.length} rows`,
    );
  }
}
