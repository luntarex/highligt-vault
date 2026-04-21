import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Message, Conversation } from '../../core/models/message.model';
import { BackLink } from '../../shared/back-link/back-link';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ProfileService } from '../../core/services/profile.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackLink, ConfirmDialog],
  templateUrl: './messages.html',
  styleUrls: ['./messages.css']
})
export class MessagesComponent implements OnInit {
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  currentConversation: Message[] = [];
  selectedUserId: number | null = null;
  selectedUsername: string = '';
  selectedUserPhoto: string = '';
  newMessageContent: string = '';
  searchQuery: string = '';
  currentUserId: number;
  isSending: boolean = false;
  loading: boolean = false;

  showDeleteModal: boolean = false;
  selectedConversationToDelete: number | null = null;
  selectedMessageIds: Set<number> = new Set<number>();

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private profileService: ProfileService
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
    forkJoin({
      convs: this.messageService.getConversations(this.currentUserId),
      following: this.profileService.getFollowing(this.currentUserId.toString())
    }).subscribe(({ convs, following }) => {
      let combined: Conversation[] = convs.map(c => ({
        ...c,
        created_at: this.fixDate(c.created_at).toISOString()
      }));

      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const convUserIds = new Set(combined.map(c => c.other_user_id));

      const followedConversations: Conversation[] = following
        .filter(u => !convUserIds.has(u.id))
        .map(u => ({
          other_user_id: u.id,
          username: u.username,
          profile_photo_url: u.profilePhotoUrl,
          content: 'No messages yet',
          created_at: '',
          is_read: true,
          sender_id: this.currentUserId
        } as Conversation));

      followedConversations.sort((a, b) => a.username.localeCompare(b.username));

      this.conversations = [...combined, ...followedConversations];
      this.filteredConversations = this.conversations;
      this.cdr.detectChanges();
    }, error => {
      console.error('Error loading conversations or following list:', error);
    });
  }

  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredConversations = this.conversations;
    } else {
      this.filteredConversations = this.conversations.filter(c =>
        c.username.toLowerCase().includes(query)
      );
    }
    this.cdr.detectChanges();
  }

  selectUser(userId: number): void {
    this.selectedUserId = userId;
    const conversation = this.conversations.find(c => c.other_user_id === userId);

    if (conversation) {
      this.selectedUsername = conversation.username || '';
      this.selectedUserPhoto = conversation.profile_photo_url || '';
    } else {
      this.selectedUsername = 'Loading...';
      this.userService.getUserById(userId).subscribe(user => {
        if (user) {
          this.selectedUsername = user.username;
          this.selectedUserPhoto = user.profilePhotoUrl || 'assets/icons/default-avatar.png';
          this.cdr.detectChanges();
        }
      });
    }

    this.messageService.getConversation(this.currentUserId, userId).subscribe(msgs => {
      this.currentConversation = msgs.map(m => ({
        ...m,
        createdAt: this.fixDate(m.createdAt).toISOString()
      }));
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
    const content = this.newMessageContent.trim();
    if (!content || !this.selectedUserId || this.isSending) return;

    // İyimser Temizlik: Mesaj gitmeden kutuyu boşaltıyoruz ki kullanıcı "gitti" hissetsin
    this.newMessageContent = '';
    this.isSending = true;
    this.cdr.detectChanges();

    this.messageService.sendMessage(this.currentUserId, this.selectedUserId, content)
      .subscribe(
        () => {
          this.isSending = false;
          this.selectUser(this.selectedUserId!);
          this.loadConversations();
          this.cdr.detectChanges();
        },
        () => {
          this.isSending = false;
          // Hata durumunda mesajı kutuya geri koyabiliriz (opsiyonel)
          this.newMessageContent = content;
          this.cdr.detectChanges();
        }
      );
  }

  getOtherParty(conv: Conversation): string {
    return conv.username;
  }

  onDeleteConversation(event: Event, userId: number): void {
    event.stopPropagation();
    this.selectedConversationToDelete = userId;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.selectedConversationToDelete) {
      this.messageService.deleteConversation(this.currentUserId, this.selectedConversationToDelete).subscribe(() => {
        if (this.selectedUserId === this.selectedConversationToDelete) {
          this.selectedUserId = null;
          this.currentConversation = [];
        }
        this.loadConversations();
        this.cancelDelete();
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.selectedConversationToDelete = null;
  }

  toggleMessageSelection(messageId: number): void {
    if (this.selectedMessageIds.has(messageId)) {
      this.selectedMessageIds.delete(messageId);
    } else {
      this.selectedMessageIds.add(messageId);
    }
    this.selectedMessageIds = new Set(this.selectedMessageIds);
    this.cdr.detectChanges();
  }

  confirmMessageDeletion(): void {
    if (this.selectedMessageIds.size > 0) {
      const idsToDelete = Array.from(this.selectedMessageIds);
      this.messageService.deleteMessages(idsToDelete).subscribe(() => {
        this.currentConversation = this.currentConversation.filter(m => !this.selectedMessageIds.has(m.id));
        this.clearSelection();
        this.loadConversations();
        this.cdr.detectChanges();
      });
    }
  }

  clearSelection(): void {
    this.selectedMessageIds = new Set<number>();
    this.cdr.detectChanges();
  }

  private fixDate(val: any): Date {
    if (!val) return new Date();
    
    // Adjust for JVM timezone shift in Spring Boot JDBC
    const jvmOffsetMs = 3 * 60 * 60 * 1000;
    
    if (typeof val === 'number') {
       return new Date(val + jvmOffsetMs);
    }
    
    let s = String(val);
    
    if (/^\d+$/.test(s)) {
       return new Date(Number(s) + jvmOffsetMs);
    }
    
    s = s.replace(' ', 'T');
    
    if (s.endsWith('Z') || s.match(/[+\-]\d{2}:\d{2}$/)) {
       return new Date(new Date(s).getTime() + jvmOffsetMs);
    }
    
    return new Date(s + 'Z');
  }
}
