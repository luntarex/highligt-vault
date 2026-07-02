import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ExplorePost } from '../../core/models/explore-post';
import { CommentService } from '../../core/services/comment.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { ReportButtonComponent } from '../report-button/report-button';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-comments-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReportButtonComponent, BottomSheet, TranslocoModule],
  templateUrl: './comments-modal.html',
  styleUrls: ['./comments-modal.css']
})
export class CommentsModalComponent implements OnInit {
  @Input() post!: ExplorePost;
  @Output() closed = new EventEmitter<void>();

  comments: any[] = [];
  newCommentText = '';
  replyingToComment: any | null = null;
  editingCommentId: number | null = null;
  editingCommentText = '';
  showModerateModal = false;
  commentToModerate: any | null = null;
  tosViolationText = '[This comment is deleted by an admin because of a TOS violation]';
  currentUserPhotoUrl = localStorage.getItem('profile_photo_url') || 'assets/icons/profile-pic.svg';
  currentUserId: number | null = null;

  constructor(
    public authService: AuthService,
    private commentService: CommentService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService
  ) {}

  ngOnInit() {
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadComments();
  }

  loadComments() {
    this.userService.getUserById(this.currentUserId!).subscribe((user: any) => {
      if (user && user.profilePhotoUrl) {
        this.currentUserPhotoUrl = user.profilePhotoUrl;
      }
      this.cdr.detectChanges();
    });

    this.commentService.getCommentsByPostId(this.post.id).subscribe({
      next: (data: any[]) => {
        if (!data || !Array.isArray(data)) {
          this.comments = [];
          this.cdr.detectChanges();
          return;
        }

        const raw = (obj: any, key: string) => obj[key] !== undefined ? obj[key] : (obj[key.toUpperCase()] !== undefined ? obj[key.toUpperCase()] : obj[key.toLowerCase()]);

        const allMapped = data.map((c: any) => ({
          id: Number(raw(c, 'id')),
          userId: Number(raw(c, 'userId')),
          username: raw(c, 'username') || 'Unknown',
          profilePhoto: raw(c, 'profilePhoto'),
          text: raw(c, 'content') || '',
          cleanText: raw(c, 'content') || '',
          timeAgo: this.formatTimeAgo(raw(c, 'createdAt') || raw(c, 'created_at')),
          parentCommentId: raw(c, 'parentCommentId') ? Number(raw(c, 'parentCommentId')) : null,
          replyTargetUserId: undefined as number | undefined,
          replyTargetUsername: undefined as string | undefined,
          replies: [] as any[]
        }));

        // Guard against the backend returning the same comment twice (e.g. a
        // reply echoed both nested and flat), which otherwise renders as a
        // duplicate — one proper, one broken at the top.
        const seenIds = new Set<number>();
        const uniqueMapped = allMapped.filter(c => {
          if (seenIds.has(c.id)) return false;
          seenIds.add(c.id);
          return true;
        });

        const parentMap = new Map();
        uniqueMapped.forEach(c => parentMap.set(c.id, c));

        const topLevel: any[] = [];
        uniqueMapped.forEach(c => {
          if (c.parentCommentId) {
            const parent = parentMap.get(c.parentCommentId);
            if (parent) {
              const tag = `@${parent.username} `;
              if (c.text.startsWith(tag)) {
                c.cleanText = c.text.substring(tag.length);
              }
              c.replyTargetUserId = parent.userId;
              c.replyTargetUsername = parent.username;

              let root = parent;
              while (root.parentCommentId && parentMap.has(root.parentCommentId)) {
                root = parentMap.get(root.parentCommentId);
              }
              root.replies.push(c);
            } else {
              topLevel.push(c);
            }
          } else {
            topLevel.push(c);
          }
        });

        topLevel.forEach(c => {
          c.replies = [...new Set(c.replies)];
          c.replies.reverse();
        });

        this.comments = topLevel;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Fetch comments error:', err);
        this.comments = [];
        this.cdr.detectChanges();
      }
    });
  }

  formatTimeAgo(dateString: string | null | undefined): string {
    const justNow = this.transloco.translate('time.justNow');
    if (!dateString) return justNow;

    // Backend sends a zoneless LocalDateTime; treat it as UTC.
    let s = String(dateString).replace(' ', 'T');
    if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) s += 'Z';
    const date = new Date(s);
    if (isNaN(date.getTime())) return justNow;

    const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return justNow;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return this.transloco.translate('time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return this.transloco.translate('time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return this.transloco.translate('time.daysAgo', { count: days });
    const months = Math.floor(days / 30);
    if (months < 12) return this.transloco.translate('time.monthsAgo', { count: months });
    const years = Math.floor(days / 365);
    return this.transloco.translate('time.yearsAgo', { count: years });
  }

  closeComments() {
    this.closed.emit();
  }

  setReplyTo(comment: any) {
    this.replyingToComment = comment;
    this.newCommentText = `@${comment.username} `;

    setTimeout(() => {
      const input = document.querySelector('.comment-input') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }

  cancelReply() {
    if (this.replyingToComment && this.newCommentText === `@${this.replyingToComment.username} `) {
      this.newCommentText = '';
    }
    this.replyingToComment = null;
  }

  postComment() {
    if (!this.newCommentText.trim() || !this.post) return;

    const postId = this.post.id;
    const userId = this.authService.getCurrentUserId();
    const content = this.newCommentText.trim();
    const parentId = this.replyingToComment ? this.replyingToComment.id : undefined;

    this.commentService.addComment(postId, userId, content, parentId).subscribe((res: any) => {
      const username = localStorage.getItem('username') || 'You';
      const currentUserPhoto = this.currentUserPhotoUrl;
      let replyTargetUserId = undefined;
      let replyTargetUsername = undefined;
      let cleanText = content;

      if (this.replyingToComment) {
        replyTargetUserId = this.replyingToComment.userId;
        replyTargetUsername = this.replyingToComment.username;
        const tag = `@${replyTargetUsername} `;
        if (content.startsWith(tag)) {
          cleanText = content.substring(tag.length);
        }
      }

      const newCmnt = {
        id: Number(res.id),
        userId: userId,
        username: username,
        profilePhoto: currentUserPhoto,
        text: content,
        cleanText: cleanText,
        timeAgo: this.transloco.translate('time.justNow'),
        parentCommentId: parentId,
        replyTargetUserId: replyTargetUserId,
        replyTargetUsername: replyTargetUsername,
        replies: []
      };

      if (this.replyingToComment) {
        let parentFound = false;
        this.comments.forEach(rootCmnt => {
          if (rootCmnt.id === parentId || rootCmnt.replies.some((r: any) => r.id === parentId)) {
            rootCmnt.replies.push(newCmnt);
            parentFound = true;
          }
        });
        if (!parentFound) {
            this.comments.unshift(newCmnt);
        }
      } else {
        this.comments.unshift(newCmnt);
      }

      this.newCommentText = '';
      this.replyingToComment = null;
      if (this.post) {
        this.post.comments++;
      }
      this.cdr.detectChanges();
    });
  }

  canEditComment(comment: any): boolean {
    if (this.isTosViolation(comment.text)) {
      return false;
    }
    return this.authService.isAdmin() || this.authService.getCurrentUserId() === comment.userId;
  }

  startEditingComment(comment: any) {
    this.editingCommentId = comment.id;
    this.editingCommentText = comment.text;
  }

  saveComment(comment: any) {
    if (this.editingCommentText.trim()) {
      this.commentService.updateComment(comment.id, this.editingCommentText.trim()).subscribe(() => {
        comment.text = this.editingCommentText.trim();
        comment.cleanText = comment.text;
        if (comment.replyTargetUsername) {
            const tag = `@${comment.replyTargetUsername} `;
            if (comment.text.startsWith(tag)) {
              comment.cleanText = comment.text.substring(tag.length);
            }
        }
        this.editingCommentId = null;
        this.cdr.detectChanges();
      });
    }
  }

  deleteComment(comment: any) {
    const isCommentOwner = this.authService.getCurrentUserId() === comment.userId;
    const isPostOwner = this.post && this.authService.getCurrentUserId() === this.post.author.id;

    if (this.authService.isAdmin() && !isCommentOwner && !isPostOwner) {
       this.commentToModerate = comment;
       this.showModerateModal = true;
       this.cdr.detectChanges();
    } else {
       this.executeDeleteComment(comment);
    }
  }

  private executeDeleteComment(comment: any) {
    const targetId = Number(comment.id);
    this.commentService.removeComment(targetId).subscribe(() => {
      const updatedComments = this.comments.filter(c => Number(c.id) !== targetId);
      updatedComments.forEach(c => {
        if (c.replies) {
           c.replies = c.replies.filter((r: any) => Number(r.id) !== targetId);
        }
      });
      this.comments = updatedComments;
      if (this.post) {
        this.post.comments--;
      }
      this.cdr.detectChanges();
    });
  }

  closeModerateModal(): void {
    this.showModerateModal = false;
    this.commentToModerate = null;
    this.cdr.detectChanges();
  }

  moderateDelete(): void {
    if (!this.commentToModerate) return;
    const targetId = Number(this.commentToModerate.id);
    this.commentService.removeCommentViolation(targetId).subscribe(() => {
        this.executeDeleteComment(this.commentToModerate);
        this.closeModerateModal();
    });
  }

  moderateTosViolation(): void {
    if (!this.commentToModerate) return;
    const targetId = Number(this.commentToModerate.id);
    this.commentService.removeCommentViolation(targetId).subscribe({
      next: () => {
        this.executeDeleteComment(this.commentToModerate);
        this.closeModerateModal();
      },
      error: () => console.error('Failed to moderate comment.')
    });
  }

  isTosViolation(content: string | undefined | null): boolean {
    if (!content) return false;
    return content === this.tosViolationText;
  }
}
