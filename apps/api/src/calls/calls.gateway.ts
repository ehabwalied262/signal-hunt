import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket gateway for real-time call status updates.
 *
 * Each agent connects and joins a personal room: `agent:{userId}`
 * When a call status changes, CallsService pushes events to that room.
 *
 * Events emitted:
 *   - call:status          — Call state changed (ringing, connected, ended, etc.)
 *   - call:recording_ready — Recording URL available for playback
 *
 * Auth: JWT must be passed in handshake.auth.token (not query param —
 * query params are logged by proxies and visible in URLs).
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

  constructor(private jwtService: JwtService) {}

  /**
   * Validate JWT from handshake.auth.token and join the agent's room.
   * Disconnects immediately if the token is missing or invalid.
   */
  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;

      if (!token) {
        this.logger.warn(`WebSocket connection without token — disconnecting ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn(`JWT missing sub claim — disconnecting ${client.id}`);
        client.disconnect();
        return;
      }

      // Attach to socket so disconnect handler can read it without re-verifying
      (client as any).userId = userId;

      client.join(`agent:${userId}`);
      this.logger.log(`Agent connected: ${userId} (socket: ${client.id})`);
    } catch (err) {
      this.logger.warn(`Invalid JWT on WebSocket connect — disconnecting ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId ?? 'unknown';
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