import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket gateway for real-time call status updates.
 *
 * Each agent connects and joins a personal room: `agent:{userId}`
 * When a call status changes, CallsService pushes events to that room.
 *
 * Events emitted:
 *   - call:status    — Call state changed (ringing, connected, ended, etc.)
 *   - call:recording_ready — Recording URL available for playback
 */
@WebSocketGateway({
  namespace: '/calls',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CallsGateway.name);

  @WebSocketServer()
  server: Server;

  /**
   * When an agent connects, they send their userId via handshake query.
   * We put them in a personal room for targeted event delivery.
   *
   * TODO: In production, validate JWT from handshake auth headers.
   */
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      this.logger.warn('WebSocket connection without userId — disconnecting');
      client.disconnect();
      return;
    }

    client.join(`agent:${userId}`);
    this.logger.log(`Agent connected: ${userId} (socket: ${client.id})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Agent disconnected: ${userId} (socket: ${client.id})`);
  }

  /**
   * Send a call status update to a specific agent.
   */
  sendCallStatus(agentId: string, data: Record<string, any>) {
    this.server.to(`agent:${agentId}`).emit('call:status', data);
  }

  /**
   * Send a generic call event to a specific agent.
   */
  sendCallEvent(agentId: string, event: string, data: Record<string, any>) {
    this.server.to(`agent:${agentId}`).emit(event, data);
  }
}
