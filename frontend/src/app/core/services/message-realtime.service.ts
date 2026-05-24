import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Conversation, Message } from '../models/message.model';

export interface MessageRealtimeEvent {
  type: 'message';
  message: Message;
  conversation: Conversation;
}

@Injectable({
  providedIn: 'root'
})
export class MessageRealtimeService implements OnDestroy {
  private socket: WebSocket | null = null;
  private reconnectTimerId: ReturnType<typeof setTimeout> | null = null;
  private manuallyStopped = false;
  private connecting = false;
  private readonly recentMessageIds = new Map<number, number>();
  private readonly eventsSubject = new Subject<MessageRealtimeEvent>();

  readonly events$ = this.eventsSubject.asObservable();

  constructor(private http: HttpClient) {}

  connect(): void {
    if (this.connecting || (this.socket && this.socket.readyState <= WebSocket.OPEN)) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token || token === 'dummy') {
      return;
    }

    this.manuallyStopped = false;
    this.connecting = true;
    this.http.post<{ ticket: string }>(`${API_BASE_URL}/messages/ws-ticket`, {}).subscribe({
      next: response => {
        this.connecting = false;
        if (this.manuallyStopped || !response.ticket) {
          return;
        }
        this.openSocket(response.ticket);
      },
      error: () => {
        this.connecting = false;
        this.scheduleReconnect();
      }
    });
  }

  private openSocket(ticket: string): void {
    const url = this.websocketUrl(ticket);
    this.socket = new WebSocket(url);
    this.socket.onopen = () => console.info('[realtime] message socket connected');
    this.socket.onmessage = event => this.handleMessage(event);
    this.socket.onclose = event => {
      console.warn('[realtime] message socket closed', { code: event.code, reason: event.reason });
      this.scheduleReconnect();
    };
    this.socket.onerror = () => {
      console.warn('[realtime] message socket error');
      this.socket?.close();
    };
  }

  disconnect(): void {
    this.manuallyStopped = true;
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const payload = JSON.parse(event.data) as MessageRealtimeEvent;
      if (payload.type === 'message') {
        const message = this.normalizeMessage(payload.message);
        if (this.wasRecentlyEmitted(message.id)) {
          return;
        }

        this.eventsSubject.next({
          type: 'message',
          message,
          conversation: this.normalizeConversation(payload.conversation)
        });
      }
    } catch {
      // Ignore malformed socket payloads instead of breaking the realtime stream.
    }
  }

  private scheduleReconnect(): void {
    this.socket = null;
    if (this.manuallyStopped || this.reconnectTimerId) {
      return;
    }

    this.reconnectTimerId = setTimeout(() => {
      this.reconnectTimerId = null;
      this.connect();
    }, 3000);
  }

  private websocketUrl(ticket: string): string {
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/, '');
    const wsRoot = apiRoot.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    return `${wsRoot}/ws/messages?ticket=${encodeURIComponent(ticket)}`;
  }

  private wasRecentlyEmitted(messageId: number): boolean {
    if (!Number.isFinite(messageId)) {
      return false;
    }

    const now = Date.now();
    const previous = this.recentMessageIds.get(messageId);
    this.recentMessageIds.set(messageId, now);

    for (const [id, timestamp] of this.recentMessageIds) {
      if (now - timestamp > 10000) {
        this.recentMessageIds.delete(id);
      }
    }

    return previous !== undefined && now - previous < 10000;
  }

  private normalizeMessage(message: any): Message {
    return {
      ...message,
      id: Number(message.id),
      senderId: Number(message.senderId ?? message.sender_id),
      receiverId: Number(message.receiverId ?? message.receiver_id),
      content: message.content ?? '',
      isRead: this.toBoolean(message.isRead ?? message.is_read ?? message.read),
      createdAt: String(message.createdAt ?? message.created_at ?? new Date().toISOString()),
      sharedPostId: message.sharedPostId ?? message.shared_post_id,
      sharedPost: message.sharedPost ?? null,
      canDeleteForEveryone: this.toBoolean(message.canDeleteForEveryone ?? message.can_delete_for_everyone)
    };
  }

  private normalizeConversation(conversation: any): Conversation {
    return {
      other_user_id: Number(conversation.other_user_id ?? conversation.otherUserId),
      username: conversation.username || '',
      profile_photo_url: conversation.profile_photo_url ?? conversation.profilePhotoUrl ?? '',
      content: conversation.content || '',
      created_at: String(conversation.created_at ?? conversation.createdAt ?? new Date().toISOString()),
      is_read: this.toBoolean(conversation.is_read ?? conversation.isRead ?? conversation.read),
      sender_id: Number(conversation.sender_id ?? conversation.senderId),
      shared_post_id: conversation.shared_post_id ?? conversation.sharedPostId,
      sharedPost: conversation.sharedPost ?? null
    };
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }
}
