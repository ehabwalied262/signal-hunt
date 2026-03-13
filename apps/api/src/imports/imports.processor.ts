import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImportStatus, ImportRowResolution } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Lightweight payload — the processor reads actual row data from CsvImportRow.
 * This keeps the BullMQ/Redis payload at ~80 bytes regardless of CSV size.
 */
interface ImportJobData {
  importId: string;
  ownerId: string;
}

@Processor('csv-import')
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    const { importId, ownerId } = job.data;

    this.logger.log(`Processing CSV import ${importId}`);

    // Update status to processing
    await this.prisma.csvImport.update({
      where: { id: importId },
      data: { status: ImportStatus.PROCESSING },
    });

    let processedCount = 0;
    let createdCount = 0;

    try {
      // Count total importable rows for progress reporting
      const totalImportable = await this.prisma.csvImportRow.count({
        where: {
          importId,
          resolution: {
            in: [ImportRowResolution.PENDING, ImportRowResolution.IMPORT],
          },
        },
      });

      // Process in batches using cursor-based pagination
      const batchSize = 50;
      let cursor: string | undefined;

      while (true) {
        const rows = await this.prisma.csvImportRow.findMany({
          where: {
            importId,
            resolution: {
              in: [ImportRowResolution.PENDING, ImportRowResolution.IMPORT],
            },
          },
          take: batchSize,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { rowIndex: 'asc' },
        });

        if (rows.length === 0) break;

        cursor = rows[rows.length - 1].id;

        // Bulk insert leads
        const result = await this.prisma.lead.createMany({
          data: rows.map((row) => ({
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
            ownerId,
            sourceImportId: importId,
          })),
          skipDuplicates: true, // Safety net — skip if somehow duplicated
        });

        processedCount += rows.length;
        createdCount += result.count;

        // Update progress
        await this.prisma.csvImport.update({
          where: { id: importId },
          data: {
            processedRows: processedCount,
            newLeads: createdCount,
          },
        });

        // Report progress to BullMQ
        if (totalImportable > 0) {
          await job.updateProgress(
            Math.round((processedCount / totalImportable) * 100),
          );
        }
      }

      // Mark as completed
      await this.prisma.csvImport.update({
        where: { id: importId },
        data: {
          status: ImportStatus.COMPLETED,
          processedRows: processedCount,
          newLeads: createdCount,
        },
      });

      this.logger.log(
        `CSV import ${importId} completed: ${createdCount} leads created from ${processedCount} rows`,
      );
    } catch (error) {
      this.logger.error(
        `CSV import ${importId} failed at row ${processedCount}`,
        error,
      );

      await this.prisma.csvImport.update({
        where: { id: importId },
        data: {
          status: ImportStatus.FAILED,
          processedRows: processedCount,
          newLeads: createdCount,
        },
      });

      throw error; // BullMQ will retry based on job config
    }
  }
}
