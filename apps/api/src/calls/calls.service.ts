import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CallStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  TelephonyProvider,
  TELEPHONY_PROVIDER,
} from '../telephony/telephony.interface';
import { CallStatusEvent, RecordingEvent } from '../telephony/telephony.models';
import { CallsGateway } from './calls.gateway';

const STALE_THRESHOLD_MINUTES = 5;

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(TELEPHONY_PROVIDER) private telephony: TelephonyProvider,
    private callsGateway: CallsGateway,
  ) {}

  /**
   * Cancel any calls for this agent that have been stuck in an active
   * status for longer than STALE_THRESHOLD_MINUTES. Called automatically
   * before every new call attempt and via the clear-stale endpoint.
   *
   * Returns the stale calls so the caller can attempt provider-side cleanup.
   */
  async cleanupStaleCalls(agentId: string) {
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);

    const staleCalls = await this.prisma.call.findMany({
      where: {
        agentId,
        status: { in: [CallStatus.INITIATING, CallStatus.RINGING, CallStatus.IN_PROGRESS] },
        startedAt: { lt: cutoff },
      },
      select: { id: true, providerCallId: true },
    });

    if (staleCalls.length === 0) return staleCalls;

    await this.prisma.call.updateMany({
      where: { id: { in: staleCalls.map((c) => c.id) } },
      data: { status: CallStatus.CANCELED, endedAt: new Date() },
    });

    this.logger.warn(
      `Cleaned up ${staleCalls.length} stale call(s) for agent ${agentId}: [${staleCalls.map((c) => c.id).join(', ')}]`,
    );

    return staleCalls;
  }

  /**
   * Initiate an outbound call.
   *
   * Enforces:
   *  1. Stale call cleanup (auto-cancels calls stuck > STALE_THRESHOLD_MINUTES)
   *  2. Agent is not already on a call (concurrency lock)
   *  3. Lead exists and belongs to agent
   *  4. Lead is not marked as wrong number
   *  5. Agent has an assigned phone number
   */
  async initiateCall(agentId: string, leadId: string) {
    // 1. Auto-cancel any stale calls before checking concurrency
    await this.cleanupStaleCalls(agentId);

    // 2. Concurrency lock — agent can only be on one call
    const activeCall = await this.prisma.call.findFirst({
      where: {
        agentId,
        status: {
          in: [CallStatus.INITIATING, CallStatus.RINGING, CallStatus.IN_PROGRESS],
        },
      },
    });

    if (activeCall) {
      throw new ConflictException('You already have an active call');
    }

    // 3. Validate lead
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.ownerId !== agentId) {
      throw new BadRequestException('This lead is not assigned to you');
    }

    if (lead.isWrongNumber) {
      throw new BadRequestException('This lead is marked as a wrong number');
    }

    // 4. Get agent's assigned phone number
    const phoneNumber = await this.prisma.phoneNumber.findUnique({
      where: { assignedUserId: agentId },
    });

    if (!phoneNumber) {
      throw new BadRequestException(
        'No phone number assigned to your account. Contact admin.',
      );
    }

    // 5. Create call record
    const call = await this.prisma.call.create({
      data: {
        leadId,
        agentId,
        phoneNumberId: phoneNumber.id,
        status: CallStatus.INITIATING,
        startedAt: new Date(),
      },
    });

    // 6. Initiate call via telephony provider
    const webhookBaseUrl = this.configService.get<string>('WEBHOOK_BASE_URL');

    try {
      const result = await this.telephony.makeCall({
        to: lead.phoneNumber,
        from: phoneNumber.number,
        webhookUrl: `${webhookBaseUrl}/api/webhooks/twilio/voice`,
      });

      // 7. Update call with provider ID
      const updatedCall = await this.prisma.call.update({
        where: { id: call.id },
        data: {
          providerCallId: result.providerCallId,
          status: CallStatus.RINGING,
        },
        include: { lead: true },
      });

      // 8. Notify agent via WebSocket
      this.callsGateway.sendCallStatus(agentId, {
        callId: updatedCall.id,
        status: CallStatus.RINGING,
        leadId: lead.id,
        startedAt: updatedCall.startedAt?.toISOString(),
      });

      this.logger.log(
        `Call ${call.id} initiated by agent ${agentId} → ${lead.phoneNumber}`,
      );

      return updatedCall;
    } catch (error) {
      // If telephony fails, mark call as failed
      await this.prisma.call.update({
        where: { id: call.id },
        data: { status: CallStatus.FAILED, errorCode: 'INITIATION_FAILED' },
      });

      this.callsGateway.sendCallStatus(agentId, {
        callId: call.id,
        status: CallStatus.FAILED,
        leadId: lead.id,
        errorMessage: 'Failed to initiate call',
      });

      throw error;
    }
  }

  /**
   * End an active call.
   */
  async endCall(agentId: string, callId: string) {
    const call = await this.prisma.call.findFirst({
      where: {
        id: callId,
        agentId,
        status: {
          in: [CallStatus.RINGING, CallStatus.IN_PROGRESS],
        },
      },
    });

    if (!call) {
      throw new NotFoundException('No active call found');
    }

    if (call.providerCallId) {
      await this.telephony.endCall(call.providerCallId);
    }

    // Status will be updated via webhook callback
    return { message: 'Call end request sent' };
  }

  /**
   * Tell the telephony provider to hang up a call by its provider ID.
   * Used by the clear-stale endpoint — errors bubble up so the caller
   * can decide whether to swallow them.
   */
  async endCallByProviderCallId(providerCallId: string): Promise<void> {
    await this.telephony.endCall(providerCallId);
  }

  /**
   * Handle call status update from telephony provider webhook.
   * This is the ONLY place where call status transitions happen.
   */
  async handleStatusUpdate(event: CallStatusEvent) {
    const call = await this.prisma.call.findFirst({
      where: { providerCallId: event.providerCallId },
    });

    if (!call) {
      this.logger.warn(
        `Status update for unknown call: ${event.providerCallId}`,
      );
      return;
    }

    // Idempotency check — don't process if already in this status
    if (call.status === event.status) {
      return;
    }

    // Build update data based on new status
    const updateData: any = {
      status: event.status,
    };

    if (event.status === CallStatus.IN_PROGRESS && !call.answeredAt) {
      updateData.answeredAt = event.timestamp;
    }

    if (
      event.status === CallStatus.COMPLETED ||
      event.status === CallStatus.NO_ANSWER ||
      event.status === CallStatus.BUSY ||
      event.status === CallStatus.FAILED
    ) {
      updateData.endedAt = event.timestamp;

      if (event.duration) {
        updateData.durationSeconds = event.duration;

        // Calculate talk time (only if call was answered)
        if (call.answeredAt) {
          const talkTime = Math.floor(
            (event.timestamp.getTime() - call.answeredAt.getTime()) / 1000,
          );
          updateData.talkTimeSeconds = Math.max(0, talkTime);
        }
      }

      if (event.errorCode) {
        updateData.errorCode = event.errorCode;
      }
    }

    const updatedCall = await this.prisma.call.update({
      where: { id: call.id },
      data: updateData,
    });

    // Update lead status on first call
    if (event.status === CallStatus.COMPLETED || event.status === CallStatus.IN_PROGRESS) {
      await this.prisma.lead.update({
        where: { id: call.leadId },
        data: { status: 'CONTACTED' },
      });
    }

    // Push status to agent via WebSocket
    this.callsGateway.sendCallStatus(call.agentId, {
      callId: call.id,
      status: event.status,
      leadId: call.leadId,
      duration: event.duration,
      startedAt: call.startedAt?.toISOString(),
      answeredAt: updatedCall.answeredAt?.toISOString(),
      endedAt: updatedCall.endedAt?.toISOString(),
    });

    this.logger.log(
      `Call ${call.id} status updated: ${call.status} → ${event.status}`,
    );
  }

  /**
   * Handle recording completion from webhook.
   */
  async handleRecordingComplete(event: RecordingEvent) {
    const call = await this.prisma.call.findFirst({
      where: { providerCallId: event.providerCallId },
    });

    if (!call) {
      this.logger.warn(
        `Recording for unknown call: ${event.providerCallId}`,
      );
      return;
    }

    await this.prisma.call.update({
      where: { id: call.id },
      data: {
        recordingUrl: event.recordingUrl,
        recordingSid: event.recordingSid,
      },
    });

    // Notify agent that recording is available
    this.callsGateway.sendCallEvent(call.agentId, 'call:recording_ready', {
      callId: call.id,
      recordingUrl: this.telephony.getRecordingUrl(event.recordingSid),
    });

    this.logger.log(`Recording saved for call ${call.id}`);
  }

  /**
   * Get call history for a lead.
   */
  async getCallHistory(leadId: string) {
    return this.prisma.call.findMany({
      where: { leadId },
      include: {
        disposition: true,
        transcription: {
          select: {
            id: true,
            status: true,
            completedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generate Twilio access token for browser-based calling.
   */
  generateAccessToken(agentId: string): string {
    return this.telephony.generateAccessToken(agentId);
  }
}