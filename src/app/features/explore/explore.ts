import { Component, OnDestroy, OnInit, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { ExplorePost } from '../../core/models/explore-post';
import { ExploreService } from '../../core/services/explore.service';
import { RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { ExplorePostCard } from './explore-post-card/explore-post-card';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.html',
  styleUrls: ['./explore.css'],
  imports: [RouterLink, FormsModule, ExplorePostCard]
})
export class Explore implements OnInit, OnDestroy, AfterViewInit {
  activePostForComments: ExplorePost | null = null;
  newCommentText: string = '';

  mockComments = [
    { id: 1, username: 'JettDash', text: 'Bro that flick at the end was insane 🔥', timeAgo: '1h' },
    { id: 2, username: 'SilverSurfer', text: 'What sensitivity do you play on?', timeAgo: '3h' },
    { id: 3, username: 'TacticalToad', text: 'I tried this lineup and died instantly lol', timeAgo: '5h' }
  ];

  feed: ExplorePost[] = [];
  playingPostId: string | null = null;
  private animationFrameId: number | null = null;

  @ViewChildren(ExplorePostCard) postCards!: QueryList<ExplorePostCard>;
  private observer: IntersectionObserver | null = null;

  constructor(private exploreService: ExploreService) { }

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
            this.playingPostId = postId;
            const post = this.feed.find(p => p.id === postId);
            if (post) {
              this.startProgressLoop(post, video);
            }
          }
        } else {
          video.pause();

          if (postId) {
            if (this.playingPostId === postId) {
              this.playingPostId = null;
              this.stopProgressLoop();
            }
          }
        }
      });
    }, options);

    this.postCards.changes.subscribe(() => {
      this.observeVideos();
    });
    this.observeVideos();
  }

  observeVideos() {
    this.observer?.disconnect();
    this.postCards.forEach(card => {
      const video = card.videoElement;
      if (video) {
        this.observer?.observe(video);
      }
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

  onTimeUpdate(data: { post: ExplorePost; video: HTMLVideoElement }) {
    if (this.playingPostId !== data.post.id) {
      data.post.currentTime = data.video.currentTime;
    }
  }

  onMetadataLoaded(data: { post: ExplorePost; video: HTMLVideoElement }) {
    data.post.duration = data.video.duration;
  }

  onSeekTo(data: { event: MouseEvent; post: ExplorePost; video: HTMLVideoElement }) {
    data.event.stopPropagation();
    const container = data.event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = data.event.clientX - rect.left;
    const percentage = x / rect.width;
    data.video.currentTime = percentage * (data.post.duration || 0);
    data.post.currentTime = data.video.currentTime;
  }

  togglePlay(data: { post: ExplorePost; video: HTMLVideoElement }) {
    if (this.playingPostId === data.post.id) {
      data.video.pause();
      this.playingPostId = null;
      this.stopProgressLoop();
    } else {
      data.video.play();
      this.playingPostId = data.post.id;
      this.startProgressLoop(data.post, data.video);
    }
  }

  toggleMute(data: { event: MouseEvent; video: HTMLVideoElement }) {
    data.event.stopPropagation();
    data.video.muted = !data.video.muted;
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
    this.activePostForComments = post;
  }
  closeComments() {
    this.activePostForComments = null;
  }
  postComment() {
    if (!this.newCommentText.trim()) return;

    const newComment = {
      id: Date.now(),
      username: 'Player_1',
      text: this.newCommentText,
      timeAgo: 'Just now'
    };

    this.mockComments.unshift(newComment);
    this.newCommentText = '';

    if (this.activePostForComments) {
      this.activePostForComments.comments++;
    }
  }
}
