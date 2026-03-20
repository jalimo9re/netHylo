import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token;

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token as string);
      const tenantId = payload.tenantId;

      if (!tenantId) {
        // Superadmins don't auto-join a tenant room
        client.data = { userId: payload.sub, role: payload.role };
        this.logger.log(`Superadmin ${payload.sub} connected`);
        return;
      }

      // Join tenant-specific room
      client.join(`tenant:${tenantId}`);
      client.data = {
        userId: payload.sub,
        tenantId,
        role: payload.role,
      };

      this.logger.log(`User ${payload.sub} joined tenant:${tenantId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.userId) {
      this.logger.log(`User ${client.data.userId} disconnected`);
    }
  }

  emitToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }
}
