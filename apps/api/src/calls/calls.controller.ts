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
import { Serialize } from '../common/interceptors/serialize.interceptor';
import { CallResponseDto } from '../common/dto/call-response.dto';

@Controller({ path: 'calls', version: '1' })
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Post('initiate')
  @Serialize(CallResponseDto)
  async initiateCall(
    @CurrentUser('id') agentId: string,
    @Body() dto: InitiateCallDto,
  ) {
    return this.callsService.initiateCall(agentId, dto.leadId);
  }

  @Post(':id/end')
  async endCall(
    @CurrentUser('id') agentId: string,
    @Param('id') callId: string,
  ) {
    return this.callsService.endCall(agentId, callId);
  }

  /**
   * Force-cancel any stale active calls for the current agent.
   * Called automatically by the frontend on 409 errors, but can also
   * be called manually if the UI detects a bad state.
   *
   * Safe to call at any time — no-ops if there are no stale calls.
   */
  @Post('clear-stale')
  async clearStaleCalls(@CurrentUser('id') agentId: string) {
    const staleCalls = await this.callsService.cleanupStaleCalls(agentId);

    // Best-effort: tell the telephony provider to hang up each stale call.
    // Errors are swallowed — the provider may have already dropped the call.
    for (const call of staleCalls) {
      if (call.providerCallId) {
        try {
          await this.callsService.endCallByProviderCallId(call.providerCallId);
        } catch {
          // Intentionally ignored — provider-side cleanup is best-effort
        }
      }
    }

    return {
      cleared: staleCalls.length,
      callIds: staleCalls.map((c) => c.id),
    };
  }

  @Get('token')
  async getAccessToken(@CurrentUser('id') agentId: string) {
    const token = this.callsService.generateAccessToken(agentId);
    return { token };
  }

  @Get('lead/:leadId')
  @Serialize(CallResponseDto)
  async getCallHistory(@Param('leadId') leadId: string) {
    return this.callsService.getCallHistory(leadId);
  }
}