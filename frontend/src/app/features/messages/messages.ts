import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { Message, Conversation } from '../../core/models/message.model';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './messages.html',
  styleUrls: ['./messages.css']
})
export class MessagesComponent implements OnInit {
  conversations: Conversation[] = [];
  currentConversation: Message[] = [];
  selectedUserId: number | null = null;
  selectedUsername: string = '';
  selectedUserPhoto: string = '';
  newMessageContent: string = '';
  currentUserId: number;
  isSending: boolean = false;

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUserId = this.authService.getCurrentUserId();
  }

  ngOnInit(): void {
    this.loadConversations();
    this.route.params.subscribe(params => {
      if (params['userId']) {
        this.selectUser(Number(params['userId']));
      }
    });
  }

  loadConversations(): void {
    this.messageService.getConversations(this.currentUserId).subscribe(convs => {
      this.conversations = convs;
      this.cdr.detectChanges();
    });
  }

  selectUser(userId: number): void {
    this.selectedUserId = userId;
    const conversation = this.conversations.find(c => c.other_user_id === userId);
    this.selectedUsername = conversation?.username || '';
    this.selectedUserPhoto = conversation?.profile_photo_url || '';
    // Mesajları yükle (eski mesajları koruyarak)
    this.messageService.getConversation(this.currentUserId, userId).subscribe(msgs => {
      this.currentConversation = msgs;
      this.loading = false;
      this.cdr.detectChanges();
      // Mark as read
      this.currentConversation.forEach(m => {
        if (m.receiverId === this.currentUserId && !m.isRead) {
          this.messageService.markAsRead(m.id).subscribe();
        }
      });
    });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.selectedUserId || this.isSending) return;

    this.isSending = true;
    this.messageService.sendMessage(this.currentUserId, this.selectedUserId, this.newMessageContent)
      .subscribe(
        () => {
          this.newMessageContent = '';
          this.isSending = false;
          this.selectUser(this.selectedUserId!);
          this.loadConversations();
        },
        () => {
          this.isSending = false;
        }
      );
  }

  getOtherParty(conv: Conversation): string {
    return conv.username;
  }
}
