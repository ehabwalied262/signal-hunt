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
import { Serialize } from '../common/interceptors/serialize.interceptor';
import {
  ImportUploadResponseDto,
  ImportResolveResponseDto,
  ImportStatusResponseDto,
} from '../common/dto/import-response.dto';

@Controller({path: 'imports', version: '1'})
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  @Post('upload')
  @Serialize(ImportUploadResponseDto)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
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

  @Post(':id/resolve')
  @Serialize(ImportResolveResponseDto)
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

  @Get(':id')
  @Serialize(ImportStatusResponseDto)
  async getStatus(@Param('id') importId: string) {
    return this.importsService.getImportStatus(importId);
  }

  @Get()
  @Serialize(ImportStatusResponseDto)
  async list(
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.importsService.getImports(
      user.id,
      user.role === UserRole.ADMIN,
    );
  }
}
