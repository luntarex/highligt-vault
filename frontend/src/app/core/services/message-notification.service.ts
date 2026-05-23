import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { MessageRealtimeService } from './message-realtime.service';
import { ToastService } from './toast.service';
import { Conversation } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class MessageNotificationService implements OnDestroy {
  private subscription = new Subscription();
  private started = false;

  constructor(
    private authService: AuthService,
    private realtime: MessageRealtimeService,
    private toast: ToastService
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
        if (event.message.receiverId === currentUserId) {
          this.toast.info(this.notificationText(event.conversation), 4500);
        }
      })
    );
  }

  stop(): void {
    this.subscription.unsubscribe();
    this.subscription = new Subscription();
    this.started = false;
    this.realtime.disconnect();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private notificationText(conversation: Conversation): string {
    const preview = conversation.shared_post_id || conversation.sharedPost
      ? 'sent you a post'
      : this.truncate(conversation.content || 'sent you a message');

    return `${conversation.username}: ${preview}`;
  }

  private truncate(value: string): string {
    return value.length > 72 ? `${value.slice(0, 69)}...` : value;
  }
}
