import { Controller, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { DispositionsService } from './dispositions.service';
import { CreateDispositionDto } from './dto/create-disposition.dto';
import { UpdateDispositionDto } from './dto/update-disposition.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/interceptors/serialize.interceptor';
import { DispositionResponseDto } from '../common/dto/disposition-response.dto';

@Controller({path: 'dispositions', version: '1'})
@UseGuards(JwtAuthGuard)
export class DispositionsController {
  constructor(private dispositionsService: DispositionsService) {}

  @Post()
  @Serialize(DispositionResponseDto)
  async create(
    @CurrentUser('id') agentId: string,
    @Body() dto: CreateDispositionDto,
  ) {
    return this.dispositionsService.create(agentId, dto);
  }

  @Patch(':id')
  @Serialize(DispositionResponseDto)
  async update(
    @Param('id') dispositionId: string,
    @CurrentUser('id') agentId: string,
    @Body() dto: UpdateDispositionDto,
  ) {
    return this.dispositionsService.update(dispositionId, agentId, dto);
  }
}
