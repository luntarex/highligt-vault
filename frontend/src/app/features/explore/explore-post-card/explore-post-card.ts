import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExplorePost } from '../../../core/models/explore-post';
import { AuthService } from '../../../core/services/auth.service';
import { ExploreService } from '../../../core/services/explore.service';
import { ClipService } from '../../../core/services/clip.service';
import { ProfileService } from '../../../core/services/profile.service';
import { MessageService } from '../../../core/services/message.service';
import { ToastService } from '../../../core/services/toast.service';
import { ReportTargetType } from '../../../core/services/report.service';
import { ReportButtonComponent } from '../../../shared/report-button/report-button';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-explore-post-card',
  templateUrl: './explore-post-card.html',
  styleUrls: ['./explore-post-card.css'],
  imports: [RouterLink, NgClass, FormsModule, ReportButtonComponent, TranslocoModule]
})
export class ExplorePostCard {
  @Input() post!: ExplorePost;
  @Input() playingPostId: string | null = null;
  @Input() showActions = true;
  @Input() showHeader = true;
  @Input() showFullscreen = true;
  @Input() canManagePost = false;
  @Input() showRepost = false;

  isEditingTitle = false;
  editedTitle = '';
  private viewRecorded = false;
  private viewTimer: number | null = null;
  isFullscreen = false;
  isSharePanelOpen = false;
  shareUsers: any[] = [];
  shareMessage = '';
  isLoadingShareUsers = false;
  sendingToUserId: number | null = null;
  private fsAnimationFrameId: number | null = null;

  constructor(
    public authService: AuthService,
    private exploreService: ExploreService,
    private clipService: ClipService,
    private profileService: ProfileService,
    private messageService: MessageService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService
  ) {}

  canEdit(): boolean {
    return this.canManagePost
      || this.authService.isAdmin()
      || this.authService.getCurrentUserId() === this.post.author.id;
  }

  startEditingTitle() {
    if (this.canEdit() && !this.isEditingTitle) {
      this.isEditingTitle = true;
      this.editedTitle = this.post.title;
    }
  }

  saveTitle() {
    if (this.isEditingTitle && this.editedTitle.trim() !== '') {
      this.post.title = this.editedTitle.trim();
      this.exploreService.updatePost(this.post);
    }
    this.isEditingTitle = false;
  }

  cancelEditingTitle() {
    this.isEditingTitle = false;
  }

  @Output() togglePlayEvent = new EventEmitter<{ post: ExplorePost; video: HTMLVideoElement }>();
  @Output() toggleLikeEvent = new EventEmitter<ExplorePost>();
  @Output() toggleFavoriteEvent = new EventEmitter<ExplorePost>();
  @Output() openCommentsEvent = new EventEmitter<ExplorePost>();
  @Output() deletePostEvent = new EventEmitter<ExplorePost>();
  @Output() repostPostEvent = new EventEmitter<{ post: ExplorePost; event: MouseEvent }>();
  @Output() toggleMuteEvent = new EventEmitter<{ event: MouseEvent; video: HTMLVideoElement }>();
  @Output() seekToEvent = new EventEmitter<{ event: MouseEvent; post: ExplorePost; video: HTMLVideoElement }>();
  @Output() timeUpdateEvent = new EventEmitter<{ post: ExplorePost; video: HTMLVideoElement }>();
  @Output() metadataLoadedEvent = new EventEmitter<{ post: ExplorePost; video: HTMLVideoElement }>();

  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('fullscreenVideo') fullscreenVideoRef!: ElementRef<HTMLVideoElement>;

  @HostListener('window:keydown.escape', ['$event'])
  handleEscape(event: any) {
    if (this.isFullscreen) {
      this.toggleFullscreen();
    }
  }

  ngOnDestroy(): void {
    this.stopFsProgressLoop();
    this.onVideoPause();
  }

  private startFsProgressLoop(video: HTMLVideoElement) {
    this.stopFsProgressLoop();
    const update = () => {
      this.post.currentTime = video.currentTime;

      const start = this.post.startTime || 0;
      let end = this.post.endTime;
      if (end === undefined || end === null || end === 0) {
        end = video.duration && !isNaN(video.duration) ? video.duration : Number.MAX_VALUE;
      }

      if ((end - start) > 0.1 && video.currentTime >= end) {
        video.currentTime = start;
        video.play().catch(e => console.error("Replay error", e));
      }

      this.fsAnimationFrameId = requestAnimationFrame(update);
    };
    this.fsAnimationFrameId = requestAnimationFrame(update);
  }

  private stopFsProgressLoop() {
    if (this.fsAnimationFrameId !== null) {
      cancelAnimationFrame(this.fsAnimationFrameId);
      this.fsAnimationFrameId = null;
    }
  }

  toggleFullscreen(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }

    if (!this.isFullscreen) {
      // Entering fullscreen
      const currentTime = this.videoElement?.currentTime || 0;
      const isPlaying = !this.videoElement?.paused;

      // Pause original video to prevent double sound
      this.videoElement?.pause();

      this.isFullscreen = true;

      // We need to wait for the next tick for ViewChild to be available
      setTimeout(() => {
        if (this.fullscreenVideoRef) {
          const fsVideo = this.fullscreenVideoRef.nativeElement;
          fsVideo.currentTime = currentTime;
          if (isPlaying) {
            fsVideo.play().then(() => {
              this.startFsProgressLoop(fsVideo);
            }).catch(err => console.error('Error playing fsVideo:', err));
          } else {
            // Even if paused, update once
            this.post.currentTime = currentTime;
          }
        }
      }, 50);
    } else {
      // Exiting fullscreen
      this.stopFsProgressLoop();
      if (this.fullscreenVideoRef && this.videoElement) {
        const fsVideo = this.fullscreenVideoRef.nativeElement;

        // Transfer state back
        this.videoElement.currentTime = fsVideo.currentTime;

        if (!fsVideo.paused) {
          // Pause fullscreen video before it's destroyed
          fsVideo.pause();
          this.videoElement.play().catch(err => console.error('Error playing videoElement:', err));
        } else {
          this.videoElement.pause();
        }
      }
      this.isFullscreen = false;
    }
  }

  onVolumeChange(event: Event, video: HTMLVideoElement) {
    const input = event.target as HTMLInputElement;
    video.volume = parseFloat(input.value);
    video.muted = video.volume === 0;
  }

  get videoElement(): HTMLVideoElement | null {
    return this.videoPlayerRef?.nativeElement ?? null;
  }

  isImagePost(): boolean {
    const url = this.post?.videoUrl || '';
    if (!url) return false;

    if (this.isKnownImageUrl(url)) return true;
    if (this.isKnownVideoUrl(url)) return false;

    return this.post.postType === 'CLIP' && Number(this.post.duration || 0) === 0;
  }

  deletePost() {
    this.deletePostEvent.emit(this.post);
  }

  repostPost(event: MouseEvent) {
    event.stopPropagation();
    this.repostPostEvent.emit({ post: this.post, event });
  }

  onTogglePlay(video: HTMLVideoElement) {
    this.togglePlayEvent.emit({ post: this.post, video });

    // Manage local progress loop for fullscreen video
    if (this.isFullscreen) {
      // We use a small delay to allow the video.paused state to update
      setTimeout(() => {
        if (!video.paused) {
          this.startFsProgressLoop(video);
        } else {
          this.stopFsProgressLoop();
        }
      }, 0);
    }
  }

  onVideoPlay() {
    if (this.viewRecorded || !this.post.clipId || this.viewTimer !== null) return;
    // Count the view only after 2 seconds of continuous playback.
    this.viewTimer = window.setTimeout(() => {
      this.viewTimer = null;
      this.viewRecorded = true;
      this.clipService.recordView(Number(this.post.clipId)).subscribe({
        next: res => {
          this.post.views = res.viewCount;
          this.cdr.detectChanges();
        },
        error: () => { this.viewRecorded = false; }
      });
    }, 2000);
  }

  onVideoPause() {
    if (this.viewTimer !== null) {
      clearTimeout(this.viewTimer);
      this.viewTimer = null;
    }
  }

  onToggleLike() {
    this.toggleLikeEvent.emit(this.post);
  }

  onToggleFavorite() {
    this.toggleFavoriteEvent.emit(this.post);
  }

  onOpenComments() {
    this.openCommentsEvent.emit(this.post);
  }

  reportTargetType(): ReportTargetType {
    return this.post.clipId ? 'CLIP' : 'POST';
  }

  reportTargetId(): number {
    return Number(this.post.clipId || this.post.id);
  }

  reportTargetLabel(): string {
    return this.transloco.translate(this.post.clipId ? 'postCard.clipTarget' : 'postCard.postTarget');
  }

  toggleSharePanel(event: MouseEvent) {
    event.stopPropagation();
    this.isSharePanelOpen = !this.isSharePanelOpen;
    if (this.isSharePanelOpen && this.shareUsers.length === 0) {
      this.loadShareUsers();
    }
  }

  shareExternal(event: MouseEvent) {
    event.stopPropagation();
    this.copyPostLink(event);
  }

  openShareTarget(event: MouseEvent, target: 'whatsapp' | 'x' | 'facebook' | 'email') {
    event.stopPropagation();
    const url = encodeURIComponent(this.postShareUrl());
    const text = encodeURIComponent(`Check out "${this.post.title || 'this clip'}" from ${this.post.author.username}`);
    let shareUrl = '';

    switch (target) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${url}`;
        break;
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent('Vibe Vault clip')}&body=${text}%0A%0A${url}`;
        break;
    }

    if (shareUrl.startsWith('mailto:')) {
      window.location.href = shareUrl;
      return;
    }

    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=760,height=620');
  }

  async copyPostLink(event: MouseEvent) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(this.postShareUrl());
      this.toast.success('Post link copied.');
    } catch {
      this.toast.error('Could not copy post link.');
    }
  }

  sendPostToUser(event: MouseEvent, user: any) {
    event.stopPropagation();
    this.sendingToUserId = Number(user.id);
    const message = this.shareMessage.trim() || 'Shared a post';
    this.messageService.sendPost(user.id, this.post.id, message).subscribe({
      next: () => {
        this.toast.success(`Sent to ${user.username}.`);
        this.resetSharePanelAfterSend();
      },
      error: (err) => {
        console.error('Send message error:', err);
        this.toast.error('Could not send post.');
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

  isSendingTo(user: any): boolean {
    return this.sendingToUserId !== null && this.sendingToUserId === Number(user.id);
  }

  private loadShareUsers() {
    const currentUserId = this.authService.getCurrentUserId();
    this.isLoadingShareUsers = true;
    this.profileService.getFollowing(currentUserId.toString()).subscribe({
      next: users => {
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

  private postShareUrl(): string {
    return `${window.location.origin}/post/${this.post.id}`;
  }

  get shareUrl(): string {
    return this.postShareUrl();
  }

  private resetSharePanelAfterSend() {
    this.sendingToUserId = null;
    this.shareMessage = '';
    this.isSharePanelOpen = false;
    this.cdr.detectChanges();
  }

  onToggleMute(event: MouseEvent, video: HTMLVideoElement) {
    this.toggleMuteEvent.emit({ event, video });
  }

  onSeekTo(event: MouseEvent, video: HTMLVideoElement) {
    this.seekToEvent.emit({ event, post: this.post, video });
  }

  onTimeUpdate(video: HTMLVideoElement) {
    this.timeUpdateEvent.emit({ post: this.post, video });
  }

  onMetadataLoaded(video: HTMLVideoElement) {
    this.metadataLoadedEvent.emit({ post: this.post, video });
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  private isKnownImageUrl(url: string): boolean {
    return /\/image\/upload\//i.test(url) || /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(url);
  }

  private isKnownVideoUrl(url: string): boolean {
    return /\/video\/upload\//i.test(url) || /\.(m3u8|mov|mp4|mpeg|mpg|ogg|ogv|webm)(?:$|[?#])/i.test(url);
  }
}
