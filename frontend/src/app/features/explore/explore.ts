import { Component, OnDestroy, OnInit, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ExplorePost } from '../../core/models/explore-post';
import { ExploreService } from '../../core/services/explore.service';
import { CommentService } from '../../core/services/comment.service';
import { RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { ExplorePostCard } from './explore-post-card/explore-post-card';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { CommonModule } from '@angular/common';
import { ProfileDropdown } from '../../shared/profile-dropdown/profile-dropdown';
import { ReportButtonComponent } from '../../shared/report-button/report-button';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.html',
  styleUrls: ['./explore.css'],
  imports: [RouterLink, FormsModule, ExplorePostCard, CommonModule, ProfileDropdown, ReportButtonComponent]
})
export class Explore implements OnInit, OnDestroy, AfterViewInit {
  activePostForComments: ExplorePost | null = null;
  newCommentText: string = '';
  replyingToComment: any | null = null;

  comments: any[] = [];

  editingCommentId: number | null = null;
  editingCommentText: string = '';

  showModerateModal: boolean = false;
  commentToModerate: any | null = null;
  tosViolationText: string = '[This comment is deleted by an admin because of a TOS violation]';

  feed: ExplorePost[] = [];
  isLoading = true;
  playingPostId: string | null = null;
  private animationFrameId: number | null = null;
  private intersectingEntries = new Map<string, IntersectionObserverEntry>();

  @ViewChildren(ExplorePostCard) postCards!: QueryList<ExplorePostCard>;
  private observer: IntersectionObserver | null = null;

  currentUserPhotoUrl: string = '';

  constructor(
    private exploreService: ExploreService,
    private commentService: CommentService,
    public authService: AuthService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadServiceData();
    this.authService.userPhoto$.subscribe(url => {
      this.currentUserPhotoUrl = url;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: [0.2, 0.4, 0.6, 0.8]
    };

    this.observer = new IntersectionObserver((entries) => {
      // 1. Update our map of currently intersecting elements
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        const postId = video.getAttribute('data-post-id');
        if (postId) {
          if (entry.isIntersecting) {
            this.intersectingEntries.set(postId, entry);
          } else {
            this.intersectingEntries.delete(postId);
            video.pause();
            if (this.playingPostId === postId) {
              this.playingPostId = null;
              this.stopProgressLoop();
            }
          }
        }
      });

      // 2. Find the most visible video among the intersecting ones
      let bestPostId: string | null = null;
      let maxRatio = -1;

      this.intersectingEntries.forEach((entry, postId) => {
        if (entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          bestPostId = postId;
        }
      });

      // 3. Play the most visible and pause others
      if (bestPostId) {
        const winnerEntry = this.intersectingEntries.get(bestPostId)!;
        const winnerVideo = winnerEntry.target as HTMLVideoElement;
        const post = this.feed.find(p => p.id === bestPostId);

        if (post) {
          // If winner changed, pause the previous one
          if (this.playingPostId && this.playingPostId !== bestPostId) {
            const prevPlayingCard = this.postCards.find(c => c.post.id === this.playingPostId);
            prevPlayingCard?.videoElement?.pause();
          }

          this.playingPostId = bestPostId;

          if (winnerVideo.paused) {
            const start = post.startTime || 0;
            let end = post.endTime;
            if (end === undefined || end === null || end === 0) {
              end = winnerVideo.duration && !isNaN(winnerVideo.duration) ? winnerVideo.duration : Number.MAX_VALUE;
            }

            if (winnerVideo.currentTime < start || ((end - start) > 0.1 && winnerVideo.currentTime >= end)) {
              winnerVideo.currentTime = start;
            }

            winnerVideo.play().catch(() => {});
            this.startProgressLoop(post, winnerVideo);
          }
        }
      }

      // 4. Ensure non-winners that are in the map are paused
      this.intersectingEntries.forEach((entry, postId) => {
        if (postId !== bestPostId) {
          (entry.target as HTMLVideoElement).pause();
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
    this.isLoading = true;
    const userId = this.authService.getCurrentUserId();
    this.exploreService.getFeed(userId).subscribe((feedData) => {
      this.feed = feedData.map(post => ({
        ...post,
        currentTime: 0,
        duration: 0
      }));
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  deletePost(post: ExplorePost) {
    this.exploreService.deletePost(post.id).subscribe({
      next: () => {
        this.feed = this.feed.filter(p => p.id !== post.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete post:', err);
      }
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

    const currentUserId = this.authService.getCurrentUserId();
    this.userService.getUserById(currentUserId).subscribe(user => {
      if (user && user.profilePhotoUrl) {
        this.currentUserPhotoUrl = user.profilePhotoUrl;
      }
      this.cdr.detectChanges();
    });

    this.cdr.detectChanges();
    this.commentService.getCommentsByPostId(post.id).subscribe({
      next: (data: any[]) => {
        if (!data || !Array.isArray(data)) {
          this.comments = [];
          this.cdr.detectChanges();
          return;
        }

        const raw = (obj: any, key: string) => obj[key] !== undefined ? obj[key] : (obj[key.toUpperCase()] !== undefined ? obj[key.toUpperCase()] : obj[key.toLowerCase()]);

        const allMapped = data.map((c: any) => ({
          id: Number(raw(c, 'id')),
          userId: Number(raw(c, 'userId')),
          username: raw(c, 'username') || 'Unknown',
          profilePhoto: raw(c, 'profilePhoto'),
          text: raw(c, 'content') || '',
          cleanText: raw(c, 'content') || '',
          timeAgo: this.formatTimeAgo(raw(c, 'created_at')),
          parentCommentId: raw(c, 'parentCommentId') ? Number(raw(c, 'parentCommentId')) : null,
          replyTargetUserId: undefined as number | undefined,
          replyTargetUsername: undefined as string | undefined,
          replies: [] as any[]
        }));

        const parentMap = new Map();
        allMapped.forEach(c => parentMap.set(c.id, c));

        const topLevel: any[] = [];
        allMapped.forEach(c => {
          if (c.parentCommentId) {
            const parent = parentMap.get(c.parentCommentId);
            if (parent) {
              const tag = `@${parent.username} `;
              if (c.text.startsWith(tag)) {
                c.cleanText = c.text.substring(tag.length);
              }
              c.replyTargetUserId = parent.userId;
              c.replyTargetUsername = parent.username;

              let root = parent;
              while (root.parentCommentId && parentMap.has(root.parentCommentId)) {
                root = parentMap.get(root.parentCommentId);
              }
              root.replies.push(c);
            } else {
              topLevel.push(c);
            }
          } else {
            topLevel.push(c);
          }
        });

        topLevel.forEach(c => {
          c.replies = [...new Set(c.replies)];
          c.replies.reverse();
        });

        this.comments = topLevel;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Fetch comments error:', err);
        this.comments = [];
        this.cdr.detectChanges();
      }
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
      const currentUserPhoto = this.currentUserPhotoUrl;
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
        id: Number(res.id),
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
    if (this.isTosViolation(comment.text)) {
      return false;
    }
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
    const isCommentOwner = this.authService.getCurrentUserId() === comment.userId;
    const isPostOwner = this.activePostForComments && this.authService.getCurrentUserId() === this.activePostForComments.author.id;

    if (this.authService.isAdmin() && !isCommentOwner && !isPostOwner) {
       this.commentToModerate = comment;
       this.showModerateModal = true;
       this.cdr.detectChanges();
    } else {
       this.executeDeleteComment(comment);
    }
  }

  private executeDeleteComment(comment: any) {
    const targetId = Number(comment.id);
    this.commentService.removeComment(targetId).subscribe(() => {
      // Create a fresh array copy to trigger change detection
      const updatedComments = this.comments.filter(c => Number(c.id) !== targetId);

      updatedComments.forEach(c => {
        if (c.replies) {
           c.replies = c.replies.filter((r: any) => Number(r.id) !== targetId);
        }
      });

      this.comments = updatedComments;

      if (this.activePostForComments) {
        this.activePostForComments.comments--;
      }
      this.cdr.detectChanges();
    });
  }

  closeModerateModal(): void {
    this.showModerateModal = false;
    this.commentToModerate = null;
    this.cdr.detectChanges();
  }

  moderateDelete(): void {
    if (!this.commentToModerate) return;
    const targetId = Number(this.commentToModerate.id);
    this.commentService.removeCommentViolation(targetId).subscribe(() => {
        const updatedComments = this.comments.filter(c => Number(c.id) !== targetId);
        updatedComments.forEach(c => {
          if (c.replies) {
             c.replies = c.replies.filter((r: any) => Number(r.id) !== targetId);
          }
        });
        this.comments = updatedComments;
        if (this.activePostForComments) {
          this.activePostForComments.comments--;
        }
        this.closeModerateModal();
        this.cdr.detectChanges();
    });
  }

  moderateTosViolation(): void {
    if (!this.commentToModerate) return;
    const targetId = Number(this.commentToModerate.id);
    this.commentService.removeCommentViolation(targetId).subscribe({
      next: () => {
        const updatedComments = this.comments.filter(c => Number(c.id) !== targetId);
        updatedComments.forEach(c => {
          if (c.replies) {
             c.replies = c.replies.filter((r: any) => Number(r.id) !== targetId);
          }
        });
        this.comments = updatedComments;
        if (this.activePostForComments) {
          this.activePostForComments.comments--;
        }
        this.closeModerateModal();
        this.cdr.detectChanges();
      },
      error: () => console.error('Failed to moderate comment.')
    });
  }

  isTosViolation(content: string | undefined | null): boolean {
    if (!content) return false;
    return content === this.tosViolationText;
  }

  get currentUserPhoto(): string {
    return this.currentUserPhotoUrl;
  }

  private formatTimeAgo(dateStr: string): string {
    if (!dateStr) return '';

    // Ensure UTC interpretation: replace space with T and append Z if missing
    let isoStr = dateStr;
    if (isoStr && !isoStr.includes('T') && isoStr.includes(' ')) {
      isoStr = isoStr.replace(' ', 'T');
    }
    if (isoStr && !isoStr.endsWith('Z')) {
      isoStr += 'Z';
    }

    const date = new Date(isoStr);
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
