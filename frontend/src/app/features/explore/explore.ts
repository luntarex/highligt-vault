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
  replyingToComment: any | null = null;

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
          if (postId) {
            this.playingPostId = postId;
            const post = this.feed.find(p => p.id === postId);
            if (post) {
              const start = post.startTime || 0;
              let end = post.endTime;
              if (end === undefined || end === null || end === 0) {
                end = video.duration && !isNaN(video.duration) ? video.duration : Number.MAX_VALUE;
              }

              if (video.currentTime < start || ((end - start) > 0.1 && video.currentTime >= end)) {
                video.currentTime = start;
              }

              video.play().catch(() => {});
              this.startProgressLoop(post, video);
            }
          } else {
            video.play().catch(() => {});
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
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const start = data.post.startTime || 0;
    const end = data.post.endTime || data.video.duration || 1;
    const durationRange = end - start;

    const newTime = start + (percentage * durationRange);

    data.video.currentTime = newTime;
    data.post.currentTime = newTime;
  }

  togglePlay(data: { post: ExplorePost; video: HTMLVideoElement }) {
    if (this.playingPostId === data.post.id) {
      data.video.pause();
      this.playingPostId = null;
      this.stopProgressLoop();
    } else {
      const start = data.post.startTime || 0;
      let end = data.post.endTime;
      if (end === undefined || end === null || end === 0) {
        end = data.video.duration && !isNaN(data.video.duration) ? data.video.duration : Number.MAX_VALUE;
      }

      if (data.video.currentTime < start || ((end - start) > 0.1 && data.video.currentTime >= end)) {
        data.video.currentTime = start;
      }

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

      const start = post.startTime || 0;
      let end = post.endTime;
      if (end === undefined || end === null || end === 0) {
        end = video.duration && !isNaN(video.duration) ? video.duration : Number.MAX_VALUE;
      }

      // Prevent infinite 0-length loop which freezes the browser
      if ((end - start) > 0.1 && video.currentTime >= end) {
        video.currentTime = start;
        video.play().catch(e => console.error("Replay error", e));
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
    this.cdr.detectChanges();
    this.commentService.getCommentsByPostId(post.id).subscribe(data => {
      const allComments = data.map((c: any) => ({
        id: c.id,
        userId: c.userId,
        username: c.username,
        profilePhoto: c.profilePhoto,
        text: c.content,
        timeAgo: this.formatTimeAgo(c.created_at),
        parentCommentId: c.parentCommentId,
        replies: []
      }));

      const topLevel: any[] = [];
      const parentMap = new Map();
      allComments.forEach((c: any) => parentMap.set(c.id, c));

      allComments.forEach((c: any) => {
        c.cleanText = c.text;

        if (c.parentCommentId) {
          const directParent = parentMap.get(c.parentCommentId);
          if (directParent) {
            c.replyTargetUserId = directParent.userId;
            c.replyTargetUsername = directParent.username;

            const tag = `@${directParent.username} `;
            if (c.text.startsWith(tag)) {
              c.cleanText = c.text.substring(tag.length);
            }
          }

          let root = directParent;
          while (root && root.parentCommentId) {
            root = parentMap.get(root.parentCommentId);
          }
          if (root) {
            root.replies.push(c);
          } else {
            topLevel.push(c);
          }
        } else {
          topLevel.push(c);
        }
      });

      topLevel.forEach(c => c.replies.reverse());

      this.comments = topLevel;
      this.cdr.detectChanges();
    });
  }

  closeComments() {
    this.activePostForComments = null;
    this.editingCommentId = null;
    this.replyingToComment = null;
    this.comments = [];
  }

  setReplyTo(comment: any) {
    this.replyingToComment = comment;
    this.newCommentText = `@${comment.username} `;

    setTimeout(() => {
      const input = document.querySelector('.comment-input') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }

  cancelReply() {
    if (this.replyingToComment && this.newCommentText === `@${this.replyingToComment.username} `) {
      this.newCommentText = '';
    }
    this.replyingToComment = null;
  }

  postComment() {
    if (!this.newCommentText.trim() || !this.activePostForComments) return;

    const postId = this.activePostForComments.id;
    const userId = this.authService.getCurrentUserId();
    const content = this.newCommentText.trim();
    const parentId = this.replyingToComment ? this.replyingToComment.id : undefined;

    this.commentService.addComment(postId, userId, content, parentId).subscribe((res: any) => {
      const username = localStorage.getItem('username') || 'You';
      const currentUserPhoto = localStorage.getItem('profile_photo_url') || '';
      let replyTargetUserId = undefined;
      let replyTargetUsername = undefined;
      let cleanText = content;

      if (this.replyingToComment) {
        replyTargetUserId = this.replyingToComment.userId;
        replyTargetUsername = this.replyingToComment.username;
        const tag = `@${replyTargetUsername} `;
        if (content.startsWith(tag)) {
          cleanText = content.substring(tag.length);
        }
      }

      const newCmnt = {
        id: res.id,
        userId: userId,
        username: username,
        profilePhoto: currentUserPhoto,
        text: content,
        cleanText: cleanText,
        timeAgo: 'Just now',
        parentCommentId: parentId,
        replyTargetUserId: replyTargetUserId,
        replyTargetUsername: replyTargetUsername,
        replies: []
      };

      if (this.replyingToComment) {
        let parentFound = false;
        this.comments.forEach(rootCmnt => {
          if (rootCmnt.id === parentId || rootCmnt.replies.some((r: any) => r.id === parentId)) {
            rootCmnt.replies.push(newCmnt);
            parentFound = true;
          }
        });
        if (!parentFound) {
            this.comments.unshift(newCmnt);
        }
      } else {
        this.comments.unshift(newCmnt);
      }

      this.newCommentText = '';
      this.replyingToComment = null;
      if (this.activePostForComments) {
        this.activePostForComments.comments++;
      }
      this.cdr.detectChanges();
    });
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

  get currentUserPhoto(): string {
    return localStorage.getItem('profile_photo_url') || '';
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
