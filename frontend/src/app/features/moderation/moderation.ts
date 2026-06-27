import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../core/services/auth.service';
import { buildSlugId } from '../../core/utils/slug.util';
import { Clip } from '../../core/models/clip';
import { Comment } from '../../core/models/comment';
import { Community } from '../../core/models/community';
import { ExplorePost } from '../../core/models/explore-post';
import { ClipService } from '../../core/services/clip.service';
import { CommentService } from '../../core/services/comment.service';
import { ExploreService } from '../../core/services/explore.service';
import { ModerationQueueItem, ModerationService } from '../../core/services/moderation.service';
import { ReportedClipPreview, ReportedCommentPreview, ReportResponse } from '../../core/services/report.service';
import { ToastService } from '../../core/services/toast.service';
import { getSafeErrorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslocoModule],
  templateUrl: './moderation.html',
  styleUrl: './moderation.css'
})
export class Moderation implements OnInit {
  protected readonly buildSlugId = buildSlugId;
  activeSection: 'uploads' | 'reports' | 'communities' = 'uploads';
  queue: ModerationQueueItem[] = [];
  reports: ReportResponse[] = [];
  communityQueue: Community[] = [];
  selectedClip: ModerationQueueItem | null = null;
  decisionReason = '';
  isLoading = false;
  isRefreshing = false;
  reportsLoading = false;
  communitiesLoading = false;
  isSubmitting = false;
  isResolvingReportId: number | null = null;
  isActingOnCommentReportId: number | null = null;
  isDecidingCommunityId: number | null = null;
  reviewCurrentTime = 0;
  reviewDuration = 0;
  isReviewPlaying = false;
  reportResolutionById: Record<number, string> = {};
  communityReasonById: Record<number, string> = {};
  statusFilter = '';
  minScoreFilter: number | null = null;
  categoryFilter = '';
  fromDateFilter = '';
  toDateFilter = '';
  readonly statusOptions = ['', 'PENDING_REVIEW', 'NEEDS_MANUAL_REVIEW', 'APPEALED'];

  // ---- Review Deck UX state ----
  // One item in focus at a time; same paradigm on desktop (buttons + keyboard)
  // and mobile (swipe). Reports/communities reuse the same shell via their own index.
  uploadsView: 'deck' | 'list' = 'deck';
  noteOpen = false;
  filtersOpen = false;
  reportIndex = 0;
  communityIndex = 0;
  // Horizontal swipe (mobile): right = primary (approve/resolve), left = secondary (reject/dismiss).
  dragX = 0;
  dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private swipeAxis: 'h' | 'v' | null = null;

  constructor(
    private moderationService: ModerationService,
    private clipService: ClipService,
    private commentService: CommentService,
    private exploreService: ExploreService,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadQueue();
    this.loadReports();
    this.loadCommunityQueue();
  }

  setSection(section: 'uploads' | 'reports' | 'communities'): void {
    this.activeSection = section;
    this.noteOpen = false;
    this.filtersOpen = false;
    this.resetDrag();
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

  loadCommunityQueue(): void {
    this.communitiesLoading = this.communityQueue.length === 0;
    this.moderationService.getPendingCommunities().subscribe({
      next: (items) => {
        this.communityQueue = items || [];
        this.communitiesLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.communitiesLoading = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not load community moderation queue.'));
        this.cdr.detectChanges();
      }
    });
  }

  decideCommunity(community: Community, approved: boolean): void {
    if (this.isDecidingCommunityId) return;

    const reason = (this.communityReasonById[community.id] || '').trim()
      || (approved ? 'Approved after moderator review.' : 'Rejected after moderator review.');
    this.isDecidingCommunityId = community.id;
    const request = approved
      ? this.moderationService.approveCommunity(community.id, reason)
      : this.moderationService.rejectCommunity(community.id, reason);

    request.subscribe({
      next: () => {
        this.communityQueue = this.communityQueue.filter(item => item.id !== community.id);
        this.communityIndex = Math.min(this.communityIndex, Math.max(0, this.communityQueue.length - 1));
        delete this.communityReasonById[community.id];
        this.isDecidingCommunityId = null;
        this.toast.success(approved ? 'Community approved.' : 'Community rejected.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isDecidingCommunityId = null;
        this.toast.error(getSafeErrorMessage(err, 'Could not apply community decision.'));
        this.cdr.detectChanges();
      }
    });
  }

  resolveReport(report: ReportResponse, dismissed = false): void {
    if (this.isResolvingReportId || this.isActingOnCommentReportId) return;

    const resolution = (this.reportResolutionById[report.id] || '').trim()
      || (dismissed ? 'Dismissed by moderator.' : 'Resolved by moderator.');
    this.isResolvingReportId = report.id;
    this.moderationService.resolveReport(report.id, { resolution, dismissed }).subscribe({
      next: () => {
        this.reports = this.reports.filter(item => item.id !== report.id);
        this.reportIndex = Math.min(this.reportIndex, Math.max(0, this.reports.length - 1));
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

  moderateReportedComment(report: ReportResponse, violation: boolean): void {
    if (
      this.isResolvingReportId
      || this.isActingOnCommentReportId
      || report.targetType !== 'COMMENT'
    ) {
      return;
    }

    const commentId = report.targetComment?.id || report.targetId;
    const resolution = (this.reportResolutionById[report.id] || '').trim()
      || (violation
        ? 'Comment removed and archived for a policy violation.'
        : 'Comment deleted by moderator.');

    this.isActingOnCommentReportId = report.id;
    const action = violation
      ? this.commentService.removeCommentViolation(commentId)
      : this.commentService.removeComment(commentId);

    action.subscribe({
      next: () => this.resolveReportAfterCommentAction(report, resolution, violation),
      error: (err) => {
        this.isActingOnCommentReportId = null;
        this.toast.error(getSafeErrorMessage(err, 'Could not moderate reported comment.'));
        this.cdr.detectChanges();
      }
    });
  }

  selectClip(item: ModerationQueueItem): void {
    this.selectedClip = item;
    this.decisionReason = '';
    this.noteOpen = false;
    this.uploadsView = 'deck';
    this.resetDrag();
    this.resetReviewPlayer();
  }

  /** Decide directly from a card's inline buttons (mobile card layout). */
  decideItem(item: ModerationQueueItem, action: 'APPROVE' | 'REJECT' | 'REMOVE'): void {
    if (this.isSubmitting) return;
    this.selectedClip = item;
    this.decisionReason = '';
    this.decide(action);
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
        this.noteOpen = false;
        this.resetDrag();
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
    if (report.targetPostId) return ['/post', buildSlugId(report.targetClip?.title, report.targetPostId)];
    if (report.targetType === 'POST') return ['/post', buildSlugId(report.targetClip?.title, report.targetId)];
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

  isReportActionBusy(report: ReportResponse): boolean {
    return this.isResolvingReportId === report.id || this.isActingOnCommentReportId === report.id;
  }

  private resolveReportAfterCommentAction(
    report: ReportResponse,
    resolution: string,
    violation: boolean
  ): void {
    this.moderationService.resolveReport(report.id, { resolution, dismissed: false }).subscribe({
      next: () => {
        this.reports = this.reports.filter(item => item.id !== report.id);
        this.reportIndex = Math.min(this.reportIndex, Math.max(0, this.reports.length - 1));
        delete this.reportResolutionById[report.id];
        this.isActingOnCommentReportId = null;
        this.toast.success(violation
          ? 'Comment removed for violation and report resolved.'
          : 'Comment deleted and report resolved.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isActingOnCommentReportId = null;
        this.patchReport(report.id, { targetComment: undefined });
        this.toast.error(getSafeErrorMessage(
          err,
          'Comment was moderated, but the report could not be resolved.'
        ));
        this.cdr.detectChanges();
      }
    });
  }

  private hydrateMissingReportTargets(): void {
    this.reports
      .filter(report =>
        report.targetType !== 'USER'
        && (!report.targetClip || (report.targetType === 'COMMENT' && !report.targetComment))
      )
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
      return;
    }

    if (report.targetType === 'COMMENT' && report.targetPostId) {
      if (!report.targetClip) {
        this.exploreService.getPostById(String(report.targetPostId)).subscribe({
          next: (post) => this.patchReport(report.id, { targetClip: this.postToReportPreview(post) }),
          error: () => undefined
        });
      }

      this.commentService.getCommentsByPostId(String(report.targetPostId)).subscribe({
        next: (comments) => {
          const targetComment = (comments || []).find(comment => comment.id === report.targetId);
          if (targetComment) {
            this.patchReport(report.id, { targetComment: this.commentToReportPreview(targetComment) });
          }
        },
        error: () => undefined
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

  private commentToReportPreview(comment: Comment): ReportedCommentPreview {
    return {
      id: comment.id,
      content: comment.cleanText || comment.content,
      createdAt: '',
      userId: comment.userId,
      postId: Number(comment.postId),
      parentCommentId: comment.parentCommentId,
      username: comment.username,
      profilePhoto: comment.profilePhoto
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

  // ============================================================
  // Review Deck: navigation, keyboard, swipe, risk helpers
  // ============================================================

  /** Index of the focused clip within the queue (-1 when none). */
  get uploadsIndex(): number {
    if (!this.selectedClip) return -1;
    return this.queue.findIndex(item => item.clipId === this.selectedClip?.clipId);
  }

  get uploadsTotal(): number {
    return this.queue.length;
  }

  get currentReport(): ReportResponse | null {
    if (this.reports.length === 0) return null;
    const i = Math.min(Math.max(this.reportIndex, 0), this.reports.length - 1);
    return this.reports[i] || null;
  }

  get currentCommunity(): Community | null {
    if (this.communityQueue.length === 0) return null;
    const i = Math.min(Math.max(this.communityIndex, 0), this.communityQueue.length - 1);
    return this.communityQueue[i] || null;
  }

  /** Coarse risk band from the AI score; drives the verdict colour. */
  riskLevel(score: number | undefined | null): 'low' | 'medium' | 'high' {
    const value = score || 0;
    if (value >= 70) return 'high';
    if (value >= 40) return 'medium';
    return 'low';
  }

  hasActiveFilters(): boolean {
    return !!(this.statusFilter || this.minScoreFilter || this.categoryFilter || this.fromDateFilter || this.toDateFilter);
  }

  refreshActive(): void {
    if (this.activeSection === 'uploads') this.loadQueue();
    else if (this.activeSection === 'reports') this.loadReports();
    else this.loadCommunityQueue();
  }

  goPrevClip(): void {
    const i = this.uploadsIndex;
    if (i > 0) this.selectClip(this.queue[i - 1]);
  }

  goNextClip(): void {
    const i = this.uploadsIndex;
    if (i >= 0 && i < this.queue.length - 1) this.selectClip(this.queue[i + 1]);
  }

  goPrevReport(): void {
    if (this.reportIndex > 0) {
      this.reportIndex--;
      this.resetDrag();
    }
  }

  goNextReport(): void {
    if (this.reportIndex < this.reports.length - 1) {
      this.reportIndex++;
      this.resetDrag();
    }
  }

  goPrevCommunity(): void {
    if (this.communityIndex > 0) {
      this.communityIndex--;
      this.resetDrag();
    }
  }

  goNextCommunity(): void {
    if (this.communityIndex < this.communityQueue.length - 1) {
      this.communityIndex++;
      this.resetDrag();
    }
  }

  isMobile(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();

    if (this.activeSection === 'uploads' && this.selectedClip && this.uploadsView === 'deck') {
      if (key === 'a') { event.preventDefault(); this.decide('APPROVE'); }
      else if (key === 'r') { event.preventDefault(); this.decide('REJECT'); }
      else if (key === 'x') { event.preventDefault(); this.decide('REMOVE'); }
      else if (key === 'arrowleft') { event.preventDefault(); this.goPrevClip(); }
      else if (key === 'arrowright') { event.preventDefault(); this.goNextClip(); }
      return;
    }

    if (this.activeSection === 'reports' && this.currentReport) {
      if (key === 'r') { event.preventDefault(); this.resolveReport(this.currentReport, false); }
      else if (key === 'd') { event.preventDefault(); this.resolveReport(this.currentReport, true); }
      else if (key === 'arrowleft') { event.preventDefault(); this.goPrevReport(); }
      else if (key === 'arrowright') { event.preventDefault(); this.goNextReport(); }
      return;
    }

    if (this.activeSection === 'communities' && this.currentCommunity) {
      if (key === 'a') { event.preventDefault(); this.decideCommunity(this.currentCommunity, true); }
      else if (key === 'r') { event.preventDefault(); this.decideCommunity(this.currentCommunity, false); }
      else if (key === 'arrowleft') { event.preventDefault(); this.goPrevCommunity(); }
      else if (key === 'arrowright') { event.preventDefault(); this.goNextCommunity(); }
    }
  }

  onCardPointerDown(event: PointerEvent): void {
    if (!this.isMobile() || event.pointerType === 'mouse') return;
    this.dragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.swipeAxis = null;
  }

  onCardPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    if (this.swipeAxis === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      this.swipeAxis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (this.swipeAxis === 'h') {
      event.preventDefault();
      this.dragX = dx;
    }
  }

  onCardPointerUp(): void {
    if (!this.dragging) return;
    const dx = this.dragX;
    const horizontal = this.swipeAxis === 'h';
    this.resetDrag();
    if (!horizontal || Math.abs(dx) < 110) return;
    if (dx > 0) this.swipePrimary();
    else this.swipeSecondary();
  }

  private swipePrimary(): void {
    if (this.activeSection === 'uploads' && this.selectedClip) this.decide('APPROVE');
    else if (this.activeSection === 'reports' && this.currentReport) this.resolveReport(this.currentReport, false);
    else if (this.activeSection === 'communities' && this.currentCommunity) this.decideCommunity(this.currentCommunity, true);
  }

  private swipeSecondary(): void {
    if (this.activeSection === 'uploads' && this.selectedClip) this.decide('REJECT');
    else if (this.activeSection === 'reports' && this.currentReport) this.resolveReport(this.currentReport, true);
    else if (this.activeSection === 'communities' && this.currentCommunity) this.decideCommunity(this.currentCommunity, false);
  }

  private resetDrag(): void {
    this.dragging = false;
    this.dragX = 0;
    this.swipeAxis = null;
  }
}
