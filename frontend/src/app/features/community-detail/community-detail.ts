import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Community } from '../../core/models/community';
import { ExplorePost } from '../../core/models/explore-post';
import { AuthService } from '../../core/services/auth.service';
import { CommunityService } from '../../core/services/community.service';
import { ExploreService } from '../../core/services/explore.service';
import { ToastService } from '../../core/services/toast.service';
import { UploadService } from '../../core/services/upload.service';
import { ClipService } from '../../core/services/clip.service';
import { CommentService } from '../../core/services/comment.service';
import { UserService } from '../../core/services/user.service';
import { ProfileService } from '../../core/services/profile.service';
import { MessageService } from '../../core/services/message.service';
import { getSafeErrorMessage } from '../../core/utils/error-message';
import { BackLink } from '../../shared/back-link/back-link';
import { ExplorePostCard } from '../explore/explore-post-card/explore-post-card';
import { PostDetail } from '../post-detail/post-detail';
import { ProfileDropdown } from '../../shared/profile-dropdown/profile-dropdown';
import { ReportButtonComponent } from '../../shared/report-button/report-button';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { CommentsModalComponent } from '../../shared/comments-modal/comments-modal';
import { SharePanelComponent } from '../../shared/share-panel/share-panel';
import { RepostOverlayComponent } from '../../shared/repost-overlay/repost-overlay';

@Component({
  selector: 'app-community-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, BackLink, ExplorePostCard, PostDetail, ProfileDropdown, ReportButtonComponent, ConfirmDialog, CommentsModalComponent, SharePanelComponent, RepostOverlayComponent, RouterLink],
  templateUrl: './community-detail.html',
  styleUrl: './community-detail.css'
})
export class CommunityDetail implements OnInit {
  community: Community | null = null;
  posts: ExplorePost[] = [];
  isLoading = true;
  isPostsLoading = true;
  isSubmitting = false;
  isCreatingPost = false;
  isEditModalOpen = false;
  isUploadingThumbnail = false;
  playingPostId: string | null = null;
  editForm = {
    name: '',
    description: '',
    rules: '',
    thumbnailUrl: ''
  };
  editThumbnailFile: File | null = null;
  editThumbnailPreview = '';
  editingPostId: string | null = null;
  editingPostTitle = '';
  newPostText = '';

  activePostForComments: ExplorePost | null = null;
  currentUserPhotoUrl: string = localStorage.getItem('profile_photo_url') || 'assets/icons/profile-pic.svg';

  isCommunityOptionsOpen = false;

  @HostListener('document:click')
  onDocumentClick() {
    this.isCommunityOptionsOpen = false;
  }

  toggleCommunityOptions(event: MouseEvent) {
    event.stopPropagation();
    this.isCommunityOptionsOpen = !this.isCommunityOptionsOpen;
    this.cdr.detectChanges();
  }

  isRepostModalOpen = false;
  postToRepost: ExplorePost | null = null;
  isReposting = false;
  isRepostPanelOpen = false;
  repostPanelPosition: Record<string, string> = {};

  selectedMediaFile: File | null = null;
  mediaPreviewUrl: string = '';
  isVideo: boolean = false;
  isDragging: boolean = false;

  isSharePanelOpen = false;
  postToShare: ExplorePost | null = null;
  selectedPostDetailId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private communityService: CommunityService,
    private exploreService: ExploreService,
    private uploadService: UploadService,
    private clipService: ClipService,
    public authService: AuthService,
    private commentService: CommentService,
    private userService: UserService,
    private profileService: ProfileService,
    private messageService: MessageService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.authService.userPhoto$.subscribe(url => {
      this.currentUserPhotoUrl = url || 'assets/icons/profile-pic.svg';
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const communityId = Number(params.get('id'));
      if (!Number.isFinite(communityId)) {
        this.router.navigate(['/communities']);
        return;
      }
      this.loadCommunity(communityId);
      this.loadPosts(communityId);
    });
  }

  loadCommunity(id: number): void {
    this.isLoading = true;
    this.communityService.getCommunity(id).subscribe({
      next: (community) => {
        this.community = community;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not load community.'));
        this.router.navigate(['/communities']);
      }
    });
  }

  sortFilter: 'new' | 'best' = 'new';

  loadPosts(id: number): void {
    this.isPostsLoading = true;
    this.communityService.getCommunityPosts(id).subscribe({
      next: (posts) => {
        this.posts = (posts || []).map(post => ({
          ...post,
          timeAgo: this.formatTimeAgo(post.createdAt),
          currentTime: 0,
          duration: post.duration || 0
        }));
        this.applySort();
        this.isPostsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isPostsLoading = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not load community posts.'));
        this.cdr.detectChanges();
      }
    });
  }

  setSortFilter(filter: 'new' | 'best'): void {
    if (this.sortFilter === filter) return;
    this.sortFilter = filter;
    this.applySort();
    this.cdr.detectChanges();
  }

  private applySort(): void {
    if (this.sortFilter === 'best') {
      this.posts.sort((a, b) => {
        const scoreA = (a.likes || 0) + (a.comments || 0);
        const scoreB = (b.likes || 0) + (b.comments || 0);
        return scoreB - scoreA;
      });
    } else {
      // sort by new
      this.posts.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }
  }

  toggleJoin(): void {
    if (!this.community || this.isSubmitting) return;

    this.isSubmitting = true;
    const request = this.community.joined
      ? this.communityService.leaveCommunity(this.community.id)
      : this.communityService.joinCommunity(this.community.id);

    request.subscribe({
      next: () => {
        if (!this.community) return;
        this.community.joined = !this.community.joined;
        this.community.memberCount += this.community.joined ? 1 : -1;
        this.community.viewerRole = this.community.joined ? (this.community.viewerRole || 'MEMBER') : undefined;
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not update membership.'));
        this.cdr.detectChanges();
      }
    });
  }

  canManageCommunity(): boolean {
    const role = this.community?.viewerRole;
    return this.authService.isAdmin() || role === 'OWNER' || role === 'ADMIN' || role === 'MODERATOR';
  }

  canDeleteCommunity(): boolean {
    if (!this.community) return false;
    if (this.authService.isAdmin()) return true;
    if (this.community.type === 'GAME') return false;
    return this.community.viewerRole === 'OWNER'
      || this.community.founderId === this.authService.getCurrentUserId();
  }

  showDeleteConfirm = false;

  deleteCommunity(): void {
    if (!this.community || !this.canDeleteCommunity() || this.isSubmitting) return;
    this.showDeleteConfirm = true;
  }

  confirmDeleteCommunity(): void {
    if (!this.community || this.isSubmitting) return;
    this.isSubmitting = true;
    this.showDeleteConfirm = false;
    this.communityService.deleteCommunity(this.community.id).subscribe({
      next: () => {
        this.toast.success('Community deleted.');
        this.router.navigate(['/communities']);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not delete community.'));
        this.cdr.detectChanges();
      }
    });
  }

  openPostDetail(postId: string | number | undefined | null, event?: Event): void {
    event?.stopPropagation();
    if (!postId) return;
    this.selectedPostDetailId = String(postId);
    this.cdr.detectChanges();
  }

  closePostDetail(): void {
    this.selectedPostDetailId = null;
    this.cdr.detectChanges();
  }

  openEditModal(): void {
    if (!this.community || !this.canManageCommunity()) return;
    this.editForm = {
      name: this.community.name,
      description: this.community.description || '',
      rules: this.community.rules || this.defaultRulesText(),
      thumbnailUrl: this.community.thumbnailUrl || ''
    };
    this.editThumbnailFile = null;
    this.editThumbnailPreview = this.community.thumbnailUrl || '';
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    if (this.isSubmitting || this.isUploadingThumbnail) return;
    this.isEditModalOpen = false;
    this.editThumbnailFile = null;
    this.editThumbnailPreview = '';
  }

  onEditThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.editThumbnailFile = file;
    if (this.editThumbnailPreview && this.editThumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(this.editThumbnailPreview);
    }
    this.editThumbnailPreview = URL.createObjectURL(file);
    input.value = '';
    this.cdr.detectChanges();
  }

  saveCommunity(): void {
    if (!this.community || !this.editForm.name.trim() || this.isSubmitting) return;

    this.isSubmitting = true;
    if (this.editThumbnailFile) {
      this.isUploadingThumbnail = true;
      this.uploadService.uploadImage(this.editThumbnailFile).subscribe({
        next: (upload) => {
          this.isUploadingThumbnail = false;
          this.submitCommunityUpdate(upload.secureUrl);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.isUploadingThumbnail = false;
          this.toast.error(getSafeErrorMessage(err, 'Image upload failed. Please try again.'));
          this.cdr.detectChanges();
        }
      });
      return;
    }

    this.submitCommunityUpdate(this.editForm.thumbnailUrl);
  }

  startEditingPost(post: ExplorePost): void {
    if (!this.canManageCommunity()) return;
    this.editingPostId = post.id;
    this.editingPostTitle = post.title;
  }

  cancelEditingPost(): void {
    this.editingPostId = null;
    this.editingPostTitle = '';
  }

  savePostTitle(post: ExplorePost): void {
    const caption = this.editingPostTitle.trim();
    if (!caption) return;

    this.exploreService.updatePost({ id: post.id, caption }).subscribe({
      next: () => {
        post.title = caption;
        this.cancelEditingPost();
        this.toast.success('Post updated.');
        this.cdr.detectChanges();
      },
      error: (err) => this.toast.error(getSafeErrorMessage(err, 'Could not update post.'))
    });
  }

  deletePost(post: ExplorePost): void {
    if (!this.canManageCommunity()) return;
    this.exploreService.deletePost(post.id).subscribe({
      next: () => {
        this.posts = this.posts.filter(item => item.id !== post.id);
        if (this.community && this.community.postCount) {
          this.community.postCount--;
        }
        this.toast.success('Post deleted.');
        this.cdr.detectChanges();
      },
      error: (err) => this.toast.error(getSafeErrorMessage(err, 'Could not delete post.'))
    });
  }

  createCommunityPost(): void {
    if (!this.community || (!this.newPostText.trim() && !this.selectedMediaFile) || this.isCreatingPost) return;

    this.isCreatingPost = true;

    if (this.selectedMediaFile) {
      if (this.isVideo) {
        this.clipService.uploadVideo(this.selectedMediaFile).subscribe({
          next: (uploadRes) => {
            const clip = {
              title: this.newPostText.trim() || 'Community Video',
              videoUrl: uploadRes.secureUrl,
              thumbnailUrl: uploadRes.thumbnailUrl,
              duration: uploadRes.duration || 0,
              game: this.community!.name,
              visibilityStatus: 'PUBLIC',
              tags: []
            };
            this.clipService.addClip(clip as any).subscribe({
              next: (clipRes) => this.submitCommunityPost(this.newPostText.trim(), clipRes.clipId),
              error: (err) => {
                this.isCreatingPost = false;
                this.toast.error('Failed to save video clip.');
                this.cdr.detectChanges();
              }
            });
          },
          error: (err) => {
            this.isCreatingPost = false;
            this.toast.error('Failed to upload video.');
            this.cdr.detectChanges();
          }
        });
      } else {
        this.uploadService.uploadImage(this.selectedMediaFile).subscribe({
          next: (uploadRes) => {
            const clip = {
              title: this.newPostText.trim() || 'Community Image',
              videoUrl: uploadRes.secureUrl,
              thumbnailUrl: uploadRes.secureUrl,
              duration: 0,
              game: this.community!.name,
              visibilityStatus: 'PUBLIC',
              tags: []
            };
            this.clipService.addClip(clip as any).subscribe({
              next: (clipRes) => this.submitCommunityPost(this.newPostText.trim(), clipRes.clipId),
              error: (err) => {
                this.isCreatingPost = false;
                this.toast.error('Failed to save image clip.');
                this.cdr.detectChanges();
              }
            });
          },
          error: (err) => {
            this.isCreatingPost = false;
            this.toast.error('Failed to upload image.');
            this.cdr.detectChanges();
          }
        });
      }
    } else {
      this.submitCommunityPost(this.newPostText.trim());
    }
  }

  private submitCommunityPost(text: string, clipId?: number): void {
    this.communityService.createCommunityPost(this.community!.id, text, undefined, undefined, clipId).subscribe({
      next: (post) => {
        this.isCreatingPost = false;
        if (!post) {
          this.newPostText = '';
          this.removeMedia();
          this.toast.info('Post saved, but the media is waiting for moderation review.');
          this.cdr.detectChanges();
          return;
        }

        this.posts = [{
          ...post,
          timeAgo: 'Just now',
          currentTime: 0,
          duration: post.duration || 0
        }, ...this.posts];
        this.newPostText = '';
        this.removeMedia();
        if (this.community) {
          this.community.postCount = (this.community.postCount || 0) + 1;
        }
        this.toast.success('Post published.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isCreatingPost = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not publish post.'));
        this.cdr.detectChanges();
      }
    });
  }

  onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  private handleFile(file: File): void {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      this.selectedMediaFile = file;
      this.isVideo = file.type.startsWith('video/');
      if (this.mediaPreviewUrl) {
        URL.revokeObjectURL(this.mediaPreviewUrl);
      }
      this.mediaPreviewUrl = URL.createObjectURL(file);
      this.cdr.detectChanges();
    } else {
      this.toast.error('Please select a valid image or video file.');
    }
  }

  removeMedia(): void {
    this.selectedMediaFile = null;
    if (this.mediaPreviewUrl) {
      URL.revokeObjectURL(this.mediaPreviewUrl);
      this.mediaPreviewUrl = '';
    }
    this.isVideo = false;
    this.cdr.detectChanges();
  }

  toggleSharePanel(event: MouseEvent, post?: ExplorePost) {
    event.stopPropagation();
    this.isSharePanelOpen = !this.isSharePanelOpen;
    if (this.isSharePanelOpen && post) {
      this.isRepostPanelOpen = false;
      this.postToShare = post;
    } else {
      this.postToShare = null;
    }
    this.cdr.detectChanges();
  }

  openRepostModal(post: ExplorePost, event?: MouseEvent) {
    this.isSharePanelOpen = false;
    this.postToRepost = post;
    if (event) {
      this.repostPanelPosition = this.getRepostPanelPosition(event);
    }
    this.isRepostPanelOpen = true;
    this.cdr.detectChanges();
  }

  closeRepostPanel() {
    this.isRepostPanelOpen = false;
    this.postToRepost = null;
    this.cdr.detectChanges();
  }

  toggleRepostPanel(event: MouseEvent, post: ExplorePost) {
    event.stopPropagation();
    if (this.isRepostPanelOpen && this.postToRepost?.id === post.id) {
      this.closeRepostPanel();
    } else {
      this.openRepostModal(post, event);
    }
  }

  openMediaRepostPanel(payload: { post: ExplorePost; event: MouseEvent }): void {
    this.openRepostModal(payload.post, payload.event);
  }


  handleOverlaySubmit(event: { mode: 'SELECT' | 'QUOTE', text: string, mediaFile: File | null }) {
    if (!this.community || !this.postToRepost || this.isReposting) return;
    this.isReposting = true;
    
    this.communityService.createCommunityPost(
      this.community.id, 
      event.mode === 'QUOTE' ? event.text.trim() : '', 
      this.postToRepost.id, 
      event.mode
    ).subscribe({
      next: (post) => {
        this.closeRepostPanel();
        if (post) {
          this.posts = [{
            ...post,
            timeAgo: 'Just now',
            currentTime: 0,
            duration: post.duration || 0
          }, ...this.posts];
          if (this.community) {
            this.community.postCount = (this.community.postCount || 0) + 1;
          }
        }
        this.isReposting = false;
        this.toast.success('Post shared.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isReposting = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not share post.'));
        this.cdr.detectChanges();
      }
    });
  }

  togglePlay(data: { post: ExplorePost; video: HTMLVideoElement }): void {
    if (this.playingPostId === data.post.id) {
      data.video.pause();
      this.playingPostId = null;
      return;
    }

    data.video.play().catch(() => {});
    this.playingPostId = data.post.id;
  }

  toggleLike(post: ExplorePost): void {
    const userId = this.authService.getCurrentUserId();
    if (post.isLiked) {
      post.isLiked = false;
      post.likes--;
      this.exploreService.unlikePost(post.id, userId).subscribe();
      return;
    }

    post.isLiked = true;
    post.likes++;
    this.exploreService.likePost(post.id, userId).subscribe();
  }

  toggleFavorite(post: ExplorePost): void {
    if (!post.clipId) return;
    const userId = this.authService.getCurrentUserId();
    if (post.isFavorited) {
      post.isFavorited = false;
      this.exploreService.unfavoriteClip(post.clipId, userId).subscribe();
      return;
    }

    post.isFavorited = true;
    this.exploreService.favoriteClip(post.clipId, userId).subscribe();
  }

  openComments(post: ExplorePost) {
    this.activePostForComments = post;
    this.cdr.detectChanges();
  }

  closeComments() {
    this.activePostForComments = null;
    this.cdr.detectChanges();
  }

  isImageMedia(post: ExplorePost | null | undefined): boolean {
    const url = post?.videoUrl || '';
    if (!url) return false;

    if (this.isKnownImageUrl(url)) return true;
    if (this.isKnownVideoUrl(url)) return false;

    return post?.postType === 'CLIP' && Number(post.duration || 0) === 0;
  }

  communityLabelForPost(post: ExplorePost | null | undefined): string {
    return post?.communityName || 'Community';
  }

  currentUserPhoto(): string {
    return this.currentUserPhotoUrl;
  }

  onToggleMute(data: { event: MouseEvent; video: HTMLVideoElement }): void {
    data.event.stopPropagation();
    data.video.muted = !data.video.muted;
  }

  onSeekTo(data: { event: MouseEvent; post: ExplorePost; video: HTMLVideoElement }): void {
    data.event.stopPropagation();
    const bar = data.event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (data.event.clientX - rect.left) / rect.width));
    const start = data.post.startTime || 0;
    const end = data.post.endTime || data.video.duration || data.post.duration || 1;
    data.video.currentTime = start + percentage * (end - start);
  }

  onTimeUpdate(data: { post: ExplorePost; video: HTMLVideoElement }): void {
    data.post.currentTime = data.video.currentTime;
  }

  onMetadataLoaded(data: { post: ExplorePost; video: HTMLVideoElement }): void {
    data.post.duration = data.video.duration;
  }

  defaultThumbnail(): string {
    return this.community?.type === 'GAME'
      ? 'assets/icons/compass.svg'
      : 'assets/icons/comments.svg';
  }

  communityTypeLabel(): string {
    return this.community?.type === 'GAME' ? 'Game community' : 'User-made community';
  }

  rulesList(): string[] {
    return (this.community?.rules || this.defaultRulesText())
      .split(/\r?\n/)
      .map(rule => rule.trim())
      .filter(Boolean);
  }

  private submitCommunityUpdate(thumbnailUrl: string): void {
    if (!this.community) return;
    this.communityService.updateCommunity(this.community.id, {
      name: this.editForm.name.trim(),
      description: this.editForm.description.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      rules: this.editForm.rules.trim()
    }).subscribe({
      next: (community) => {
        this.community = community;
        this.isSubmitting = false;
        this.isEditModalOpen = false;
        this.editThumbnailFile = null;
        this.editThumbnailPreview = '';
        this.toast.success('Community updated.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not update community.'));
        this.cdr.detectChanges();
      }
    });
  }

  private defaultRulesText(): string {
    return [
      'Keep posts relevant to the community.',
      'Respect other players.',
      'No spam or misleading content.'
    ].join('\n');
  }

  private formatTimeAgo(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  }

  private isKnownImageUrl(url: string): boolean {
    return /\/image\/upload\//i.test(url) || /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(url);
  }

  private isKnownVideoUrl(url: string): boolean {
    return /\/video\/upload\//i.test(url) || /\.(m3u8|mov|mp4|mpeg|mpg|ogg|ogv|webm)(?:$|[?#])/i.test(url);
  }

  private resetRepostState(): void {
    this.isReposting = false;
    this.isRepostPanelOpen = false;
    this.isRepostModalOpen = false;
    this.postToRepost = null;
    this.repostPanelPosition = {};
  }

  private getRepostPanelPosition(event: MouseEvent): Record<string, string> {
    const trigger = event.currentTarget as HTMLElement | null;
    const rect = trigger?.getBoundingClientRect();
    const panelWidth = 200;
    const panelHeight = 108;
    const gap = 10;

    if (!rect) {
      return {};
    }

    const left = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, rect.left));
    const top = rect.top > panelHeight + gap + 12
      ? rect.top - panelHeight - gap
      : rect.bottom + gap;

    return {
      left: `${left}px`,
      top: `${Math.max(12, top)}px`
    };
  }
}
