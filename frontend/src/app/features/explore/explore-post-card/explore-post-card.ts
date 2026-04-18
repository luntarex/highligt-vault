import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExplorePost } from '../../../core/models/explore-post';
import { AuthService } from '../../../core/services/auth.service';
import { ExploreService } from '../../../core/services/explore.service';

@Component({
  selector: 'app-explore-post-card',
  templateUrl: './explore-post-card.html',
  styleUrls: ['./explore-post-card.css'],
  imports: [RouterLink, NgClass, FormsModule]
})
export class ExplorePostCard {
  @Input() post!: ExplorePost;
  @Input() playingPostId: string | null = null;

  isEditingTitle = false;
  editedTitle = '';
  isFullscreen = false;
  private fsAnimationFrameId: number | null = null;

  constructor(
    public authService: AuthService, 
    private exploreService: ExploreService,
    private cdr: ChangeDetectorRef
  ) {}

  canEdit(): boolean {
    return this.authService.isAdmin() || this.authService.getCurrentUserId() === this.post.author.id;
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

  deletePost() {
    this.deletePostEvent.emit(this.post);
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

  onToggleLike() {
    this.toggleLikeEvent.emit(this.post);
  }

  onToggleFavorite() {
    this.toggleFavoriteEvent.emit(this.post);
  }

  onOpenComments() {
    this.openCommentsEvent.emit(this.post);
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
}
