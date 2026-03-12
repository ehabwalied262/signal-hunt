import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  /**
   * POST /api/imports/upload — Upload a CSV/Excel file
   * File is parsed, validated, and either processed or returned with duplicates.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (_req, file, callback) => {
        const allowed = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/octet-stream',
        ];
        if (allowed.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              'Only CSV and Excel files are allowed',
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.importsService.uploadFile(file, userId);
  }

  /**
   * POST /api/imports/:id/resolve — Resolve duplicate decisions
   * Called after user reviews duplicates and decides skip/merge/import for each.
   */
  @Post(':id/resolve')
  async resolveDuplicates(
    @Param('id') importId: string,
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      decisions: Array<{
        phoneNumber: string;
        action: 'skip' | 'merge' | 'import';
      }>;
    },
  ) {
    return this.importsService.resolveDuplicates(
      importId,
      userId,
      body.decisions,
    );
  }

  /**
   * GET /api/imports/:id — Get import status (for polling progress)
   */
  @Get(':id')
  async getStatus(@Param('id') importId: string) {
    return this.importsService.getImportStatus(importId);
  }

  /**
   * GET /api/imports — List recent imports
   */
  @Get()
  async list(
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.importsService.getImports(
      user.id,
      user.role === UserRole.ADMIN,
    );
  }
}
