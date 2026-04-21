import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { Clip } from '../../core/models/clip';
import { ClipCard } from '../library/clip-card/clip-card';
import { BackLink } from '../../shared/back-link/back-link';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, ClipCard, RouterLink, BackLink, ConfirmDialog],
  templateUrl: './favorites.html',
  styleUrls: ['./favorites.css']
})
export class Favorites implements OnInit {
  favoriteClips: Clip[] = [];
  isLoading = true;

  showRemoveModal = false;
  clipToRemove: number | null = null;

  activeClip: Clip | null = null;
  private fsAnimationFrameId: number | null = null;
  @ViewChild('fullscreenVideo') fullscreenVideoRef?: ElementRef<HTMLVideoElement>;

  @HostListener('window:keydown.escape', ['$event'])
  handleEscape(event: any) {
    if (this.activeClip) {
      this.closeFullscreen();
    }
  }

  constructor(
    private clipService: ClipService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.isLoading = true;
      this.clipService.getFavorites(userId).subscribe({
        next: (clips) => {
          this.favoriteClips = clips;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load favorites:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  handleRemoveFavorite(clipId: number): void {
    this.clipToRemove = clipId;
    this.showRemoveModal = true;
  }

  onConfirmRemove(): void {
    const userId = this.authService.getCurrentUserId();
    if (this.clipToRemove && userId) {
      this.clipService.removeFavorite(this.clipToRemove, userId).subscribe({
        next: () => {
          this.favoriteClips = this.favoriteClips.filter(c => c.id !== this.clipToRemove);
          this.showRemoveModal = false;
          this.clipToRemove = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to remove favorite:', err);
          this.showRemoveModal = false;
          this.clipToRemove = null;
        }
      });
    }
  }

  onCancelRemove(): void {
    this.showRemoveModal = false;
    this.clipToRemove = null;
  }

  ngOnDestroy(): void {
    this.stopFsProgressLoop();
  }

  handlePlayClip(clip: Clip): void {
    this.activeClip = clip;
  }

  closeFullscreen(): void {
    if (this.fullscreenVideoRef) {
      this.fullscreenVideoRef.nativeElement.pause();
    }
    this.stopFsProgressLoop();
    this.activeClip = null;
    this.cdr.detectChanges();
  }

  onTogglePlay(video: HTMLVideoElement) {
    if (video.paused) {
      video.play().then(() => this.startFsProgressLoop(video)).catch(err => console.error(err));
    } else {
      video.pause();
      this.stopFsProgressLoop();
    }
  }

  onSeekTo(event: MouseEvent, video: HTMLVideoElement) {
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));

    const start = this.activeClip!.startTime || 0;
    const end = this.activeClip!.endTime || video.duration || 1;
    const seekTime = start + (end - start) * percentage;
    video.currentTime = seekTime;
    this.activeClip!.currentTime = seekTime;

    if (video.paused) {
       video.play().then(() => this.startFsProgressLoop(video)).catch(e => console.error(e));
    }
  }

  private startFsProgressLoop(video: HTMLVideoElement) {
    this.stopFsProgressLoop();
    const update = () => {
      if (!this.activeClip) return;
      this.activeClip.currentTime = video.currentTime;
      const start = this.activeClip.startTime || 0;
      let end = this.activeClip.endTime;
      if (!end) end = video.duration && !isNaN(video.duration) ? video.duration : Number.MAX_VALUE;

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

  onToggleMute(event: MouseEvent, video: HTMLVideoElement) {
    event.stopPropagation();
    video.muted = !video.muted;
    if (video.muted) {
      video.volume = 0;
    } else if (video.volume === 0) {
      video.volume = 1;
    }
  }

  onVolumeChange(event: Event, video: HTMLVideoElement) {
    const input = event.target as HTMLInputElement;
    video.volume = parseFloat(input.value);
    video.muted = video.volume === 0;
  }

  onTimeUpdate(video: HTMLVideoElement) {
    if (this.activeClip) {
      this.activeClip.currentTime = video.currentTime;
    }
  }

  onMetadataLoaded(video: HTMLVideoElement) {
    if (this.activeClip) {
       this.activeClip.duration = video.duration;
       video.play().then(() => this.startFsProgressLoop(video)).catch(e => console.error(e));
    }
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
