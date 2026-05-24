import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';
import { MessageRealtimeService } from './message-realtime.service';
import { MessageAlertService } from './message-alert.service';
import { Conversation } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class MessageNotificationService implements OnDestroy {
  private readonly pollIntervalMs = 5000;
  private subscription = new Subscription();
  private knownLatestByUser = new Map<number, string>();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private hasBaseline = false;
  private inFlight = false;
  private lastAlertSignature = '';
  private lastAlertAt = 0;

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private realtime: MessageRealtimeService,
    private alerts: MessageAlertService
  ) {}

  start(): void {
    this.realtime.connect();
    if (this.started) {
      return;
    }

    this.started = true;
    this.subscription.add(
      this.realtime.events$.subscribe(event => {
        const currentUserId = this.authService.getCurrentUserId();
        this.rememberConversation(event.conversation);

        if (event.message.receiverId === currentUserId) {
          this.showMessageAlert(event.conversation);
        }
      })
    );

    this.poll();
    this.timerId = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop(): void {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
    this.started = false;
    this.hasBaseline = false;
    this.knownLatestByUser.clear();

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.realtime.disconnect();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private poll(): void {
    if (this.inFlight) return;

    const currentUserId = this.authService.getCurrentUserId();
    if (!this.authService.isLoggedIn() || !currentUserId) {
      this.hasBaseline = false;
      this.knownLatestByUser.clear();
      return;
    }

    this.inFlight = true;
    this.messageService.getConversations(currentUserId).subscribe({
      next: conversations => {
        this.handlePolledConversations(conversations, currentUserId);
        this.inFlight = false;
      },
      error: () => {
        this.inFlight = false;
      }
    });
  }

  private handlePolledConversations(conversations: Conversation[], currentUserId: number): void {
    conversations
      .map(conversation => this.normalizeConversation(conversation))
      .forEach(conversation => {
        const signature = this.conversationSignature(conversation);
        const previousSignature = this.knownLatestByUser.get(conversation.other_user_id);

        if (this.hasBaseline
          && previousSignature !== signature
          && conversation.sender_id !== currentUserId) {
          this.showMessageAlert(conversation);
        }

        this.knownLatestByUser.set(conversation.other_user_id, signature);
      });

    this.hasBaseline = true;
  }

  private rememberConversation(conversation: Conversation): void {
    const normalized = this.normalizeConversation(conversation);
    this.knownLatestByUser.set(normalized.other_user_id, this.conversationSignature(normalized));
    this.hasBaseline = true;
  }

  private normalizeConversation(conversation: any): Conversation {
    return {
      other_user_id: Number(conversation.other_user_id ?? conversation.otherUserId),
      username: conversation.username || 'Someone',
      profile_photo_url: conversation.profile_photo_url ?? conversation.profilePhotoUrl ?? '',
      content: conversation.content || '',
      created_at: String(conversation.created_at ?? conversation.createdAt ?? ''),
      is_read: this.toBoolean(conversation.is_read ?? conversation.isRead ?? conversation.read),
      sender_id: Number(conversation.sender_id ?? conversation.senderId),
      shared_post_id: conversation.shared_post_id ?? conversation.sharedPostId,
      sharedPost: conversation.sharedPost ?? null
    };
  }

  private conversationSignature(conversation: Conversation): string {
    return [
      conversation.sender_id,
      conversation.created_at,
      conversation.content,
      conversation.shared_post_id ?? ''
    ].join('|');
  }

  private showMessageAlert(conversation: Conversation): void {
    const signature = this.alertSignature(conversation);
    const now = Date.now();
    if (this.lastAlertSignature === signature && now - this.lastAlertAt < 4000) {
      return;
    }

    this.lastAlertSignature = signature;
    this.lastAlertAt = now;

    this.alerts.show({
      username: conversation.username,
      profilePhotoUrl: conversation.profile_photo_url,
      message: this.notificationText(conversation),
      duration: 5000
    });
  }

  private notificationText(conversation: Conversation): string {
    const preview = conversation.shared_post_id || conversation.sharedPost
      ? 'sent you a post'
      : this.truncate(conversation.content || 'sent you a message');

    return preview;
  }

  private alertSignature(conversation: Conversation): string {
    return [
      conversation.other_user_id,
      conversation.sender_id,
      conversation.content,
      conversation.shared_post_id ?? ''
    ].join('|');
  }

  private truncate(value: string): string {
    return value.length > 72 ? `${value.slice(0, 69)}...` : value;
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }
}
