import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DispositionType, LeadStatus, CallStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDispositionDto } from './dto/create-disposition.dto';
import { UpdateDispositionDto } from './dto/update-disposition.dto';

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
    // Note: OPT_OUT enum values will be available after running db:generate
    const leadStatusMap: Record<string, string> = {
      INTERESTED: 'INTERESTED',
      NOT_INTERESTED: 'NOT_INTERESTED',
      WRONG_NUMBER: 'WRONG_NUMBER',
      CALLBACK: 'CALLBACK_SCHEDULED',
      OPT_OUT: 'OPT_OUT',
    };

    // Build lead update data
    const dtoType = dto.type as string;
    const leadUpdateData: Record<string, any> = {
      status: leadStatusMap[dtoType] || LeadStatus.CONTACTED,
      isWrongNumber: dtoType === 'WRONG_NUMBER',
    };

    // Flag opt-out leads
    if (dtoType === 'OPT_OUT') {
      leadUpdateData.isOptOut = true;
    }

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
      this.prisma.lead.update({
        where: { id: call.leadId },
        data: leadUpdateData,
      }),
    ]);

    return disposition;
  }

  /**
   * Update an existing disposition (edit notes, pain points, etc.).
   */
  async update(dispositionId: string, agentId: string, dto: UpdateDispositionDto) {
    const disposition = await this.prisma.disposition.findUnique({
      where: { id: dispositionId },
      include: {
        call: { select: { agentId: true } },
      },
    });

    if (!disposition) {
      throw new NotFoundException('Disposition not found');
    }

    // Only the agent who made the call can edit
    if (disposition.call.agentId !== agentId) {
      throw new BadRequestException('You can only edit your own dispositions');
    }

    return this.prisma.disposition.update({
      where: { id: dispositionId },
      data: {
        notes: dto.notes !== undefined ? dto.notes : undefined,
        painPoints: dto.painPoints !== undefined ? dto.painPoints : undefined,
      },
    });
  }
}
