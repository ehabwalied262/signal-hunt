import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DispositionType, LeadStatus, CallStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDispositionDto } from './dto/create-disposition.dto';

@Injectable()
export class DispositionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a disposition for a completed call.
   * Also updates the lead status based on disposition type.
   */
  async create(agentId: string, dto: CreateDispositionDto) {
    // Validate call exists and belongs to agent
    const call = await this.prisma.call.findFirst({
      where: {
        id: dto.callId,
        agentId,
      },
      include: { disposition: true },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Can only disposition terminal-status calls
    const terminalStatuses: CallStatus[] = [
      CallStatus.COMPLETED,
      CallStatus.NO_ANSWER,
      CallStatus.BUSY,
      CallStatus.FAILED,
    ];

    if (!terminalStatuses.includes(call.status)) {
      throw new BadRequestException(
        'Can only add disposition to completed calls',
      );
    }

    // Prevent duplicate dispositions
    if (call.disposition) {
      throw new ConflictException('This call already has a disposition');
    }

    // Map disposition type to lead status
    const leadStatusMap: Partial<Record<DispositionType, LeadStatus>> = {
      [DispositionType.INTERESTED]: LeadStatus.INTERESTED,
      [DispositionType.NOT_INTERESTED]: LeadStatus.NOT_INTERESTED,
      [DispositionType.WRONG_NUMBER]: LeadStatus.WRONG_NUMBER,
      [DispositionType.CALLBACK]: LeadStatus.CALLBACK_SCHEDULED,
    };

    // Create disposition and update lead in a transaction
    const [disposition] = await this.prisma.$transaction([
      this.prisma.disposition.create({
        data: {
          callId: dto.callId,
          type: dto.type,
          notes: dto.notes,
          painPoints: dto.painPoints,
          callbackScheduledAt: dto.callbackScheduledAt
            ? new Date(dto.callbackScheduledAt)
            : undefined,
        },
      }),
      // Update lead status based on disposition
      this.prisma.lead.update({
        where: { id: call.leadId },
        data: {
          status: leadStatusMap[dto.type] || LeadStatus.CONTACTED,
          // Flag wrong numbers
          isWrongNumber: dto.type === DispositionType.WRONG_NUMBER,
        },
      }),
    ]);

    return disposition;
  }
}
