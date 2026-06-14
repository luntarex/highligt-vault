import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Community } from '../../core/models/community';
import { CommunityService } from '../../core/services/community.service';
import { ToastService } from '../../core/services/toast.service';
import { UploadService } from '../../core/services/upload.service';
import { getSafeErrorMessage } from '../../core/utils/error-message';
import { BackLink } from '../../shared/back-link/back-link';
import { ProfileDropdown } from '../../shared/profile-dropdown/profile-dropdown';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { buildSlugId } from '../../core/utils/slug.util';

@Component({
  selector: 'app-communities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackLink, ProfileDropdown, TranslocoModule],
  templateUrl: './communities.html',
  styleUrl: './communities.css'
})
export class Communities implements OnInit {
  protected readonly buildSlugId = buildSlugId;
  communities: Community[] = [];
  selectedCommunity: Community | null = null;
  isLoading = true;
  isSubmitting = false;
  showCreateModal = false;
  query = '';
  typeFilter: 'ALL' | 'GAME' | 'USER' | 'JOINED' = 'ALL';
  thumbnailFile: File | null = null;
  thumbnailPreviewUrl = '';

  newCommunity = {
    name: '',
    description: '',
    rules: ''
  };

  constructor(
    private communityService: CommunityService,
    private uploadService: UploadService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    this.loadCommunities();
  }

  get filteredCommunities(): Community[] {
    const normalized = this.query.trim().toLowerCase();
    return this.communities.filter(community => {
      if (community.moderationStatus === 'REJECTED' || community.moderationStatus === 'REMOVED') {
        return false;
      }

      const matchesSearch = !normalized
        || community.name.toLowerCase().includes(normalized)
        || (community.description || '').toLowerCase().includes(normalized);
      const matchesType = this.typeFilter === 'ALL'
        || community.type === this.typeFilter
        || (this.typeFilter === 'JOINED' && community.joined);
      return matchesSearch && matchesType;
    });
  }

  loadCommunities(): void {
    this.isLoading = true;
    this.communityService.getCommunities().subscribe({
      next: (communities) => {
        this.communities = communities || [];
        this.selectedCommunity = this.selectedCommunity
          ? this.communities.find(item => item.id === this.selectedCommunity?.id) || null
          : null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not load communities.'));
        this.cdr.detectChanges();
      }
    });
  }

  selectCommunity(community: Community): void {
    this.selectedCommunity = community;
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    if (this.isSubmitting) return;
    this.resetCreateForm();
    this.showCreateModal = false;
  }

  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.thumbnailFile = file;
    if (this.thumbnailPreviewUrl) {
      URL.revokeObjectURL(this.thumbnailPreviewUrl);
    }
    this.thumbnailPreviewUrl = URL.createObjectURL(file);
    input.value = '';
    this.cdr.detectChanges();
  }

  createCommunity(): void {
    if (!this.newCommunity.name.trim() || !this.thumbnailFile || this.isSubmitting) return;

    this.isSubmitting = true;
    this.uploadService.uploadImage(this.thumbnailFile).subscribe({
      next: (upload) => this.submitCommunity(upload.secureUrl),
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(getSafeErrorMessage(err, 'Image upload failed. Please try again.'));
        this.cdr.detectChanges();
      }
    });
  }

  toggleJoin(community: Community, event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    const request = community.joined
      ? this.communityService.leaveCommunity(community.id)
      : this.communityService.joinCommunity(community.id);

    request.subscribe({
      next: () => {
        community.joined = !community.joined;
        community.memberCount += community.joined ? 1 : -1;
        community.viewerRole = community.joined ? (community.viewerRole || 'MEMBER') : undefined;
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

  defaultThumbnail(community: Community): string {
    return community.type === 'GAME'
      ? 'assets/icons/compass.svg'
      : 'assets/icons/comments.svg';
  }

  statusText(community: Community): string {
    if (community.type === 'GAME') return this.transloco.translate('communities.gameCommunity');
    if (community.moderationStatus === 'PENDING_REVIEW') return this.transloco.translate('communities.waitingModeration');
    return community.founderUsername
      ? this.transloco.translate('communities.foundedBy', { name: community.founderUsername })
      : this.transloco.translate('communities.community');
  }

  private submitCommunity(thumbnailUrl: string): void {
    this.communityService.createCommunity({
      name: this.newCommunity.name.trim(),
      description: this.newCommunity.description.trim(),
      rules: this.newCommunity.rules.trim(),
      thumbnailUrl
    }).subscribe({
      next: () => {
        this.toast.success('Community submitted for moderation.');
        this.resetCreateForm();
        this.showCreateModal = false;
        this.isSubmitting = false;
        this.loadCommunities();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.error(getSafeErrorMessage(err, 'Could not submit community.'));
        this.cdr.detectChanges();
      }
    });
  }

  private resetCreateForm(): void {
    this.newCommunity = { name: '', description: '', rules: '' };
    this.thumbnailFile = null;
    if (this.thumbnailPreviewUrl) {
      URL.revokeObjectURL(this.thumbnailPreviewUrl);
    }
    this.thumbnailPreviewUrl = '';
  }

  trackByCommunityId(_: number, community: Community): number {
    return community.id;
  }
}
