import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new lead assigned to the specified owner.
   */
  async create(ownerId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        ...dto,
        ownerId,
      },
    });
  }

  /**
   * Get paginated, filterable lead list for a BDR (their leads only).
   * Admins can pass ownerId=undefined to see all leads.
   */
  async findAll(filters: LeadFilterDto, ownerId?: string) {
    const where: Prisma.LeadWhereInput = {};

    // Strict ownership for BDRs
    if (ownerId) {
      where.ownerId = ownerId;
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Country filter
    if (filters.country) {
      where.country = filters.country;
    }

    // Exclude wrong numbers from default views
    where.isWrongNumber = false;

    // Search across multiple fields
    if (filters.search) {
      where.OR = [
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { phoneNumber: { contains: filters.search } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          owner: {
            select: { id: true, fullName: true },
          },
          _count: {
            select: { calls: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data: leads,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single lead with call history.
   */
  async findById(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true },
        },
        calls: {
          include: {
            disposition: true,
            transcription: {
              select: {
                id: true,
                status: true,
                text: true,
                completedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  /**
   * Update a lead. BDRs can only update their own leads.
   */
  async update(id: string, dto: UpdateLeadDto, userId: string, isAdmin: boolean) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!isAdmin && lead.ownerId !== userId) {
      throw new BadRequestException('You can only update your own leads');
    }

    // If marking as wrong number, also update status
    const data: any = { ...dto };
    if (dto.isWrongNumber) {
      data.status = LeadStatus.WRONG_NUMBER;
    }

    return this.prisma.lead.update({
      where: { id },
      data,
    });
  }

  /**
   * Check for duplicate phone numbers.
   * Returns existing leads with the same phone number.
   */
  async checkDuplicates(phoneNumbers: string[]) {
    return this.prisma.lead.findMany({
      where: {
        phoneNumber: { in: phoneNumbers },
      },
      select: {
        id: true,
        phoneNumber: true,
        companyName: true,
        contactName: true,
        owner: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  /**
   * Admin: reassign a lead to a different BDR.
   */
  async reassign(leadId: string, newOwnerId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return this.prisma.lead.update({
      where: { id: leadId },
      data: { ownerId: newOwnerId },
    });
  }
}
