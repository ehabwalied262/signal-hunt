import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Serialize } from '../common/interceptors/serialize.interceptor';
import { UserResponseDto, UserSummaryDto } from '../common/dto/user-response.dto';

@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Serialize(UserResponseDto)
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('bdrs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Serialize(UserSummaryDto)
  async findAllBDRs() {
    return this.usersService.findAllBDRs();
  }
}