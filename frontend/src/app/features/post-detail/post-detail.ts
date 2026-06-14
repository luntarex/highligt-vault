import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Comment } from '../../core/models/comment';
import { ExplorePost } from '../../core/models/explore-post';
import { AuthService } from '../../core/services/auth.service';
import { CommentService } from '../../core/services/comment.service';
import { ExploreService } from '../../core/services/explore.service';
import { ClipService } from '../../core/services/clip.service';
import { ToastService } from '../../core/services/toast.service';
import { ReportButtonComponent } from '../../shared/report-button/report-button';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { extractId, buildSlugId } from '../../core/utils/slug.util';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReportButtonComponent, TranslocoModule],
  templateUrl: './post-detail.html',
  styleUrls: ['./post-detail.css']
})
export class PostDetail implements OnInit, OnChanges, OnDestroy {
  @Input() postId: string | number | null = null;
  @Input() embedded = false;
  protected readonly buildSlugId = buildSlugId;
  @Output() closed = new EventEmitter<void>();

  post: ExplorePost | null = null;
  comments: Comment[] = [];
  newCommentText = '';
  replyingToComment: Comment | null = null;
  currentUserPhoto = '';
  isLoading = true;
  commentsLoading = false;
  private viewRecorded = false;
  private viewTimer: number | null = null;

  @ViewChild('videoPlayer') videoRef?: ElementRef<HTMLVideoElement>;

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

  ngOnInit(): void {
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
    this.videoRef?.nativeElement.pause();
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
      next: comments => {
        this.comments = comments || [];
        if (this.post) {
          this.post.comments = this.comments.length;
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

  postComment(): void {
    if (!this.post || !this.newCommentText.trim()) return;

    const content = this.newCommentText.trim();
    const parentCommentId = this.replyingToComment?.id;
    this.commentService.addComment(
      this.post.id,
      this.authService.getCurrentUserId(),
      content,
      parentCommentId
    ).subscribe({
      next: () => {
        this.newCommentText = '';
        this.replyingToComment = null;
        this.loadComments(this.post!.id);
      },
      error: () => this.toast.error('Could not post comment.')
    });
  }

  setReplyTo(comment: Comment): void {
    this.replyingToComment = comment;
    this.newCommentText = `@${comment.username} `;
  }

  cancelReply(): void {
    this.replyingToComment = null;
    this.newCommentText = '';
  }

  deleteComment(comment: Comment): void {
    if (!this.post) return;
    this.commentService.removeComment(comment.id).subscribe({
      next: () => this.loadComments(this.post!.id),
      error: () => this.toast.error('Could not delete comment.')
    });
  }

  canEditComment(comment: Comment): boolean {
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

  onTogglePlay(event?: Event): void {
    event?.stopPropagation();
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
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

  onToggleMute(event: Event): void {
    event.stopPropagation();
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    video.muted = !video.muted;
  }

  onVolumeChange(event: Event): void {
    event.stopPropagation();
    const video = this.videoRef?.nativeElement;
    const input = event.target as HTMLInputElement;
    if (!video) return;

    video.volume = Number(input.value);
    video.muted = video.volume === 0;
  }

  onSeekTo(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.videoRef || !this.post) return;

    const video = this.videoRef.nativeElement;
    const progressContainer = event.currentTarget as HTMLElement;
    const rect = progressContainer.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const start = this.post.startTime || 0;
    const end = this.post.endTime || this.post.duration || video.duration || 1;
    const newTime = start + clickRatio * (end - start);

    video.currentTime = newTime;
    this.post.currentTime = newTime;
  }

  onMetadataLoaded(): void {
    if (!this.videoRef || !this.post) return;

    const video = this.videoRef.nativeElement;
    video.currentTime = this.post.startTime || 0;
    this.post.duration = video.duration;
    video.play().catch(() => {});
  }

  onTimeUpdate(): void {
    if (!this.videoRef || !this.post) return;

    const video = this.videoRef.nativeElement;
    this.post.currentTime = video.currentTime;
    const start = this.post.startTime || 0;
    let end = this.post.endTime;
    if (end === undefined || end === null || end === 0) {
      end = video.duration && !isNaN(video.duration) ? video.duration : Number.MAX_VALUE;
    }

    if ((end - start) > 0.1 && video.currentTime >= end) {
      video.currentTime = start;
      video.play().catch(() => {});
    }
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
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
