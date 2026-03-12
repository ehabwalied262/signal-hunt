import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

  /**
   * POST /api/calls/initiate — Start an outbound call
   */
  @Post('initiate')
  async initiateCall(
    @CurrentUser('id') agentId: string,
    @Body() dto: InitiateCallDto,
  ) {
    return this.callsService.initiateCall(agentId, dto.leadId);
  }

  /**
   * POST /api/calls/:id/end — Hang up an active call
   */
  @Post(':id/end')
  async endCall(
    @CurrentUser('id') agentId: string,
    @Param('id') callId: string,
  ) {
    return this.callsService.endCall(agentId, callId);
  }

  /**
   * GET /api/calls/token — Get Twilio access token for browser dialer
   */
  @Get('token')
  async getAccessToken(@CurrentUser('id') agentId: string) {
    const token = this.callsService.generateAccessToken(agentId);
    return { token };
  }

  /**
   * GET /api/calls/lead/:leadId — Get call history for a lead
   */
  @Get('lead/:leadId')
  async getCallHistory(@Param('leadId') leadId: string) {
    return this.callsService.getCallHistory(leadId);
  }
}
