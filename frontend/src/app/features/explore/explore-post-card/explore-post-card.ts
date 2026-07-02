import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExplorePost } from '../../../core/models/explore-post';
import { AuthService } from '../../../core/services/auth.service';
import { ExploreService } from '../../../core/services/explore.service';
import { ClipService } from '../../../core/services/clip.service';
import { ReportTargetType } from '../../../core/services/report.service';
import { ReportButtonComponent } from '../../../shared/report-button/report-button';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { buildSlugId } from '../../../core/utils/slug.util';
import { VideoPlayerComponent } from '../../../shared/video-player/video-player';
import { SharePanelComponent } from '../../../shared/share-panel/share-panel';

@Component({
  selector: 'app-explore-post-card',
  templateUrl: './explore-post-card.html',
  styleUrls: ['./explore-post-card.css'],
  imports: [RouterLink, NgClass, FormsModule, ReportButtonComponent, TranslocoModule, VideoPlayerComponent, SharePanelComponent]
})
export class ExplorePostCard {
  protected readonly buildSlugId = buildSlugId;
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
  private fsAnimationFrameId: number | null = null;

  constructor(
    public authService: AuthService,
    private exploreService: ExploreService,
    private clipService: ClipService,
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

  @ViewChild(VideoPlayerComponent) videoPlayerComponent!: VideoPlayerComponent;

  @HostListener('window:keydown.escape', ['$event'])
  handleEscape(event: any) {
    // Esc is handled by the video player now
  }

  ngOnDestroy(): void {
    this.onVideoPause();
  }

  get videoElement(): HTMLVideoElement | null {
    return this.videoPlayerComponent?.videoElement ?? null;
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
