import { Injectable } from '@angular/core';
import { Socket, io } from 'socket.io-client';
import { AuthService } from './auth.service';

interface RealtimeMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  type: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, any>;
  senderUser?: { id: string; firstName: string; lastName: string } | null;
  senderUserId?: string;
}

export interface NewMessageEvent {
  conversationId: string;
  message: RealtimeMessage;
}

export interface MessageStatusEvent {
  messageId: string;
  conversationId: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private socket: Socket | null = null;

  constructor(private authService: AuthService) {}

  connectMessaging() {
    if (this.socket?.connected) return;

    const token = this.authService.getToken();
    if (!token) return;

    this.socket = io('/messaging', {
      auth: { token },
      withCredentials: true,
    });
  }

  disconnectMessaging() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  onNewMessage(handler: (event: NewMessageEvent) => void) {
    this.socket?.on('new_message', handler);
  }

  onMessageStatus(handler: (event: MessageStatusEvent) => void) {
    this.socket?.on('message_status', handler);
  }

  offNewMessage(handler: (event: NewMessageEvent) => void) {
    this.socket?.off('new_message', handler);
  }

  offMessageStatus(handler: (event: MessageStatusEvent) => void) {
    this.socket?.off('message_status', handler);
  }
}
