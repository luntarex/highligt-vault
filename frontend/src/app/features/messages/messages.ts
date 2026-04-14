import { Component, OnInit } from '@angular/core';
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
  newMessageContent: string = '';
  currentUserId: number;
  loading: boolean = false;

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private route: ActivatedRoute
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
    });
  }

  selectUser(userId: number): void {
    this.selectedUserId = userId;
    this.loading = true;
    this.messageService.getConversation(this.currentUserId, userId).subscribe(msgs => {
      this.currentConversation = msgs;
      this.loading = false;
      // Mark as read
      this.currentConversation.forEach(m => {
        if (m.receiverId === this.currentUserId && !m.isRead) {
          this.messageService.markAsRead(m.id).subscribe();
        }
      });
    });
  }

  sendMessage(): void {
    if (!this.newMessageContent.trim() || !this.selectedUserId) return;

    this.messageService.sendMessage(this.currentUserId, this.selectedUserId, this.newMessageContent)
      .subscribe(() => {
        this.newMessageContent = '';
        this.selectUser(this.selectedUserId!);
        this.loadConversations();
      });
  }

  getOtherParty(conv: Conversation): string {
    return conv.username;
  }
}
