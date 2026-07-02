import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { User } from '../../core/models/user';
import { Clip } from '../../core/models/clip';
import { BackLink } from '../../shared/back-link/back-link';
import { NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { CustomUpload } from '../../shared/custom-upload/custom-upload';
import { AuthService } from '../../core/services/auth.service';
import { ExploreService } from '../../core/services/explore.service';
import { ActivatedRoute, RouterModule, RouterLink, Router } from '@angular/router';
import { ReportButtonComponent } from '../../shared/report-button/report-button';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { isNumericId, buildSlugId } from '../../core/utils/slug.util';
import { PostDetail } from '../post-detail/post-detail';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [BackLink, NgClass, CommonModule,RouterModule, RouterLink, FormsModule, ReportButtonComponent, TranslocoModule, PostDetail],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {

  user: User | null = null;
  favoriteClips: Clip[] = [];
  userClips: Clip[] = [];
  activeTab: 'posts' | 'favorites' = 'posts';
  showUploadModal: boolean = false;
  currentProfileId: string | null = null;
  isFollowing: boolean = false;
  isOwnProfile: boolean = false;
  isCardMenuOpen: boolean = false;

  userList: any[] = [];
  modalTitle: string = '';
  modalLoading: boolean = false;
  showUserListModal: boolean = false;

  // Clip Detail State — the shared post-detail component renders the modal
  selectedPostDetailId: string | number | null = null;
  clipModalLoading: boolean = false;

  @ViewChild('videoPlayer') videoRef?: ElementRef<HTMLVideoElement>;

  constructor(
    private profileService: ProfileService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private router: Router,
    public authService: AuthService,
    private exploreService: ExploreService,
    private transloco: TranslocoService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const param = params.get('id');

      // Username slug (e.g. /profile/murat): resolve to the numeric id first,
      // then run the existing id-based loading. Bare numeric ids (legacy URLs
      // and id-only links such as moderation) take the fast path unchanged.
      if (param && !isNumericId(param)) {
        this.profileService.getUserByUsername(param).subscribe({
          next: (user) => {
            if (!user) {
              this.loadProfileData(null);
              return;
            }
            this.currentProfileId = String(user.id);
            this.loadProfileData(this.currentProfileId);
          },
          error: () => this.loadProfileData(null)
        });
        return;
      }

      this.currentProfileId = param;
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
    this.profileService.getUserPosts(id).subscribe({
      next: (clipsData) => {
        this.userClips = clipsData;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load user posts:', err);
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

  toggleCardMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isCardMenuOpen = !this.isCardMenuOpen;
  }

  @HostListener('document:click')
  closeCardMenu(): void {
    if (this.isCardMenuOpen) {
      this.isCardMenuOpen = false;
      this.cdr.detectChanges();
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


  get displayedClips(): Clip[] {
    return this.activeTab === 'posts' ? this.userClips : this.favoriteClips;
  }

  setTab(tab: 'posts' | 'favorites'): void {
    this.activeTab = tab;
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

    if (diffInSeconds < 60) return this.transloco.translate('time.secondsAgo', { count: diffInSeconds });

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return this.transloco.translate('time.minutesAgo', { count: diffInMinutes });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return this.transloco.translate('time.hoursAgo', { count: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return this.transloco.translate('time.daysAgo', { count: diffInDays });

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return this.transloco.translate('time.monthsAgo', { count: diffInMonths });

    const diffInYears = Math.floor(diffInDays / 365);
    return this.transloco.translate('time.yearsAgo', { count: diffInYears });
  }

  // Follower/Following Modal Methods
  openFollowersModal(): void {
    if (!this.user || !this.user.id) return;
    this.modalTitle = this.transloco.translate('profile.followers');
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
    this.modalTitle = this.transloco.translate('profile.following');
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

  sendMessage(username: string): void {
    this.router.navigate(['/messages', username]);
  }

  // Clip Detail Modal Actions
  openClipDetailModal(clipId: number): void {
    const currentUserId = this.authService.getCurrentUserId();
    this.clipModalLoading = true;
    this.selectedPostDetailId = null;
    this.cdr.detectChanges();

    // Resolve the clip to its public post id, then let the shared
    // post-detail component load and render everything (likes, comments, etc).
    this.exploreService.getPostByClipId(clipId, currentUserId).subscribe({
      next: (post) => {
        this.selectedPostDetailId = post.id;
        this.clipModalLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load clip post details:', err);
        // This clip has no associated public post (e.g. a private library clip);
        // close the modal instead of leaving an empty shell open.
        this.closeClipModal();
        this.cdr.detectChanges();
      }
    });
  }

  closeClipModal(): void {
    this.selectedPostDetailId = null;
    this.clipModalLoading = false;
  }

  // Video playback is handled by AppVideoPlayer
}
