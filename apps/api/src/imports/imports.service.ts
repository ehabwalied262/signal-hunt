import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ImportStatus, ImportRowResolution } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseLeadFile, ParseResult } from './csv-parser.util';

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('csv-import') private importQueue: Queue,
  ) {}

  // ────────────────────────────────────────────────
  // Upload
  // ────────────────────────────────────────────────

  async uploadFile(
    file: Express.Multer.File,
    uploadedBy: string,
  ) {
    // Validate file type
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
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
    const hasDuplicates = duplicateRows.length > 0;

    // Create import record + all import rows in a single transaction
    const csvImport = await this.prisma.$transaction(
      async (tx) => {
        const imp = await tx.csvImport.create({
          data: {
            uploadedBy,
            filename: file.originalname,
            totalRows: parseResult.totalRows,
            duplicatesFound: duplicateRows.length,
            status: hasDuplicates
              ? ImportStatus.AWAITING_DEDUP_REVIEW
              : ImportStatus.PENDING,
          },
        });

        // Insert ALL rows (new + duplicate) into csv_import_rows.
        // Batch createMany in chunks of 2000 to stay under PG parameter limits.
        const ROW_BATCH = 2000;
        for (let i = 0; i < parseResult.rows.length; i += ROW_BATCH) {
          const batch = parseResult.rows.slice(i, i + ROW_BATCH);

          await tx.csvImportRow.createMany({
            data: batch.map((row) => {
              const existing = duplicateMap.get(row.phoneNumber);
              return {
                importId: imp.id,
                rowIndex: row.rowIndex,
                companyName: row.companyName,
                contactName: row.contactName,
                contactTitle: row.contactTitle,
                phoneNumber: row.phoneNumber,
                country: row.country,
                location: row.location,
                headcount: row.headcount,
                headcountGrowth6m: row.headcountGrowth6m,
                headcountGrowth12m: row.headcountGrowth12m,
                email: row.email,
                website: row.website,
                personalLinkedin: row.personalLinkedin,
                companyLinkedin: row.companyLinkedin,
                industry: row.industry,
                companyOverview: row.companyOverview,
                existingLeadId: existing ? existing.id : null,
                resolution: existing
                  ? ImportRowResolution.DUPLICATE
                  : ImportRowResolution.PENDING,
              };
            }),
          });
        }

        return imp;
      },
      { timeout: 30_000 }, // 30 s for large files
    );

    // If no duplicates, enqueue immediately
    if (!hasDuplicates) {
      await this.enqueueImport(csvImport.id, uploadedBy);

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

  // ────────────────────────────────────────────────
  // Resolve Duplicates
  // ────────────────────────────────────────────────

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

    // Fetch all DUPLICATE rows for this import
    const duplicateRows = await this.prisma.csvImportRow.findMany({
      where: { importId, resolution: ImportRowResolution.DUPLICATE },
    });

    if (duplicateRows.length === 0) {
      throw new BadRequestException('No duplicate rows found for this import');
    }

    const decisionMap = new Map(
      decisions.map((d) => [d.phoneNumber, d.action]),
    );

    // Process all decisions in a transaction
    await this.prisma.$transaction(async (tx) => {
      for (const row of duplicateRows) {
        const action = decisionMap.get(row.phoneNumber) || 'skip';

        if (action === 'merge' && row.existingLeadId) {
          // Update existing lead with ALL 15 incoming fields
          await tx.lead.update({
            where: { id: row.existingLeadId },
            data: {
              companyName: row.companyName || undefined,
              contactName: row.contactName || undefined,
              contactTitle: row.contactTitle || undefined,
              country: row.country || undefined,
              location: row.location || undefined,
              headcount: row.headcount || undefined,
              headcountGrowth6m: row.headcountGrowth6m || undefined,
              headcountGrowth12m: row.headcountGrowth12m || undefined,
              companyOverview: row.companyOverview || undefined,
              email: row.email || undefined,
              website: row.website || undefined,
              personalLinkedin: row.personalLinkedin || undefined,
              companyLinkedin: row.companyLinkedin || undefined,
              industry: row.industry || undefined,
            },
          });

          await tx.csvImportRow.update({
            where: { id: row.id },
            data: { resolution: ImportRowResolution.MERGE },
          });
        } else if (action === 'import') {
          await tx.csvImportRow.update({
            where: { id: row.id },
            data: { resolution: ImportRowResolution.IMPORT },
          });
        } else {
          // Default: skip
          await tx.csvImportRow.update({
            where: { id: row.id },
            data: { resolution: ImportRowResolution.SKIP },
          });
        }
      }

      // Transition import out of review
      await tx.csvImport.update({
        where: { id: importId },
        data: { status: ImportStatus.PENDING },
      });
    });

    // Count importable rows: PENDING (non-dup) + IMPORT (user chose import)
    const importableCount = await this.prisma.csvImportRow.count({
      where: {
        importId,
        resolution: {
          in: [ImportRowResolution.PENDING, ImportRowResolution.IMPORT],
        },
      },
    });

    if (importableCount > 0) {
      await this.enqueueImport(importId, userId);
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
      status: importableCount > 0 ? 'processing' : 'completed',
      rowsToImport: importableCount,
      merged: decisions.filter((d) => d.action === 'merge').length,
      skipped: decisions.filter((d) => d.action === 'skip').length,
    };
  }

  // ────────────────────────────────────────────────
  // Read helpers
  // ────────────────────────────────────────────────

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

  // ────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────

  private parseFile(file: Express.Multer.File): ParseResult {
    return parseLeadFile(file.buffer, file.originalname);
  }

  /**
   * Enqueue a lightweight job — the processor reads rows from CsvImportRow.
   * No row data in Redis, just two UUIDs.
   */
  private async enqueueImport(importId: string, ownerId: string) {
    await this.importQueue.add(
      'process-csv',
      { importId, ownerId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(`Enqueued CSV import ${importId}`);
  }
}
