import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { DispositionsService } from './dispositions.service';
import { CreateDispositionDto } from './dto/create-disposition.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('dispositions')
@UseGuards(JwtAuthGuard)
export class DispositionsController {
  constructor(private dispositionsService: DispositionsService) {}

  /**
   * POST /api/dispositions — Submit a disposition after a call
   */
  @Post()
  async create(
    @CurrentUser('id') agentId: string,
    @Body() dto: CreateDispositionDto,
  ) {
    return this.dispositionsService.create(agentId, dto);
  }
}
