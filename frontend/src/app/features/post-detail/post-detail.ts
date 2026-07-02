import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExplorePost } from '../../core/models/explore-post';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { ExploreService } from '../../core/services/explore.service';
import { ClipService } from '../../core/services/clip.service';
import { ToastService } from '../../core/services/toast.service';
import { ReportButtonComponent } from '../../shared/report-button/report-button';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { extractId, buildSlugId } from '../../core/utils/slug.util';
import { VideoPlayerComponent } from '../../shared/video-player/video-player';
import { SharePanelComponent } from '../../shared/share-panel/share-panel';
import { BottomSheet } from '../../shared/bottom-sheet/bottom-sheet';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReportButtonComponent, TranslocoModule, VideoPlayerComponent, SharePanelComponent, BottomSheet],
  templateUrl: './post-detail.html',
  styleUrls: ['./post-detail.css']
})
export class PostDetail implements OnInit, OnChanges, OnDestroy {
  @Input() postId: string | number | null = null;
  @Input() embedded = false;
  protected readonly buildSlugId = buildSlugId;
  @Output() closed = new EventEmitter<void>();

  post: ExplorePost | null = null;
  comments: any[] = [];
  newCommentText = '';
  replyingToComment: any | null = null;
  currentUserPhoto = '';
  isLoading = true;
  commentsLoading = false;
  isSharePanelOpen = false;
  isMobile = false;
  editingCommentId: number | null = null;
  editingCommentText = '';
  private viewRecorded = false;
  private viewTimer: number | null = null;

  // Video playback is handled by AppVideoPlayer

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private exploreService: ExploreService,
    private clipService: ClipService,
    private commentService: CommentService,
    public authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService
  ) {}

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
  }

  ngOnInit(): void {
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
    this.currentUserPhoto = localStorage.getItem('profile_photo_url') || '';
    if (this.postId) {
      this.loadPost(String(this.postId));
      return;
    }

    this.route.paramMap.subscribe(params => {
      const postId = extractId(params.get('id'));
      if (!postId) {
        this.router.navigate(['/explore']);
        return;
      }
      this.loadPost(String(postId));
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postId'] && !changes['postId'].firstChange && this.postId) {
      this.loadPost(String(this.postId));
    }
  }

  ngOnDestroy(): void {
    this.onVideoPause();
  }

  loadPost(postId: string): void {
    this.isLoading = true;
    this.viewRecorded = false;
    this.onVideoPause();
    this.exploreService.getPostById(postId).subscribe({
      next: post => {
        this.post = {
          ...post,
          currentTime: post.startTime || 0,
          duration: post.duration || 0
        };
        this.isLoading = false;
        this.loadComments(post.id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.post = null;
        this.isLoading = false;
        this.toast.error('This post is unavailable or no longer public.');
        this.cdr.detectChanges();
      }
    });
  }

  closePost(): void {
    if (this.embedded) {
      this.closed.emit();
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/explore']);
  }

  loadComments(postId: string): void {
    this.commentsLoading = true;
    this.commentService.getCommentsByPostId(postId).subscribe({
      next: (comments: any[]) => {
        this.comments = this.buildCommentTree(comments || []);
        if (this.post) {
          this.post.comments = this.countComments(this.comments);
        }
        this.commentsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.comments = [];
        this.commentsLoading = false;
        this.toast.error('Could not load comments.');
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Flatten the backend's comment list into a two-level tree: top-level
   * comments, each with a flat `replies` array (replies to replies are
   * hoisted under their root). Deduplicates by id so a comment can never
   * render both at top level and nested.
   */
  private buildCommentTree(data: any[]): any[] {
    const mapped = data.map(c => ({
      ...c,
      cleanText: c.cleanText || c.content || '',
      timeAgo: c.timeAgo || this.formatCommentTime(c.createdAt),
      parentCommentId: c.parentCommentId ? Number(c.parentCommentId) : null,
      replyTargetUsername: undefined as string | undefined,
      replies: [] as any[]
    }));

    const byId = new Map<number, any>();
    mapped.forEach(c => byId.set(Number(c.id), c));

    const topLevel: any[] = [];
    const placed = new Set<number>();

    mapped.forEach(c => {
      if (placed.has(Number(c.id))) return;
      placed.add(Number(c.id));

      const parent = c.parentCommentId ? byId.get(c.parentCommentId) : null;
      if (!parent) {
        topLevel.push(c);
        return;
      }

      // Walk up to the root so every reply sits under a top-level comment.
      let root = parent;
      while (root.parentCommentId && byId.has(root.parentCommentId)) {
        root = byId.get(root.parentCommentId);
      }
      const tag = `@${parent.username} `;
      if (typeof c.content === 'string' && c.content.startsWith(tag)) {
        c.cleanText = c.content.substring(tag.length);
      }
      c.replyTargetUsername = parent.username;
      root.replies.push(c);
    });

    return topLevel;
  }

  private countComments(tree: any[]): number {
    return tree.reduce((total, c) => total + 1 + (c.replies?.length || 0), 0);
  }

  togglePostLike(): void {
    if (!this.post) return;

    const userId = this.authService.getCurrentUserId();
    if (this.post.isLiked) {
      this.post.isLiked = false;
      this.post.likes--;
      this.exploreService.unlikePost(this.post.id, userId).subscribe({
        error: () => {
          if (!this.post) return;
          this.post.isLiked = true;
          this.post.likes++;
          this.toast.error('Could not update like.');
        }
      });
      return;
    }

    this.post.isLiked = true;
    this.post.likes++;
    this.exploreService.likePost(this.post.id, userId).subscribe({
      error: () => {
        if (!this.post) return;
        this.post.isLiked = false;
        this.post.likes--;
        this.toast.error('Could not update like.');
      }
    });
  }

  toggleFavorite(): void {
    if (!this.post || !this.post.clipId) return;

    const userId = this.authService.getCurrentUserId();
    const clipId = String(this.post.clipId);
    const wasFav = !!this.post.isFavorited;
    this.post.isFavorited = !wasFav;

    const req = wasFav
      ? this.exploreService.unfavoriteClip(clipId, userId)
      : this.exploreService.favoriteClip(clipId, userId);
    req.subscribe({
      error: () => {
        if (this.post) this.post.isFavorited = wasFav;
        this.toast.error('Could not update favorite.');
        this.cdr.detectChanges();
      }
    });
  }

  toggleShare(event: Event): void {
    event.stopPropagation();
    this.isSharePanelOpen = !this.isSharePanelOpen;
  }

  startEditingComment(comment: any): void {
    this.editingCommentId = comment.id;
    this.editingCommentText = comment.content || comment.cleanText || '';
  }

  cancelEditingComment(): void {
    this.editingCommentId = null;
    this.editingCommentText = '';
  }

  saveComment(comment: any): void {
    const text = this.editingCommentText.trim();
    if (!text) return;

    this.commentService.updateComment(comment.id, text).subscribe({
      next: () => {
        comment.content = text;
        comment.cleanText = text;
        // Keep the reply badge separate from the visible text.
        if (comment.replyTargetUsername) {
          const tag = `@${comment.replyTargetUsername} `;
          if (text.startsWith(tag)) comment.cleanText = text.substring(tag.length);
        }
        this.editingCommentId = null;
        this.editingCommentText = '';
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('Could not update comment.')
    });
  }

  postComment(): void {
    if (!this.post || !this.newCommentText.trim()) return;

    const content = this.newCommentText.trim();
    const parent = this.replyingToComment;
    const parentCommentId = parent?.id;
    const userId = this.authService.getCurrentUserId();

    // Strip the "@username " prefix so it isn't shown twice next to the badge.
    let cleanText = content;
    if (parent) {
      const prefix = `@${parent.username}`;
      if (cleanText.startsWith(prefix)) cleanText = cleanText.slice(prefix.length).trim();
    }

    // Show the comment instantly, then persist it in the background.
    const optimistic: any = {
      id: -Date.now(),
      postId: this.post.id,
      parentCommentId,
      userId,
      content,
      cleanText,
      timeAgo: this.transloco.translate('time.justNow'),
      username: localStorage.getItem('username') || '',
      profilePhoto: this.currentUserPhoto,
      replyTargetUsername: parent?.username,
      replies: []
    };

    // Replies nest under their root comment; top-level comments go to the top.
    const root = parent ? this.findRootComment(parent.id) : null;
    if (root) {
      root.replies = [...root.replies, optimistic];
    } else {
      this.comments = [optimistic, ...this.comments];
    }
    this.post.comments = this.countComments(this.comments);
    this.newCommentText = '';
    this.replyingToComment = null;

    this.commentService.addComment(this.post.id, userId, content, parentCommentId).subscribe({
      next: (saved: any) => {
        // Reconcile the temporary row with the server's real id/timeAgo.
        if (saved && saved.id != null) {
          const target = this.findCommentById(optimistic.id);
          if (target) {
            target.id = saved.id;
            target.timeAgo = saved.timeAgo ?? target.timeAgo;
            this.comments = [...this.comments];
            this.cdr.detectChanges();
          }
        }
      },
      error: () => {
        // Roll back the optimistic row and restore the draft.
        this.removeCommentFromTree(optimistic.id);
        if (this.post) this.post.comments = this.countComments(this.comments);
        this.newCommentText = content;
        this.replyingToComment = parent;
        this.toast.error('Could not post comment.');
        this.cdr.detectChanges();
      }
    });
  }

  private findRootComment(id: number): any | null {
    for (const c of this.comments) {
      if (c.id === id) return c;
      if (c.replies?.some((r: any) => r.id === id)) return c;
    }
    return null;
  }

  private findCommentById(id: number): any | null {
    for (const c of this.comments) {
      if (c.id === id) return c;
      const reply = c.replies?.find((r: any) => r.id === id);
      if (reply) return reply;
    }
    return null;
  }

  private removeCommentFromTree(id: number): void {
    this.comments = this.comments
      .filter(c => c.id !== id)
      .map(c => ({ ...c, replies: (c.replies || []).filter((r: any) => r.id !== id) }));
  }

  setReplyTo(comment: any): void {
    this.replyingToComment = comment;
    this.newCommentText = `@${comment.username} `;
  }

  cancelReply(): void {
    this.replyingToComment = null;
    this.newCommentText = '';
  }

  deleteComment(comment: any): void {
    if (!this.post) return;
    this.commentService.removeComment(comment.id).subscribe({
      next: () => {
        this.removeCommentFromTree(comment.id);
        if (this.post) this.post.comments = this.countComments(this.comments);
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('Could not delete comment.')
    });
  }

  canEditComment(comment: any): boolean {
    return comment.userId === this.authService.getCurrentUserId() || this.authService.isAdmin();
  }

  isTextPost(): boolean {
    return !this.post?.videoUrl || this.post.postType === 'TEXT' || !this.post.clipId;
  }

  isImagePost(): boolean {
    const url = this.post?.videoUrl || '';
    if (!url) return false;

    if (this.isKnownImageUrl(url)) return true;
    if (this.isKnownVideoUrl(url)) return false;

    return this.post?.postType === 'CLIP' && Number(this.post?.duration || 0) === 0;
  }

  isVideoPost(): boolean {
    return Boolean(this.post?.videoUrl) && !this.isImagePost();
  }

  communityLabel(): string {
    return this.post?.communityName || this.transloco.translate('communities.community');
  }

  hasCommunityLink(): boolean {
    return Boolean(this.post?.communityId);
  }

  openLinkedPostDetail(postId: string | number, event?: Event, title?: string | null): void {
    event?.stopPropagation();
    if (this.embedded) {
      this.loadPost(String(postId));
      return;
    }

    this.router.navigate(['/post', buildSlugId(title, postId)]);
  }

  isImageMedia(post: ExplorePost | null | undefined): boolean {
    const url = post?.videoUrl || '';
    if (!url) return false;

    if (this.isKnownImageUrl(url)) return true;
    if (this.isKnownVideoUrl(url)) return false;

    return post?.postType === 'CLIP' && Number(post?.duration || 0) === 0;
  }

  originalCommunityLabel(post: ExplorePost | null | undefined): string {
    return post?.communityName || this.transloco.translate('communities.community');
  }

  onVideoPlay(): void {
    if (this.viewRecorded || !this.post?.clipId || this.viewTimer !== null) return;
    const clipId = Number(this.post.clipId);
    // Count the view only after 2 seconds of continuous playback.
    this.viewTimer = window.setTimeout(() => {
      this.viewTimer = null;
      this.viewRecorded = true;
      this.clipService.recordView(clipId).subscribe({
        next: res => {
          if (this.post) {
            this.post.views = res.viewCount;
            this.cdr.detectChanges();
          }
        },
        error: () => { this.viewRecorded = false; }
      });
    }, 2000);
  }

  onVideoPause(): void {
    if (this.viewTimer !== null) {
      clearTimeout(this.viewTimer);
      this.viewTimer = null;
    }
  }

  /** Translated relative time for comments (backend sends a zoneless createdAt). */
  formatCommentTime(dateInput: string | undefined): string {
    const justNow = this.transloco.translate('time.justNow');
    if (!dateInput) return justNow;

    let s = String(dateInput).replace(' ', 'T');
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
    return this.transloco.translate('time.yearsAgo', { count: Math.floor(days / 365) });
  }

  formatTimeAgo(dateInput: Date | string | undefined): string {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }

  private isKnownImageUrl(url: string): boolean {
    return /\/image\/upload\//i.test(url) || /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(url);
  }

  private isKnownVideoUrl(url: string): boolean {
    return /\/video\/upload\//i.test(url) || /\.(m3u8|mov|mp4|mpeg|mpg|ogg|ogv|webm)(?:$|[?#])/i.test(url);
  }
}
