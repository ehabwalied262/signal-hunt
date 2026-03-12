import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  /**
   * POST /api/leads — Create a single lead (assigned to current user)
   */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(userId, dto);
  }

  /**
   * GET /api/leads — Get paginated lead list
   * BDRs see only their leads. Admins see all.
   */
  @Get()
  async findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query() filters: LeadFilterDto,
  ) {
    const ownerId = user.role === UserRole.ADMIN ? undefined : user.id;
    return this.leadsService.findAll(filters, ownerId);
  }

  /**
   * GET /api/leads/:id — Get single lead with call history
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  /**
   * PATCH /api/leads/:id — Update lead
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.leadsService.update(
      id,
      dto,
      user.id,
      user.role === UserRole.ADMIN,
    );
  }

  /**
   * PATCH /api/leads/:id/reassign — Admin: reassign lead to another BDR
   */
  @Patch(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async reassign(
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
  ) {
    return this.leadsService.reassign(id, newOwnerId);
  }
}
