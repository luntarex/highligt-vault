import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ModerationQueueItem, ModerationService } from '../../core/services/moderation.service';
import { ToastService } from '../../core/services/toast.service';
import { getSafeErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './moderation.html',
  styleUrl: './moderation.css'
})
export class Moderation implements OnInit {
  queue: ModerationQueueItem[] = [];
  selectedClip: ModerationQueueItem | null = null;
  decisionReason = '';
  isLoading = false;
  isRefreshing = false;
  isSubmitting = false;
  reviewCurrentTime = 0;
  reviewDuration = 0;
  isReviewPlaying = false;
  statusFilter = '';
  minScoreFilter: number | null = null;
  categoryFilter = '';
  fromDateFilter = '';
  toDateFilter = '';
  readonly statusOptions = ['', 'PENDING_REVIEW', 'NEEDS_MANUAL_REVIEW', 'APPEALED'];

  constructor(
    private moderationService: ModerationService,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadQueue();
  }

  loadQueue(): void {
    const isInitialLoad = this.queue.length === 0 && !this.selectedClip;
    this.isLoading = isInitialLoad;
    this.isRefreshing = !isInitialLoad;
    this.moderationService.getQueue({
      status: this.statusFilter || undefined,
      minScore: this.minScoreFilter,
      category: this.categoryFilter.trim() || undefined,
      fromDate: this.fromDateFilter || undefined,
      toDate: this.toDateFilter || undefined
    }).subscribe({
      next: (items) => {
        this.queue = items || [];
        const selectedStillExists = this.queue.some(item => item.clipId === this.selectedClip?.clipId);
        this.selectedClip = selectedStillExists ? this.selectedClip : this.queue[0] || null;
        if (!selectedStillExists) {
          this.resetReviewPlayer();
        }
        this.isLoading = false;
        this.isRefreshing = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.isRefreshing = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not refresh moderation queue.'));
        this.cdr.detectChanges();
      }
    });
  }

  selectClip(item: ModerationQueueItem): void {
    this.selectedClip = item;
    this.decisionReason = '';
    this.resetReviewPlayer();
  }

  applyQueueFilters(): void {
    this.loadQueue();
  }

  clearQueueFilters(): void {
    this.statusFilter = '';
    this.minScoreFilter = null;
    this.categoryFilter = '';
    this.fromDateFilter = '';
    this.toDateFilter = '';
    this.loadQueue();
  }

  decide(action: 'APPROVE' | 'REJECT' | 'REMOVE'): void {
    if (!this.selectedClip || this.isSubmitting) return;

    this.isSubmitting = true;
    this.moderationService.decideClip(this.selectedClip.clipId, {
      moderatorId: this.authService.getCurrentUserId(),
      action,
      reason: this.decisionReason.trim() || this.defaultReason(action)
    }).subscribe({
      next: () => {
        this.toast.success(this.successMessage(action));
        const decidedClipId = this.selectedClip?.clipId;
        const decidedIndex = this.queue.findIndex(item => item.clipId === decidedClipId);
        this.queue = this.queue.filter(item => item.clipId !== decidedClipId);
        this.selectedClip = this.queue[decidedIndex] || this.queue[decidedIndex - 1] || this.queue[0] || null;
        this.resetReviewPlayer();
        this.decisionReason = '';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not apply moderation decision.'));
        this.cdr.detectChanges();
      }
    });
  }

  formatDate(value: string): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString();
  }

  toggleReviewPlay(video: HTMLVideoElement): void {
    if (video.paused) {
      video.play().then(() => {
        this.isReviewPlaying = true;
        this.cdr.detectChanges();
      }).catch(() => {
        this.isReviewPlaying = false;
        this.cdr.detectChanges();
      });
      return;
    }

    video.pause();
    this.isReviewPlaying = false;
    this.cdr.detectChanges();
  }

  onReviewTimeUpdate(video: HTMLVideoElement): void {
    this.reviewCurrentTime = video.currentTime || 0;
    this.reviewDuration = video.duration && !isNaN(video.duration) ? video.duration : this.reviewDuration;
    this.isReviewPlaying = !video.paused;
  }

  onReviewMetadataLoaded(video: HTMLVideoElement): void {
    this.reviewDuration = video.duration && !isNaN(video.duration) ? video.duration : 0;
    this.reviewCurrentTime = video.currentTime || 0;
  }

  onReviewSeek(event: MouseEvent, video: HTMLVideoElement): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const duration = video.duration && !isNaN(video.duration) ? video.duration : this.reviewDuration;
    const newTime = percentage * (duration || 0);
    video.currentTime = newTime;
    this.reviewCurrentTime = newTime;
  }

  toggleReviewMute(event: MouseEvent, video: HTMLVideoElement): void {
    event.stopPropagation();
    video.muted = !video.muted;
    this.cdr.detectChanges();
  }

  openReviewFullscreen(event: MouseEvent, container: HTMLElement): void {
    event.stopPropagation();
    container.requestFullscreen?.();
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  }

  progressPercent(): number {
    if (!this.reviewDuration) return 0;
    return Math.max(0, Math.min(100, (this.reviewCurrentTime / this.reviewDuration) * 100));
  }

  private resetReviewPlayer(): void {
    this.reviewCurrentTime = 0;
    this.reviewDuration = 0;
    this.isReviewPlaying = false;
  }

  private defaultReason(action: 'APPROVE' | 'REJECT' | 'REMOVE'): string {
    if (action === 'APPROVE') return 'Approved after moderator review.';
    if (action === 'REJECT') return 'Rejected after moderator review.';
    return 'Removed after moderator review.';
  }

  private successMessage(action: 'APPROVE' | 'REJECT' | 'REMOVE'): string {
    if (action === 'APPROVE') return 'Clip approved.';
    if (action === 'REJECT') return 'Clip rejected.';
    return 'Clip removed.';
  }
}
