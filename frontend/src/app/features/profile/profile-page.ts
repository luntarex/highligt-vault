import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { User } from '../../core/models/user';
import { Clip } from '../../core/models/clip';
import { BackLink } from '../../shared/back-link/back-link';
import { NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { CustomUpload } from '../../shared/custom-upload/custom-upload';
import { AuthService } from '../../core/services/auth.service';
import { ExploreService } from '../../core/services/explore.service';
import { CommentService } from '../../core/services/comment.service';
import { ExplorePost } from '../../core/models/explore-post';
import { Comment } from '../../core/models/comment';
import { ActivatedRoute, RouterModule, RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [BackLink, NgClass, CommonModule, CustomUpload, RouterModule, RouterLink, FormsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {

  user: User | null = null;
  favoriteClips: Clip[] = [];
  showUploadModal: boolean = false;
  currentProfileId: string | null = null;
  isFollowing: boolean = false;
  isOwnProfile: boolean = false;

  userList: any[] = [];
  modalTitle: string = '';
  modalLoading: boolean = false;
  showUserListModal: boolean = false;

  // Clip Detail Modal State
  showClipModal: boolean = false;
  activePost: ExplorePost | null = null;
  comments: Comment[] = [];
  newCommentText: string = '';
  replyingToComment: Comment | null = null;
  clipModalLoading: boolean = false;
  currentUserPhoto: string = '';

  constructor(
    private profileService: ProfileService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private authService: AuthService,
    private exploreService: ExploreService,
    private commentService: CommentService
  ) { }

  ngOnInit(): void {
    this.currentUserPhoto = localStorage.getItem('profile_photo_url') || '';
    this.route.paramMap.subscribe((params) => {
      this.currentProfileId = params.get('id');

      if (this.currentProfileId) {
        console.log('Loading profile for User ID:', this.currentProfileId);
      } else {
        console.log('No ID in URL. Loading the logged-in user profile.');
      }

      this.loadProfileData(this.currentProfileId);
    });
  }

  loadProfileData(id: string | null): void {
    const currentUserId = this.authService.getCurrentUserId();
    
    // Check if viewing own profile
    if (!id || id === currentUserId.toString()) {
      this.isOwnProfile = true;
    } else {
      this.isOwnProfile = false;
    }

    this.profileService.getUserProfile(id).subscribe({
      next: (profileData) => {
        console.log('Profile data received:', profileData);
        this.user = profileData;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
      }
    });
    this.profileService.getFavoriteClips(id).subscribe({
      next: (clipsData) => {
        this.favoriteClips = clipsData;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load clips:', err);
      }
    });

    if (id) {
      this.profileService.isFollowing(id).subscribe({
        next: (res) => {
          this.isFollowing = res.isFollowing;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to load follow status:', err)
      });
    }
  }

  toggleFollow(): void {
    if (!this.currentProfileId || !this.user) return;

    if (this.isFollowing) {
      this.profileService.unfollowUser(this.currentProfileId).subscribe({
        next: () => {
          this.isFollowing = false;
          if (this.user) {
            this.user.followers = (this.user.followers || 1) - 1;
          }
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to unfollow:', err)
      });
    } else {
      this.profileService.followUser(this.currentProfileId).subscribe({
        next: () => {
          this.isFollowing = true;
          if (this.user) {
            this.user.followers = (this.user.followers || 0) + 1;
          }
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to follow:', err)
      });
    }
  }


  addClips(): void {
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  formatTimeAgo(dateInput: Date | string): string {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y ago`;
  }

  // Follower/Following Modal Methods
  openFollowersModal(): void {
    if (!this.user || !this.user.id) return;
    this.modalTitle = 'Followers';
    this.showUserListModal = true;
    this.modalLoading = true;
    this.userList = [];
    
    this.profileService.getFollowers(this.user.id.toString()).subscribe({
      next: (list) => {
        this.userList = list;
        this.modalLoading = false;
        this.cdr.detectChanges();
      },
      error: () => this.modalLoading = false
    });
  }

  openFollowingModal(): void {
    if (!this.user || !this.user.id) return;
    this.modalTitle = 'Following';
    this.showUserListModal = true;
    this.modalLoading = true;
    this.userList = [];

    this.profileService.getFollowing(this.user.id.toString()).subscribe({
      next: (list) => {
        this.userList = list;
        this.modalLoading = false;
        this.cdr.detectChanges();
      },
      error: () => this.modalLoading = false
    });
  }

  closeUserListModal(): void {
    this.showUserListModal = false;
    this.userList = [];
  }

  sendMessage(userId: number): void {
    this.router.navigate(['/messages', { userId: userId }]);
  }

  // Clip Detail Modal Actions
  openClipDetailModal(clipId: number): void {
    const currentUserId = this.authService.getCurrentUserId();
    this.showClipModal = true;
    this.clipModalLoading = true;
    this.activePost = null;
    this.comments = [];
    this.cdr.detectChanges();

    this.exploreService.getPostByClipId(clipId, currentUserId).subscribe({
      next: (post) => {
        this.activePost = post;
        this.loadComments(post.id);
        this.clipModalLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load clip post details:', err);
        // Fallback or show error
        this.clipModalLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeClipModal(): void {
    this.showClipModal = false;
    this.activePost = null;
    this.comments = [];
    this.newCommentText = '';
    this.replyingToComment = null;
  }

  loadComments(postId: string): void {
    this.commentService.getCommentsByPostId(postId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.cdr.detectChanges();
      }
    });
  }

  togglePostLike(): void {
    if (!this.activePost) return;
    const currentUserId = this.authService.getCurrentUserId();
    
    if (this.activePost.isLiked) {
      this.exploreService.unlikePost(this.activePost.id, currentUserId).subscribe(() => {
        this.activePost!.isLiked = false;
        this.activePost!.likes--;
        this.cdr.detectChanges();
      });
    } else {
      this.exploreService.likePost(this.activePost.id, currentUserId).subscribe(() => {
        this.activePost!.isLiked = true;
        this.activePost!.likes++;
        this.cdr.detectChanges();
      });
    }
  }

  postComment(): void {
    if (!this.activePost || !this.newCommentText.trim()) return;
    const currentUserId = this.authService.getCurrentUserId();

    this.commentService.addComment(
      this.activePost.id, 
      currentUserId, 
      this.newCommentText, 
      this.replyingToComment?.id
    ).subscribe(() => {
      this.newCommentText = '';
      this.replyingToComment = null;
      this.loadComments(this.activePost!.id);
      this.activePost!.comments++;
      this.cdr.detectChanges();
    });
  }

  setReplyTo(comment: Comment): void {
    this.replyingToComment = comment;
  }

  cancelReply(): void {
    this.replyingToComment = null;
  }

  deleteComment(comment: Comment): void {
    this.commentService.removeComment(comment.id).subscribe(() => {
      this.loadComments(this.activePost!.id);
      this.activePost!.comments--;
      this.cdr.detectChanges();
    });
  }

  canEditComment(comment: Comment): boolean {
    const currentUserId = this.authService.getCurrentUserId();
    return comment.userId === currentUserId || this.authService.isAdmin();
  }
}
