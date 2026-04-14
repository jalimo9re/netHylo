import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  externalId: string;
}

export interface Conversation {
  id: string;
  status: string;
  lastMessageAt: string;
  contact: Contact;
  integration: { id: string; provider: string; name: string };
  assignedUser: { id: string; firstName: string; lastName: string } | null;
}

export interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  type: string;
  status: string;
  senderUser: { id: string; firstName: string; lastName: string } | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ConversationsService {
  private url = `${environment.apiUrl}/conversations`;

  constructor(private http: HttpClient) {}

  findAll() {
    return this.http.get<Conversation[]>(this.url);
  }

  findOne(id: string) {
    return this.http.get<Conversation>(`${this.url}/${id}`);
  }

  getMessages(conversationId: string) {
    return this.http.get<Message[]>(`${this.url}/${conversationId}/messages`);
  }

  sendMessage(
    conversationId: string,
    content: string,
    type = 'text',
    metadata: Record<string, any> = {},
  ) {
    return this.http.post<Message>(`${this.url}/${conversationId}/messages`, {
      content,
      type,
      metadata,
    });
  }

  update(id: string, data: Partial<Conversation>) {
    return this.http.patch<Conversation>(`${this.url}/${id}`, data);
  }

  getMessageMedia(conversationId: string, messageId: string): Observable<Blob> {
    return this.http.get(`${this.url}/${conversationId}/messages/${messageId}/media`, {
      responseType: 'blob',
    });
  }
}
