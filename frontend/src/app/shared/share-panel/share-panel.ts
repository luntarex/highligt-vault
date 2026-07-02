import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExplorePost } from '../../core/models/explore-post';
import { MessageService } from '../../core/services/message.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslocoModule } from '@jsverse/transloco';
import { buildSlugId } from '../../core/utils/slug.util';

@Component({
  selector: 'app-share-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './share-panel.html',
  styleUrls: ['./share-panel.css']
})
export class SharePanelComponent implements OnInit {
  @Input() post!: ExplorePost;
  @Output() closed = new EventEmitter<void>();

  /** When embedded in a container (e.g. a bottom sheet) drop the popover chrome. */
  @Input() @HostBinding('class.embedded') embedded = false;

  shareUrl = '';
  shareUsers: any[] = [];
  shareMessage = '';
  isLoadingShareUsers = false;
  sendingToUserId: number | null = null;
  selectedShareUserId: number | null = null;

  constructor(
    private messageService: MessageService,
    private profileService: ProfileService,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.shareUrl = `${window.location.origin}/post/${buildSlugId(this.post.title, this.post.id)}`;
    this.loadShareUsers();
  }

  loadShareUsers() {
    this.isLoadingShareUsers = true;
    const currentUserId = this.authService.getCurrentUserId();
    this.profileService.getFollowing(currentUserId.toString()).subscribe({
      next: (users: any[]) => {
        this.shareUsers = users || [];
        this.isLoadingShareUsers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingShareUsers = false;
        this.toast.error('Could not load people to share with.');
        this.cdr.detectChanges();
      }
    });
  }

  isSendingTo(user: any): boolean {
    return this.sendingToUserId !== null && this.sendingToUserId === Number(user.id);
  }

  selectShareUser(user: any) {
    const id = Number(user.id);
    this.selectedShareUserId = this.selectedShareUserId === id ? null : id;
    this.shareMessage = '';
  }

  isShareUserSelected(user: any): boolean {
    return this.selectedShareUserId === Number(user.id);
  }

  sendPostToUser(event: Event, user: any) {
    event.stopPropagation();
    if (!this.post) return;
    this.sendingToUserId = Number(user.id);
    const extraMessage = this.shareMessage.trim();
    const currentUserId = this.authService.getCurrentUserId();

    // Always send the post with the default content.
    this.messageService.sendPost(user.id, this.post.id, 'Shared a post').subscribe({
      next: () => {
        // If the user typed an additional message, send it as a separate text message.
        if (extraMessage) {
          this.messageService.sendMessage(currentUserId, Number(user.id), extraMessage).subscribe({
            next: () => {
              this.toast.success(`Sent to ${user.username}.`);
              this.resetSharePanelAfterSend();
            },
            error: () => {
              // Post was sent but the extra message failed – still consider it a partial success.
              this.toast.success(`Sent to ${user.username}.`);
              this.resetSharePanelAfterSend();
            }
          });
        } else {
          this.toast.success(`Sent to ${user.username}.`);
          this.resetSharePanelAfterSend();
        }
      },
      error: (err: any) => {
        console.error('Send message error:', err);
        this.toast.error('Failed to send post.');
        this.sendingToUserId = null;
        this.cdr.detectChanges();
      },
      complete: () => {
        if (this.sendingToUserId === Number(user.id)) {
          this.sendingToUserId = null;
          this.cdr.detectChanges();
        }
      }
    });
  }

  private resetSharePanelAfterSend() {
    this.sendingToUserId = null;
    this.shareMessage = '';
    this.selectedShareUserId = null;
    this.closePanel(new MouseEvent('click'));
  }

  copyPostLink(event: MouseEvent) {
    event.stopPropagation();
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.toast.success('Link copied to clipboard!');
      this.closePanel(event);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      this.toast.error('Failed to copy link');
    });
  }

  openShareTarget(event: MouseEvent, target: string) {
    event.stopPropagation();
    let url = '';
    const text = encodeURIComponent('Check out this post on Highlight!');
    const encodedUrl = encodeURIComponent(this.shareUrl);

    switch (target) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`;
        break;
      case 'x':
        url = `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'email':
        url = `mailto:?subject=${text}&body=${encodedUrl}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
    this.closePanel(event);
  }

  closePanel(event: MouseEvent) {
    event.stopPropagation();
    this.closed.emit();
  }
}
