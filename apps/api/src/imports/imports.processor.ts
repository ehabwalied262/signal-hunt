import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImportStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface ImportJobData {
  importId: string;
  rows: Array<{
    companyName: string;
    contactName: string | null;
    contactTitle: string | null;
    phoneNumber: string;
    country: string | null;
    location: string | null;
    headcount: number | null;
    headcountGrowth6m: number | null;
    headcountGrowth12m: number | null;
    companyOverview: string | null;
  }>;
  ownerId: string;
}

@Processor('csv-import')
export class ImportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportsProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<ImportJobData>): Promise<void> {
    const { importId, rows, ownerId } = job.data;

    this.logger.log(
      `Processing CSV import ${importId}: ${rows.length} rows`,
    );

    // Update status to processing
    await this.prisma.csvImport.update({
      where: { id: importId },
      data: { status: ImportStatus.PROCESSING },
    });

    let processedCount = 0;
    let createdCount = 0;

    try {
      // Process in batches of 50 for better performance
      const batchSize = 50;

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        // Use createMany for bulk insert
        const result = await this.prisma.lead.createMany({
          data: batch.map((row) => ({
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
            ownerId,
            sourceImportId: importId,
          })),
          skipDuplicates: true, // Safety net — skip if somehow duplicated
        });

        processedCount += batch.length;
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
        await job.updateProgress(
          Math.round((processedCount / rows.length) * 100),
        );
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
