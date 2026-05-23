import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ProfileService } from '../../core/services/profile.service';
import { Message, Conversation } from '../../core/models/message.model';
import { BackLink } from '../../shared/back-link/back-link';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackLink, ConfirmDialog],
  templateUrl: './messages.html',
  styleUrls: ['./messages.css']
})
export class MessagesComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  followingUsers: any[] = [];
  filteredFollowing: any[] = [];
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
  private refreshTimerId: ReturnType<typeof setInterval> | null = null;

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
    this.refreshTimerId = setInterval(() => {
      if (this.selectedUserId && this.selectedMessageIds.size === 0) {
        this.refreshSelectedConversation(true);
      } else {
        this.loadConversations();
      }
    }, 8000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
    }
  }

  loadConversations(): void {
    this.messageService.getConversations(this.currentUserId).subscribe(convs => {
      this.conversations = convs.map((c: any) => {
        const createdAt = c.created_at ?? c.createdAt;
        return {
          other_user_id: Number(c.other_user_id ?? c.otherUserId),
          username: c.username || '',
          profile_photo_url: c.profile_photo_url ?? c.profilePhotoUrl ?? '',
          content: c.content || '',
          created_at: this.fixDate(createdAt).toISOString(),
          is_read: Boolean(c.is_read ?? c.isRead),
          sender_id: Number(c.sender_id ?? c.senderId),
          shared_post_id: c.shared_post_id ?? c.sharedPostId,
          sharedPost: c.sharedPost ?? null
        };
      });
      this.filteredConversations = this.conversations;
      this.loadFollowing();
      this.cdr.detectChanges();
    });
  }

  loadFollowing(): void {
    this.profileService.getFollowing(this.currentUserId.toString()).subscribe(users => {
      const convUserIds = new Set(this.conversations.map(c => c.other_user_id));
      this.followingUsers = users.filter((u: any) => !convUserIds.has(u.id));
      this.filteredFollowing = this.followingUsers;
      this.cdr.detectChanges();
    });
  }

  onSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredConversations = this.conversations;
      this.filteredFollowing = this.followingUsers;
    } else {
      this.filteredConversations = this.conversations.filter(c =>
        c.username.toLowerCase().includes(query)
      );
      this.filteredFollowing = this.followingUsers.filter((u: any) =>
        u.username.toLowerCase().includes(query)
      );
    }
    this.cdr.detectChanges();
  }

  selectUser(userId: number): void {
    this.selectedUserId = userId;
    this.selectedMessageIds.clear();
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

    this.refreshSelectedConversation(false);
  }

  refreshSelectedConversation(silent: boolean = false): void {
    if (!this.selectedUserId) return;

    this.messageService.getConversation(this.currentUserId, this.selectedUserId).subscribe(msgs => {
      this.currentConversation = msgs.map(m => ({
        ...m,
        senderId: Number((m as any).senderId ?? (m as any).sender_id),
        receiverId: Number((m as any).receiverId ?? (m as any).receiver_id),
        isRead: this.toBoolean((m as any).isRead ?? (m as any).is_read ?? (m as any).read),
        sharedPostId: (m as any).sharedPostId ?? (m as any).shared_post_id,
        sharedPost: (m as any).sharedPost ?? null,
        createdAt: this.fixDate(m.createdAt).toISOString()
      })).sort((a, b) => this.compareMessages(a, b));
      this.loading = false;
      this.markReceivedMessagesAsRead();
      if (!silent) {
        this.cdr.detectChanges();
      } else {
        this.cdr.detectChanges();
      }
    });
  }

  markReceivedMessagesAsRead(): void {
    const unreadReceived = this.currentConversation.filter(m =>
      m.receiverId === this.currentUserId && !m.isRead
    );

    if (unreadReceived.length === 0) return;

    unreadReceived.forEach(m => {
      this.messageService.markAsRead(m.id).subscribe({
        next: () => {
          m.isRead = true;
          this.loadConversations();
          this.cdr.detectChanges();
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

  postLink(postId: string | number): any[] {
    return ['/post', postId];
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

  private compareMessages(a: Message, b: Message): number {
    const idDiff = Number(a.id) - Number(b.id);
    if (Number.isFinite(idDiff) && idDiff !== 0) return idDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }
}
