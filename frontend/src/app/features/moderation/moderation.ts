import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Clip } from '../../core/models/clip';
import { ExplorePost } from '../../core/models/explore-post';
import { ClipService } from '../../core/services/clip.service';
import { ExploreService } from '../../core/services/explore.service';
import { ModerationQueueItem, ModerationService } from '../../core/services/moderation.service';
import { ReportedClipPreview, ReportResponse } from '../../core/services/report.service';
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
  reports: ReportResponse[] = [];
  selectedClip: ModerationQueueItem | null = null;
  decisionReason = '';
  isLoading = false;
  isRefreshing = false;
  reportsLoading = false;
  isSubmitting = false;
  isResolvingReportId: number | null = null;
  reviewCurrentTime = 0;
  reviewDuration = 0;
  isReviewPlaying = false;
  reportResolutionById: Record<number, string> = {};
  statusFilter = '';
  minScoreFilter: number | null = null;
  categoryFilter = '';
  fromDateFilter = '';
  toDateFilter = '';
  readonly statusOptions = ['', 'PENDING_REVIEW', 'NEEDS_MANUAL_REVIEW', 'APPEALED'];

  constructor(
    private moderationService: ModerationService,
    private clipService: ClipService,
    private exploreService: ExploreService,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadQueue();
    this.loadReports();
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

  loadReports(): void {
    this.reportsLoading = this.reports.length === 0;
    this.moderationService.getReports().subscribe({
      next: (reports) => {
        this.reports = reports || [];
        this.reportsLoading = false;
        this.hydrateMissingReportTargets();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.reportsLoading = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not load content reports.'));
        this.cdr.detectChanges();
      }
    });
  }

  resolveReport(report: ReportResponse, dismissed = false): void {
    if (this.isResolvingReportId) return;

    const resolution = (this.reportResolutionById[report.id] || '').trim()
      || (dismissed ? 'Dismissed by moderator.' : 'Resolved by moderator.');
    this.isResolvingReportId = report.id;
    this.moderationService.resolveReport(report.id, { resolution, dismissed }).subscribe({
      next: () => {
        this.reports = this.reports.filter(item => item.id !== report.id);
        delete this.reportResolutionById[report.id];
        this.isResolvingReportId = null;
        this.toast.success(dismissed ? 'Report dismissed.' : 'Report resolved.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isResolvingReportId = null;
        this.toast.error(getSafeErrorMessage(err, 'Could not resolve report.'));
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

  formatReportText(value: string | null | undefined): string {
    if (!value) return 'Unknown';
    return value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  reportTargetRoute(report: ReportResponse): Array<string | number> | null {
    if (report.targetPostId) return ['/post', report.targetPostId];
    if (report.targetType === 'POST') return ['/post', report.targetId];
    if (report.targetType === 'USER') return ['/profile', report.targetId];
    return null;
  }

  selectReportClip(report: ReportResponse): void {
    if (!report.targetClip) return;

    this.selectedClip = { ...report.targetClip };
    this.decisionReason = report.details?.trim()
      ? `Report #${report.id}: ${report.details.trim()}`
      : `Report #${report.id}: ${this.formatReportText(report.reason)}`;
    this.resetReviewPlayer();
    this.cdr.detectChanges();
  }

  private hydrateMissingReportTargets(): void {
    this.reports
      .filter(report => !report.targetClip && report.targetType !== 'USER')
      .forEach(report => this.hydrateReportTarget(report));
  }

  private hydrateReportTarget(report: ReportResponse): void {
    if (report.targetType === 'CLIP') {
      this.clipService.getClip(report.targetId).subscribe({
        next: (clip) => {
          this.patchReport(report.id, { targetClip: this.clipToReportPreview(clip) });
          this.hydratePostIdFromClip(report, clip.id);
        },
        error: () => this.patchReport(report.id, { targetClip: undefined })
      });
      return;
    }

    if (report.targetType === 'POST') {
      this.exploreService.getPostById(String(report.targetId)).subscribe({
        next: (post) => this.patchReport(report.id, {
          targetPostId: Number(post.id),
          targetClip: this.postToReportPreview(post)
        }),
        error: () => this.patchReport(report.id, { targetClip: undefined })
      });
    }
  }

  private hydratePostIdFromClip(report: ReportResponse, clipId: number): void {
    this.exploreService.getPostByClipId(clipId).subscribe({
      next: (post) => this.patchReport(report.id, { targetPostId: Number(post.id) || undefined }),
      error: () => undefined
    });
  }

  private patchReport(reportId: number, patch: Partial<ReportResponse>): void {
    this.reports = this.reports.map(report =>
      report.id === reportId ? { ...report, ...patch } : report
    );
    this.cdr.detectChanges();
  }

  private clipToReportPreview(clip: Clip): ReportedClipPreview {
    return {
      clipId: clip.id,
      title: clip.title,
      videoUrl: clip.url,
      thumbnailUrl: clip.thumbnailUrl,
      uploaderId: clip.uploaderId,
      uploaderUsername: `User #${clip.uploaderId}`,
      moderationStatus: clip.moderationStatus || 'N/A',
      moderationScore: clip.moderationScore || 0,
      moderationReason: clip.moderationReason || '',
      moderationCategory: 'N/A',
      visibilityStatus: clip.visibilityStatus || 'N/A',
      createdAt: String(clip.dateCreated || '')
    };
  }

  private postToReportPreview(post: ExplorePost): ReportedClipPreview {
    return {
      clipId: Number(post.clipId || 0),
      title: post.title,
      videoUrl: post.videoUrl,
      thumbnailUrl: '',
      uploaderId: Number(post.author.id),
      uploaderUsername: post.author.username,
      moderationStatus: 'PUBLIC_POST',
      moderationScore: 0,
      moderationReason: '',
      moderationCategory: post.game || 'N/A',
      visibilityStatus: 'PUBLIC',
      createdAt: post.createdAt || ''
    };
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
