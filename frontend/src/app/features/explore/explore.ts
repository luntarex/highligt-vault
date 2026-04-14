import { Component, OnDestroy, OnInit, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ExplorePost } from '../../core/models/explore-post';
import { ExploreService } from '../../core/services/explore.service';
import { CommentService } from '../../core/services/comment.service';
import { RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { ExplorePostCard } from './explore-post-card/explore-post-card';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.html',
  styleUrls: ['./explore.css'],
  imports: [RouterLink, FormsModule, ExplorePostCard]
})
export class Explore implements OnInit, OnDestroy, AfterViewInit {
  activePostForComments: ExplorePost | null = null;
  newCommentText: string = '';

  comments: any[] = [];

  editingCommentId: number | null = null;
  editingCommentText: string = '';

  feed: ExplorePost[] = [];
  playingPostId: string | null = null;
  private animationFrameId: number | null = null;

  @ViewChildren(ExplorePostCard) postCards!: QueryList<ExplorePostCard>;
  private observer: IntersectionObserver | null = null;

  constructor(
    private exploreService: ExploreService,
    private commentService: CommentService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

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
    const userId = this.authService.getCurrentUserId();
    this.exploreService.getFeed(userId).subscribe((feedData) => {
      this.feed = feedData.map(post => ({
        ...post,
        currentTime: 0,
        duration: 0
      }));
      this.cdr.detectChanges();
    });
  }

  deletePost(post: ExplorePost) {
    this.exploreService.deletePost(post.id);
    this.feed = this.feed.filter(p => p.id !== post.id);
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
    const userId = this.authService.getCurrentUserId();
    if (post.isLiked) {
      // Unlike
      post.isLiked = false;
      post.likes--;
      this.exploreService.unlikePost(post.id, userId).subscribe();
    } else {
      // Like
      post.isLiked = true;
      post.likes++;
      this.exploreService.likePost(post.id, userId).subscribe();
    }
  }

  toggleFavorite(post: ExplorePost) {
    if (!post.clipId) return;
    const userId = this.authService.getCurrentUserId();
    if (post.isFavorited) {
      post.isFavorited = false;
      this.exploreService.unfavoriteClip(post.clipId, userId).subscribe();
    } else {
      post.isFavorited = true;
      this.exploreService.favoriteClip(post.clipId, userId).subscribe();
    }
  }

  openComments(post: ExplorePost) {
    this.activePostForComments = post;
    this.comments = [];
    this.commentService.getCommentsByPostId(post.id).subscribe(data => {
      this.comments = data.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        username: c.username,
        text: c.content,
        timeAgo: this.formatTimeAgo(c.created_at)
      }));
      this.cdr.detectChanges();
    });
  }

  closeComments() {
    this.activePostForComments = null;
    this.editingCommentId = null;
    this.comments = [];
  }

  postComment() {
    if (!this.newCommentText.trim() || !this.activePostForComments) return;

    const postId = this.activePostForComments.id;
    const userId = this.authService.getCurrentUserId();
    const content = this.newCommentText.trim();

    this.commentService.addComment(postId, userId, content).subscribe((res: any) => {
      const username = localStorage.getItem('username') || 'You';
      this.comments.unshift({
        id: res.id,
        userId: userId,
        username: username,
        text: content,
        timeAgo: 'Just now'
      });

      if (this.activePostForComments) {
        this.activePostForComments.comments++;
      }
      this.cdr.detectChanges();
    });

    this.newCommentText = '';
  }

  canEditComment(comment: any): boolean {
    return this.authService.isAdmin() || this.authService.getCurrentUserId() === comment.userId;
  }

  startEditingComment(comment: any) {
    this.editingCommentId = comment.id;
    this.editingCommentText = comment.text;
  }

  saveComment(comment: any) {
    if (this.editingCommentText.trim()) {
      this.commentService.updateComment(comment.id, this.editingCommentText.trim()).subscribe(() => {
        comment.text = this.editingCommentText.trim();
        this.editingCommentId = null;
        this.cdr.detectChanges();
      });
    }
  }

  deleteComment(comment: any) {
    this.commentService.removeComment(comment.id).subscribe(() => {
      this.comments = this.comments.filter(c => c.id !== comment.id);
      if (this.activePostForComments) {
        this.activePostForComments.comments--;
      }
      this.cdr.detectChanges();
    });
  }

  private formatTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  }
}
