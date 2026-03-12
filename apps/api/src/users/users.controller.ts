import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * GET /api/users — Admin only: list all users
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /api/users/bdrs — Admin only: list all BDRs (for lead assignment dropdown)
   */
  @Get('bdrs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllBDRs() {
    return this.usersService.findAllBDRs();
  }
}
