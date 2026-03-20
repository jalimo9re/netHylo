import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface ConversationPreview {
  id: string;
  contactName: string;
  lastMessage: string;
  time: string;
  provider: string;
  unread: boolean;
}

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './inbox.component.html',
})
export class InboxComponent {
  conversations: ConversationPreview[] = [];
  selectedConversation: ConversationPreview | null = null;

  selectConversation(conv: ConversationPreview) {
    this.selectedConversation = conv;
  }

  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      whatsapp: 'message',
      meta: 'facebook',
      instagram: 'camera_alt',
      tiktok: 'videocam',
      telegram: 'send',
    };
    return icons[provider] || 'chat';
  }
}
