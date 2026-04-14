import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  ConversationsService,
  Conversation,
  Message,
} from '../../core/services/conversations.service';
import {
  RealtimeService,
  NewMessageEvent,
  MessageStatusEvent,
} from '../../core/services/realtime.service';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './inbox.component.html',
  host: {
    class: 'flex-1 flex flex-col min-h-0',
  },
})
export class InboxComponent implements OnInit, OnDestroy {
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  allConversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage = '';
  loading = true;
  sendingMessage = false;
  mobileView = signal<'list' | 'chat'>('list');
  statusFilter = signal<'open' | 'closed'>('open');
  selectedImageDataUrl = '';
  selectedImageName = '';
  selectedImageMimeType = '';
  private mediaUrls: Record<string, string> = {};
  mediaLoading: Record<string, boolean> = {};
  mediaFailed: Record<string, boolean> = {};
  private readonly onNewMessageHandler = (event: NewMessageEvent) =>
    this.handleRealtimeNewMessage(event);
  private readonly onMessageStatusHandler = (event: MessageStatusEvent) =>
    this.handleRealtimeMessageStatus(event);

  filteredConversations = computed(() => {
    const filter = this.statusFilter();
    return this.allConversations.filter((c) => c.status === filter);
  });

  constructor(
    private conversationsService: ConversationsService,
    private realtimeService: RealtimeService,
  ) {}

  ngOnInit() {
    this.loadConversations();
    this.realtimeService.connectMessaging();
    this.realtimeService.onNewMessage(this.onNewMessageHandler);
    this.realtimeService.onMessageStatus(this.onMessageStatusHandler);
  }

  ngOnDestroy() {
    this.realtimeService.offNewMessage(this.onNewMessageHandler);
    this.realtimeService.offMessageStatus(this.onMessageStatusHandler);
    this.realtimeService.disconnectMessaging();
    this.clearMediaUrls();
  }

  loadConversations(silent = false) {
    if (!silent) this.loading = true;
    this.conversationsService.findAll().subscribe({
      next: (data) => {
        this.allConversations = data;
        this.loading = false;
        if (this.selectedConversation) {
          const updated = data.find((c) => c.id === this.selectedConversation!.id);
          if (updated) this.selectedConversation = updated;
        }
      },
      error: () => (this.loading = false),
    });
  }

  setFilter(filter: 'open' | 'closed') {
    this.statusFilter.set(filter);
  }

  get openCount(): number {
    return this.allConversations.filter((c) => c.status === 'open').length;
  }

  get closedCount(): number {
    return this.allConversations.filter((c) => c.status === 'closed').length;
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    this.mobileView.set('chat');
    this.loadMessages(conv.id);
  }

  loadMessages(conversationId: string) {
    this.conversationsService.getMessages(conversationId).subscribe((msgs) => {
      this.clearMediaUrls();
      this.messages = msgs;
      this.preloadMedia();
      this.scrollToBottom();
    });
  }

  sendMessage() {
    if (!this.selectedConversation || this.sendingMessage) return;

    const isImageMessage = !!this.selectedImageDataUrl;
    const textContent = this.newMessage.trim();
    if (!isImageMessage && !textContent) return;

    this.sendingMessage = true;
    const content = isImageMessage ? '' : textContent;
    const type = isImageMessage ? 'image' : 'text';
    const metadata = isImageMessage
      ? {
          dataUrl: this.selectedImageDataUrl,
          fileName: this.selectedImageName || 'image.jpg',
          mimeType: this.selectedImageMimeType || 'image/jpeg',
          caption: textContent || undefined,
        }
      : {};

    this.newMessage = '';
    this.clearImageSelection();

    this.conversationsService
      .sendMessage(this.selectedConversation.id, content, type, metadata)
      .subscribe({
        next: () => {
          this.loadMessages(this.selectedConversation!.id);
          this.sendingMessage = false;
        },
        error: () => {
          this.sendingMessage = false;
        },
      });
  }

  toggleConversationStatus() {
    if (!this.selectedConversation) return;
    const newStatus = this.selectedConversation.status === 'open' ? 'closed' : 'open';
    this.conversationsService
      .update(this.selectedConversation.id, { status: newStatus })
      .subscribe(() => {
        this.loadConversations(true);
        if (newStatus === 'closed') {
          this.selectedConversation = null;
          this.messages = [];
          this.mobileView.set('list');
        }
      });
  }

  backToList() {
    this.selectedConversation = null;
    this.messages = [];
    this.clearMediaUrls();
    this.mobileView.set('list');
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

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  private handleRealtimeNewMessage(event: NewMessageEvent) {
    // Keep conversation list in sync (ordering, status, lastMessageAt).
    this.loadConversations(true);

    if (!this.selectedConversation || this.selectedConversation.id !== event.conversationId) {
      return;
    }

    const exists = this.messages.some((m) => m.id === event.message.id);
    if (exists) return;

    this.messages = [
      ...this.messages,
      {
        id: event.message.id,
        direction: event.message.direction,
        content: event.message.content,
        type: event.message.type,
        status: event.message.status,
        metadata: event.message.metadata || {},
        senderUser: event.message.senderUser || null,
        createdAt: event.message.createdAt,
      },
    ];
    this.preloadMedia();
    this.scrollToBottom();
  }

  private handleRealtimeMessageStatus(event: MessageStatusEvent) {
    if (!this.selectedConversation || this.selectedConversation.id !== event.conversationId) {
      return;
    }

    this.messages = this.messages.map((msg) =>
      msg.id === event.messageId ? { ...msg, status: event.status } : msg,
    );
  }

  triggerImagePicker() {
    this.imageInput?.nativeElement.click();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.clearImageSelection();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImageDataUrl = String(reader.result || '');
      this.selectedImageName = file.name;
      this.selectedImageMimeType = file.type;
    };
    reader.readAsDataURL(file);
  }

  clearImageSelection() {
    this.selectedImageDataUrl = '';
    this.selectedImageName = '';
    this.selectedImageMimeType = '';
    if (this.imageInput?.nativeElement) {
      this.imageInput.nativeElement.value = '';
    }
  }

  getMediaUrl(msg: Message): string {
    const loaded = this.mediaUrls[msg.id];
    if (loaded) return loaded;
    if (msg.content?.startsWith('http') || msg.content?.startsWith('data:')) {
      return msg.content;
    }
    return '';
  }

  isMediaType(msg: Message): boolean {
    return ['image', 'video', 'audio', 'file'].includes(msg.type);
  }

  private preloadMedia() {
    if (!this.selectedConversation) return;
    const conversationId = this.selectedConversation.id;
    const mediaTypes = ['image', 'video', 'audio', 'file'];
    for (const msg of this.messages) {
      if (!mediaTypes.includes(msg.type)) continue;
      if (this.mediaUrls[msg.id] || this.mediaLoading[msg.id]) continue;
      if (msg.content?.startsWith('http') || msg.content?.startsWith('data:')) continue;

      this.mediaLoading[msg.id] = true;
      this.mediaFailed[msg.id] = false;
      this.conversationsService.getMessageMedia(conversationId, msg.id).subscribe({
        next: (blob) => {
          this.mediaUrls[msg.id] = URL.createObjectURL(blob);
          this.mediaLoading[msg.id] = false;
        },
        error: () => {
          this.mediaLoading[msg.id] = false;
          this.mediaFailed[msg.id] = true;
        },
      });
    }
  }

  retryMediaLoad(msg: Message) {
    if (!this.selectedConversation) return;
    delete this.mediaFailed[msg.id];
    delete this.mediaLoading[msg.id];
    delete this.mediaUrls[msg.id];
    this.preloadMedia();
  }

  private clearMediaUrls() {
    for (const url of Object.values(this.mediaUrls)) {
      URL.revokeObjectURL(url);
    }
    this.mediaUrls = {};
    this.mediaLoading = {};
    this.mediaFailed = {};
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
