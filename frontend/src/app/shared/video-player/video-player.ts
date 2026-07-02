import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.html',
  styleUrls: ['./video-player.css'],
  imports: [CommonModule]
})
export class VideoPlayerComponent implements OnDestroy {
  @Input() src!: string;
  @Input() poster?: string;
  @Input() showFullscreenBtn = true;
  @Input() muted = true;
  
  // For clip trimming support
  @Input() startTime = 0;
  @Input() endTime = 0; 
  
  // Optional metadata to display in fullscreen
  @Input() authorUsername?: string;
  @Input() postTitle?: string;

  @Output() playEvent = new EventEmitter<HTMLVideoElement>();
  @Output() pauseEvent = new EventEmitter<HTMLVideoElement>();
  @Output() timeUpdateEvent = new EventEmitter<HTMLVideoElement>();
  @Output() metadataLoadedEvent = new EventEmitter<HTMLVideoElement>();
  
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('fullscreenVideo') fullscreenVideoRef!: ElementRef<HTMLVideoElement>;

  isFullscreen = false;
  hudVisible = false;
  currentTime = 0;
  duration = 0;
  
  private animationFrameId: number | null = null;
  private fsAnimationFrameId: number | null = null;
  private hudHideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  get videoElement(): HTMLVideoElement | null {
    return this.videoRef?.nativeElement ?? null;
  }

  @HostListener('window:keydown.escape')
  handleEscape() {
    if (this.isFullscreen) {
      this.toggleFullscreen();
    }
  }

  ngOnDestroy() {
    this.stopProgressLoop();
    this.stopFsProgressLoop();
    this.clearHudTimer();
  }

  onTogglePlay(video: HTMLVideoElement) {
    if (video.paused) {
      video.play().catch(() => {});
      if (this.isFullscreen) {
        this.startFsProgressLoop(video);
      } else {
        this.startProgressLoop(video);
      }
    } else {
      video.pause();
      if (this.isFullscreen) {
        this.stopFsProgressLoop();
      } else {
        this.stopProgressLoop();
      }
    }
    
    if (video === this.videoElement) {
       this.playEvent.emit(video); // Notify parent (e.g. for observer syncing)
    }
  }

  onVideoPlay() {
    if (this.videoElement && !this.videoElement.paused) {
      this.startProgressLoop(this.videoElement);
      this.playEvent.emit(this.videoElement);
    }
  }

  onVideoPause() {
    this.stopProgressLoop();
    if (this.videoElement) {
       this.pauseEvent.emit(this.videoElement);
    }
  }

  onToggleMute(event: MouseEvent, video: HTMLVideoElement) {
    event.stopPropagation();
    video.muted = !video.muted;
    // Sync the other video instance if it exists
    if (this.isFullscreen && this.videoElement && video === this.fullscreenVideoRef?.nativeElement) {
      this.videoElement.muted = video.muted;
    } else if (!this.isFullscreen && this.fullscreenVideoRef?.nativeElement && video === this.videoElement) {
      this.fullscreenVideoRef.nativeElement.muted = video.muted;
    }
  }

  onVolumeChange(event: Event, video: HTMLVideoElement) {
    const input = event.target as HTMLInputElement;
    video.volume = parseFloat(input.value);
    video.muted = video.volume === 0;
    
    // Sync the other video instance if it exists
    if (this.isFullscreen && this.videoElement && video === this.fullscreenVideoRef?.nativeElement) {
      this.videoElement.volume = video.volume;
      this.videoElement.muted = video.muted;
    } else if (!this.isFullscreen && this.fullscreenVideoRef?.nativeElement && video === this.videoElement) {
      this.fullscreenVideoRef.nativeElement.volume = video.volume;
      this.fullscreenVideoRef.nativeElement.muted = video.muted;
    }
  }

  onSeekTo(event: MouseEvent, video: HTMLVideoElement) {
    event.stopPropagation();
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const start = this.startTime || 0;
    const end = this.endTime || this.duration || 1;
    const durationRange = end - start;

    const newTime = start + (percentage * durationRange);

    video.currentTime = newTime;
    this.currentTime = newTime;
  }

  onTimeUpdate(video: HTMLVideoElement) {
    this.currentTime = video.currentTime;
    this.timeUpdateEvent.emit(video);
  }

  onMetadataLoaded(video: HTMLVideoElement) {
    this.duration = video.duration;
    this.metadataLoadedEvent.emit(video);
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  toggleFullscreen(event?: MouseEvent) {
    if (event) event.stopPropagation();

    if (!this.isFullscreen) {
      const currentVideoTime = this.videoElement?.currentTime || 0;
      const isPlaying = !this.videoElement?.paused;

      this.videoElement?.pause();
      this.isFullscreen = true;
      this.hudVisible = true;
      this.cdr.detectChanges();

      // Start auto-hide timer for HUD
      this.scheduleHudHide();

      setTimeout(() => {
        if (this.fullscreenVideoRef) {
          const fsVideo = this.fullscreenVideoRef.nativeElement;
          fsVideo.currentTime = currentVideoTime;
          // Sync volume state
          if (this.videoElement) {
             fsVideo.volume = this.videoElement.volume;
             fsVideo.muted = this.videoElement.muted;
          }
          if (isPlaying) {
            fsVideo.play().then(() => {
              this.startFsProgressLoop(fsVideo);
            }).catch(err => console.error('Error playing fsVideo:', err));
          } else {
            this.currentTime = currentVideoTime;
          }
        }
      }, 50);
    } else {
      this.stopFsProgressLoop();
      this.clearHudTimer();
      if (this.fullscreenVideoRef && this.videoElement) {
        const fsVideo = this.fullscreenVideoRef.nativeElement;
        this.videoElement.currentTime = fsVideo.currentTime;

        if (!fsVideo.paused) {
          fsVideo.pause();
          this.videoElement.play().catch(err => console.error('Error playing videoElement:', err));
        } else {
          this.videoElement.pause();
        }
      }
      this.isFullscreen = false;
      this.hudVisible = false;
      this.cdr.detectChanges();
    }
  }

  /** Tap on fullscreen video: toggle HUD on mobile, toggle play on desktop */
  onFullscreenVideoClick(video: HTMLVideoElement) {
    // On touch devices, first tap shows/hides HUD; on desktop, toggle play
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      this.hudVisible = !this.hudVisible;
      this.cdr.detectChanges();
      if (this.hudVisible) {
        this.scheduleHudHide();
      } else {
        this.clearHudTimer();
      }
    } else {
      this.onTogglePlay(video);
    }
  }

  /** Keep HUD visible (called when interacting with controls) */
  keepHudVisible() {
    this.hudVisible = true;
    this.scheduleHudHide();
  }

  private scheduleHudHide() {
    this.clearHudTimer();
    this.hudHideTimer = setTimeout(() => {
      this.hudVisible = false;
      this.cdr.detectChanges();
    }, 3500);
  }

  private clearHudTimer() {
    if (this.hudHideTimer) {
      clearTimeout(this.hudHideTimer);
      this.hudHideTimer = null;
    }
  }

  private startProgressLoop(video: HTMLVideoElement) {
    this.stopProgressLoop();
    const update = () => {
      this.currentTime = video.currentTime;

      const start = this.startTime || 0;
      let end = this.endTime;
      if (!end) {
        end = video.duration && !isNaN(video.duration) ? video.duration : Number.MAX_VALUE;
      }

      if ((end - start) > 0.1 && video.currentTime >= end) {
        video.currentTime = start;
        video.play().catch(() => {});
      }

      this.animationFrameId = requestAnimationFrame(update);
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopProgressLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startFsProgressLoop(video: HTMLVideoElement) {
    this.stopFsProgressLoop();
    const update = () => {
      this.currentTime = video.currentTime;

      const start = this.startTime || 0;
      let end = this.endTime;
      if (!end) {
        end = video.duration && !isNaN(video.duration) ? video.duration : Number.MAX_VALUE;
      }

      if ((end - start) > 0.1 && video.currentTime >= end) {
        video.currentTime = start;
        video.play().catch(() => {});
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
}
