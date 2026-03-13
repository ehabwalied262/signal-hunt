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
import { Serialize } from '../common/interceptors/serialize.interceptor';
import { LeadResponseDto } from '../common/dto/lead-response.dto';
import { PaginatedLeadsResponseDto } from '../common/dto/paginated-response.dto';

@Controller({ path: 'leads', version: '1' })
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Post()
  @Serialize(LeadResponseDto)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(userId, dto);
  }

  @Get()
  @Serialize(PaginatedLeadsResponseDto)
  async findAll(
    @CurrentUser() user: { id: string; role: string },
    @Query() filters: LeadFilterDto,
  ) {
    const ownerId = user.role === UserRole.ADMIN ? undefined : user.id;
    return this.leadsService.findAll(filters, ownerId);
  }

  @Get(':id')
  @Serialize(LeadResponseDto)
  async findById(@Param('id') id: string) {
    return this.leadsService.findById(id);
  }

  @Patch(':id')
  @Serialize(LeadResponseDto)
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

  @Patch(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Serialize(LeadResponseDto)
  async reassign(
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
  ) {
    return this.leadsService.reassign(id, newOwnerId);
  }
}