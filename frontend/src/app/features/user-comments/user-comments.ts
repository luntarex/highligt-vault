import { User } from './../../core/models/user';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BackLink } from '../../shared/back-link/back-link';
import { CommentService } from '../../core/services/comment.service';
import { ActivatedRoute } from '@angular/router';
import { Comment } from '../../core/models/comment';
import { UserService } from '../../core/services/user.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { isNumericId } from '../../core/utils/slug.util';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';
import { ExplorePostCard } from '../explore/explore-post-card/explore-post-card';
import { ExplorePost } from '../../core/models/explore-post';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-user-comments',
  imports: [BackLink, CommonModule, ExplorePostCard, TranslocoModule],
  templateUrl: './user-comments.html',
  styleUrl: './user-comments.css',
})
export class UserComments implements OnInit {
  comments: Comment[] = [];
  userId!: number;
  user : User|null = null;
  isAdmin: boolean = false;
  showModerateModal: boolean = false;
  commentToModerate: Comment | null = null;
  tosViolationText: string = '[This comment is deleted by an admin because of a TOS violation]';

  playingPostId: string | null = null;
  private animationFrameId: number | null = null;

  constructor(
    private commentService: CommentService,
    private route: ActivatedRoute,
    private userService: UserService,
    private profileService: ProfileService,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();

    const param = this.route.snapshot.paramMap.get('userId');
    // Username slug (/user-comments/murat) -> resolve to id; bare numeric ids work directly.
    if (param && !isNumericId(param)) {
      this.profileService.getUserByUsername(param).subscribe((user) => {
        if (user) this.loadForUser(Number(user.id));
      });
      return;
    }
    this.loadForUser(param ? Number(param) : 0);
  }

  private loadForUser(userId: number): void {
    this.userId = userId;

    this.commentService.getCommentsByUserId(this.userId).subscribe((comments) => {
      this.comments = comments.map(c => ({
        ...c,
        currentTime: 0,
        duration: 0
      }));
      this.cdr.detectChanges();
    });

    this.userService.getUserById(this.userId).subscribe((user) => {
      this.user = user;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.stopProgressLoop();
  }

  convertToExplorePost(comment: Comment): ExplorePost {
    return {
      id: comment.postId,
      author: {
        id: comment.postAuthorId || 0,
        username: comment.postAuthorName || 'Unknown',
        profilePhotoUrl: comment.postAuthorPhoto || ''
      },
      title: comment.postTitle || 'Untitled Post',
      videoUrl: comment.postVideoUrl || '',
      game: comment.postGameName || 'Unknown',
      likes: 0,
      comments: 0,
      isLiked: false,
      tags: [],
      duration: comment.postDuration || (comment as any).duration,
      startTime: comment.postStartTime,
      endTime: comment.postEndTime,
      clipId: comment.postId,
      currentTime: (comment as any).currentTime
    };
  }

  handleTogglePlay(data: { post: ExplorePost; video: HTMLVideoElement }) {
    if (this.playingPostId === data.post.id) {
      data.video.pause();
      this.playingPostId = null;
      this.stopProgressLoop();
    } else {
      // Find the comment object to update its local state
      const comment = this.comments.find(c => c.postId === data.post.id);
      
      // Pause all other videos
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => v.pause());
      
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
      if (comment) {
        this.startProgressLoop(comment, data.video);
      }
    }
  }

  onTimeUpdate(data: { post: ExplorePost; video: HTMLVideoElement }) {
    if (this.playingPostId !== data.post.id) {
      const comment = this.comments.find(c => c.postId === data.post.id);
      if (comment) {
        (comment as any).currentTime = data.video.currentTime;
      }
    }
  }

  onMetadataLoaded(data: { post: ExplorePost; video: HTMLVideoElement }) {
    const comment = this.comments.find(c => c.postId === data.post.id);
    if (comment) {
      (comment as any).duration = data.video.duration;
    }
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
    const comment = this.comments.find(c => c.postId === data.post.id);
    if (comment) {
      (comment as any).currentTime = newTime;
    }
  }

  handleToggleMute(data: { event: MouseEvent; video: HTMLVideoElement }) {
    data.event.stopPropagation();
    data.video.muted = !data.video.muted;
  }

  private startProgressLoop(comment: any, video: HTMLVideoElement) {
    this.stopProgressLoop();
    const update = () => {
      comment.currentTime = video.currentTime;

      const start = comment.postStartTime || 0;
      let end = comment.postEndTime;
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

  isTosViolation(content: string): boolean {
    return content === this.tosViolationText;
  }

  openModerateModal(comment: Comment): void {
    this.commentToModerate = comment;
    this.showModerateModal = true;
    this.cdr.detectChanges();
  }

  closeModerateModal(): void {
    this.showModerateModal = false;
    this.commentToModerate = null;
    this.cdr.detectChanges();
  }

  moderateDelete(): void {
    if (!this.commentToModerate) return;
    this.commentService.removeCommentViolation(this.commentToModerate.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== this.commentToModerate?.id);
        this.toast.success('Comment removed and archived (Hard Delete).');
        this.closeModerateModal();
      },
      error: () => this.toast.error('Failed to delete comment.')
    });
  }

  moderateTosViolation(): void {
    if (!this.commentToModerate) return;
    this.commentService.removeCommentViolation(this.commentToModerate.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== this.commentToModerate?.id);
        this.toast.success('Comment removed and archived for TOS violation.');
        this.closeModerateModal();
      },
      error: () => this.toast.error('Failed to moderate comment.')
    });
  }
}

