import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ExplorePost } from '../../../core/models/explore-post';
import { AuthService } from '../../../core/services/auth.service';
import { ReportButtonComponent } from '../../../shared/report-button/report-button';
import { buildSlugId } from '../../../core/utils/slug.util';

/**
 * Full-screen vertical snap feed (Reels/TikTok-style) for mobile.
 *
 * Owns its own video playback: an IntersectionObserver autoplays the most
 * visible reel (muted, as mobile autoplay requires) and pauses the rest.
 * Tapping a reel toggles play/pause; the right-hand rail carries the actions.
 * Data mutations (like/favorite/comment/delete) are delegated to the parent
 * feed, which already owns those handlers.
 */
@Component({
  selector: 'app-feed-reels',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoModule, ReportButtonComponent],
  templateUrl: './feed-reels.html',
  styleUrls: ['./feed-reels.css'],
})
export class FeedReels implements AfterViewInit, OnDestroy {
  @Input() posts: ExplorePost[] = [];

  @Output() toggleLikeEvent = new EventEmitter<ExplorePost>();
  @Output() toggleFavoriteEvent = new EventEmitter<ExplorePost>();
  @Output() openCommentsEvent = new EventEmitter<ExplorePost>();
  @Output() deletePostEvent = new EventEmitter<ExplorePost>();

  @ViewChildren('reelVideo') videos!: QueryList<ElementRef<HTMLVideoElement>>;

  /** Id of the reel the user explicitly paused (suppresses autoplay). */
  pausedId: string | null = null;
  muted = true;

  private observer: IntersectionObserver | null = null;
  private activeId: string | null = null;

  constructor(public authService: AuthService) {}

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => this.onIntersect(entries),
      { threshold: [0.25, 0.5, 0.75] }
    );
    this.observeVideos();
    this.videos.changes.subscribe(() => this.observeVideos());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private observeVideos(): void {
    this.observer?.disconnect();
    this.videos.forEach((ref) => this.observer?.observe(ref.nativeElement));
  }

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    // Pause any reel that scrolled out of view.
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        (entry.target as HTMLVideoElement).pause();
      }
    });

    // Pick the most visible reel and make it the active one.
    let best: HTMLVideoElement | null = null;
    let bestRatio = 0.5;
    this.videos.forEach((ref) => {
      const v = ref.nativeElement;
      const rect = v.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const ratio = visible / window.innerHeight;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = v;
      }
    });

    if (!best) return;
    const activeVideo = best as HTMLVideoElement;
    const postId = activeVideo.getAttribute('data-post-id');
    this.activeId = postId;

    this.videos.forEach((ref) => {
      const v = ref.nativeElement;
      if (v !== activeVideo) v.pause();
    });

    if (postId !== this.pausedId) {
      this.playWithinClip(activeVideo, this.postById(postId));
    }
  }

  private postById(id: string | null): ExplorePost | undefined {
    return id ? this.posts.find((p) => p.id === id) : undefined;
  }

  private playWithinClip(video: HTMLVideoElement, post: ExplorePost | undefined): void {
    if (!post) return;
    const start = post.startTime || 0;
    if (video.currentTime < start) video.currentTime = start;
    video.play().catch(() => {});
  }

  /** Loop the video within the clip's [startTime, endTime] window. */
  onProgress(video: HTMLVideoElement, post: ExplorePost): void {
    post.currentTime = video.currentTime;
    const start = post.startTime || 0;
    let end = post.endTime;
    if (!end || end <= start) {
      end = video.duration && !isNaN(video.duration) ? video.duration : 0;
    }
    if (end && video.currentTime >= end) {
      video.currentTime = start;
      video.play().catch(() => {});
    }
  }

  onMeta(video: HTMLVideoElement, post: ExplorePost): void {
    post.duration = video.duration;
  }

  togglePlay(video: HTMLVideoElement, post: ExplorePost): void {
    if (video.paused) {
      this.pausedId = null;
      this.playWithinClip(video, post);
    } else {
      video.pause();
      this.pausedId = post.id;
    }
  }

  toggleMute(event: Event): void {
    event.stopPropagation();
    this.muted = !this.muted;
  }

  progressPercent(post: ExplorePost): number {
    const start = post.startTime || 0;
    const end = post.endTime && post.endTime > start ? post.endTime : post.duration || 0;
    const span = end - start;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(100, ((post.currentTime || 0) - start) / span * 100));
  }

  like(post: ExplorePost): void {
    this.toggleLikeEvent.emit(post);
  }

  favorite(post: ExplorePost): void {
    this.toggleFavoriteEvent.emit(post);
  }

  comment(post: ExplorePost): void {
    this.openCommentsEvent.emit(post);
  }

  delete(post: ExplorePost): void {
    this.deletePostEvent.emit(post);
  }

  canManage(post: ExplorePost): boolean {
    return this.authService.isAdmin() || this.authService.getCurrentUserId() === post.author.id;
  }

  async share(event: Event, post: ExplorePost): Promise<void> {
    event.stopPropagation();
    const url = `${window.location.origin}/post/${buildSlugId(post.title, post.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title || 'Clip', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled share / clipboard blocked — nothing to do */
    }
  }

  formatCount(n: number | undefined): string {
    const v = n || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return `${v}`;
  }
}
