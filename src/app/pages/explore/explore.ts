import { Component, OnDestroy, OnInit, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { ExplorePost } from '../../models/explore-post';
import { ExploreService } from '../../services/explore.service';
import { RouterLink } from "@angular/router";
import { NgClass } from "@angular/common";
import { ClipService } from '../../services/clip.service';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.html',
  styleUrls: ['./explore.css'],
  imports: [RouterLink, NgClass]
})
export class Explore implements OnInit, OnDestroy, AfterViewInit {

  feed: ExplorePost[] = [];
  playingPostId: string | null = null;
  private animationFrameId: number | null = null;

  @ViewChildren('videoPlayer') videoElements!: QueryList<ElementRef<HTMLVideoElement>>;
  private observer: IntersectionObserver | null = null;

  constructor(private exploreService: ExploreService, private clipService: ClipService) { }

  ngOnInit(): void {
    this.loadServiceData();
  }

  ngAfterViewInit(): void {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        const postId = video.getAttribute('data-post-id');

        if (entry.isIntersecting) {
          video.play().catch(() => {});

          if (postId) {
            const blurredBg = document.querySelector(`video.blurred-background[data-post-id="blur-${postId}"]`) as HTMLVideoElement;
            if (blurredBg) {
              blurredBg.play().catch(() => {});
            }

            this.playingPostId = postId;
            const post = this.feed.find(p => p.id === postId);
            if (post) {
              this.startProgressLoop(post, video);
            }
          }
        } else {
          video.pause();

          if (postId) {
            const blurredBg = document.querySelector(`video.blurred-background[data-post-id="blur-${postId}"]`) as HTMLVideoElement;
            if (blurredBg) {
              blurredBg.pause();
            }

            if (this.playingPostId === postId) {
              this.playingPostId = null;
              this.stopProgressLoop();
            }
          }
        }
      });
    }, options);

    this.videoElements.changes.subscribe(() => {
      this.observeVideos();
    });
    this.observeVideos();
  }

  observeVideos() {
    this.observer?.disconnect();
    this.videoElements.forEach(videoRef => {
      this.observer?.observe(videoRef.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.stopProgressLoop();
  }

  loadServiceData(): void {
    this.exploreService.getFeed().subscribe((feedData) => {
      this.feed = feedData.map(post => ({
        ...post,
        currentTime: 0,
        duration: 0
      }));
    });
  }

  onTimeUpdate(post: ExplorePost, video: HTMLVideoElement) {

    if (this.playingPostId !== post.id) {
      post.currentTime = video.currentTime;
    }
  }

  onMetadataLoaded(post: ExplorePost, video: HTMLVideoElement) {
    post.duration = video.duration;
  }

  seekTo(event: MouseEvent, post: ExplorePost, video: HTMLVideoElement) {
    event.stopPropagation();
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    video.currentTime = percentage * (post.duration || 0);
    post.currentTime = video.currentTime;
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  togglePlay(post: ExplorePost, video: HTMLVideoElement) {
    const blurredBg = document.querySelector(`video.blurred-background[data-post-id="blur-${post.id}"]`) as HTMLVideoElement;

    if (this.playingPostId === post.id) {
      video.pause();
      if (blurredBg) blurredBg.pause();
      this.playingPostId = null;
      this.stopProgressLoop();
    } else {
      video.play();
      if (blurredBg) blurredBg.play();
      this.playingPostId = post.id;
      this.startProgressLoop(post, video);
    }
  }

  toggleMute(event: MouseEvent, video: HTMLVideoElement) {
    event.stopPropagation();

    // Toggle the actual video property
    video.muted = !video.muted;

    // Also toggle the blurred background video if it exists
    const postId = video.getAttribute('data-post-id');
    if (postId) {
      const blurredBg = document.querySelector(`video.blurred-background[data-post-id="blur-${postId}"]`) as HTMLVideoElement;
      if (blurredBg) {
        blurredBg.muted = video.muted;
      }
    }
  }

  private startProgressLoop(post: ExplorePost, video: HTMLVideoElement) {
    this.stopProgressLoop();
    const update = () => {
      post.currentTime = video.currentTime;
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

  toggleLike(post: ExplorePost) {
    post.isLiked = !post.isLiked;
    post.isLiked ? post.likes++ : post.likes--;
  }

  openComments(post: ExplorePost) {
    console.log('Opening comments for:', post.id);
  }
}
