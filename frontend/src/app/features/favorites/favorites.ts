import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClipService } from '../../core/services/clip.service';
import { ClipGroupService } from '../../core/services/clip-group.service';
import { AuthService } from '../../core/services/auth.service';
import { Clip } from '../../core/models/clip';
import { ClipGroup } from '../../core/models/clip-group';
import { ClipCard } from '../library/clip-card/clip-card';
import { BackLink } from '../../shared/back-link/back-link';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { GroupDialog } from '../library/group-dialog/group-dialog';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, ClipCard, RouterLink, BackLink, ConfirmDialog, FormsModule, GroupDialog],
  templateUrl: './favorites.html',
  styleUrls: ['./favorites.css']
})
export class Favorites implements OnInit, OnDestroy {
  favoriteClips: Clip[] = [];
  isLoading = true;

  showRemoveModal = false;
  clipToRemove: number | null = null;
  playingClip: Clip | null = null;
  fsAnimationFrameId: number | null = null;

  activeTab: 'clips' | 'groups' = 'clips';
  selectedGroup: ClipGroup | null = null;

  // Add to Group properties
  groups: ClipGroup[] = [];
  showAddToGroupDialog = false;
  clipToAddToGroup: number | null = null;
  selectedGroupIdToAdd: number | null = null;
  
  // Create Group dialog
  showGroupDialog = false;
  groupDialogMode: 'create' | 'edit' = 'create';
  editingGroup: ClipGroup | null = null;

  @ViewChild('fullscreenVideo') fullscreenVideoRef!: ElementRef<HTMLVideoElement>;

  @HostListener('window:keydown.escape', ['$event'])
  handleEscape(event: any) {
    if (this.playingClip) {
      this.closeClip();
    }
  }

  constructor(
    private clipService: ClipService,
    private clipGroupService: ClipGroupService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.stopFsProgressLoop();
  }

  loadFavorites(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.isLoading = true;
      this.clipService.getFavorites(userId).subscribe({
        next: (clips) => {
          this.favoriteClips = clips;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load favorites:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  loadGroups(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.clipGroupService.getUserGroups(userId, 'FAVORITES').subscribe({
        next: (groups) => {
          this.groups = groups;
          this.cdr.detectChanges();
        }
      });
    }
  }

  setTab(tab: 'clips' | 'groups') {
    this.activeTab = tab;
    this.selectedGroup = null;
  }

  openGroup(group: ClipGroup) {
    this.selectedGroup = group;
    if (!group.clips) {
      this.clipGroupService.getGroup(group.id).subscribe(g => {
        this.selectedGroup = g;
        this.cdr.detectChanges();
      });
    }
  }

  backToGroups() {
    this.selectedGroup = null;
  }

  createGroup() {
    this.groupDialogMode = 'create';
    this.editingGroup = null;
    this.showGroupDialog = true;
  }

  editGroup(group: ClipGroup) {
    this.groupDialogMode = 'edit';
    this.editingGroup = group;
    this.showGroupDialog = true;
  }

  onGroupDialogSave(data: {name: string, description: string}) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    if (this.groupDialogMode === 'create') {
      this.clipGroupService.createGroup(userId, data.name, data.description, 'FAVORITES').subscribe(() => {
        this.loadGroups();
        this.showGroupDialog = false;
      });
    } else if (this.editingGroup) {
      this.clipGroupService.updateGroup(this.editingGroup.id, data.name, data.description).subscribe(() => {
        this.loadGroups();
        this.showGroupDialog = false;
        if (this.selectedGroup && this.selectedGroup.id === this.editingGroup?.id) {
          this.openGroup(this.editingGroup);
        }
      });
    }
  }

  onGroupDialogCancel() {
    this.showGroupDialog = false;
  }

  deleteSelectedGroup() {
    if (this.selectedGroup) {
      this.clipGroupService.deleteGroup(this.selectedGroup.id).subscribe(() => {
        this.selectedGroup = null;
        this.loadGroups();
      });
    }
  }

  removeClipFromGroup(clipId: number) {
    if (this.selectedGroup) {
      this.clipGroupService.removeClipFromGroup(this.selectedGroup.id, clipId).subscribe(() => {
        if (this.selectedGroup) {
          this.selectedGroup.clips = this.selectedGroup.clips?.filter(c => c.id !== clipId);
        }
        this.cdr.detectChanges();
      });
    }
  }

  handleAddToGroup(clipId: number) {
     this.clipToAddToGroup = clipId;
     this.selectedGroupIdToAdd = this.groups.length > 0 ? this.groups[0].id : null;
     this.showAddToGroupDialog = true;
  }

  confirmAddToGroup() {
     if (this.clipToAddToGroup && this.selectedGroupIdToAdd) {
        this.clipGroupService.addClipToGroup(this.selectedGroupIdToAdd, this.clipToAddToGroup).subscribe(() => {
           this.showAddToGroupDialog = false;
           this.clipToAddToGroup = null;
        });
     }
  }

  cancelAddToGroup() {
     this.showAddToGroupDialog = false;
     this.clipToAddToGroup = null;
  }

  handleRemoveFavorite(clipId: number): void {
    this.clipToRemove = clipId;
    this.showRemoveModal = true;
  }

  onConfirmRemove(): void {
    const userId = this.authService.getCurrentUserId();
    if (this.clipToRemove && userId) {
      this.clipService.removeFavorite(this.clipToRemove, userId).subscribe({
        next: () => {
          this.favoriteClips = this.favoriteClips.filter(c => c.id !== this.clipToRemove);
          this.showRemoveModal = false;
          this.clipToRemove = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to remove favorite:', err);
          this.showRemoveModal = false;
          this.clipToRemove = null;
        }
      });
    }
  }

  onCancelRemove(): void {
    this.showRemoveModal = false;
    this.clipToRemove = null;
  }

  openClip(clip: Clip) {
    this.playingClip = clip;
    // We need to wait for the next tick for ViewChild to be available
    setTimeout(() => {
      if (this.fullscreenVideoRef) {
        const fsVideo = this.fullscreenVideoRef.nativeElement;
        fsVideo.play().then(() => {
          this.startFsProgressLoop(fsVideo);
        }).catch(err => console.error('Error playing fsVideo:', err));
      }
    }, 50);
  }

  closeClip() {
    this.stopFsProgressLoop();
    if (this.fullscreenVideoRef) {
      this.fullscreenVideoRef.nativeElement.pause();
    }
    this.playingClip = null;
  }

  onTogglePlay(video: HTMLVideoElement) {
    if (video.paused) {
      video.play().then(() => this.startFsProgressLoop(video));
    } else {
      video.pause();
      this.stopFsProgressLoop();
    }
  }

  onToggleMute(event: MouseEvent, video: HTMLVideoElement) {
    event.stopPropagation();
    video.muted = !video.muted;
  }

  onVolumeChange(event: Event, video: HTMLVideoElement) {
    const input = event.target as HTMLInputElement;
    video.volume = parseFloat(input.value);
    video.muted = video.volume === 0;
  }

  onSeekTo(event: MouseEvent, video: HTMLVideoElement) {
    event.stopPropagation();
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));

    const duration = video.duration || this.playingClip?.duration || 1;
    video.currentTime = percent * duration;
    if (this.playingClip) {
        (this.playingClip as any).currentTime = video.currentTime;
    }
  }

  onTimeUpdate(video: HTMLVideoElement) {
    if (this.playingClip) {
      (this.playingClip as any).currentTime = video.currentTime;
    }
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  private startFsProgressLoop(video: HTMLVideoElement) {
    this.stopFsProgressLoop();
    const update = () => {
      if (this.playingClip) {
        (this.playingClip as any).currentTime = video.currentTime;
        let end = this.playingClip.duration;
        if (end === undefined || end === null || end === 0) {
          end = video.duration && !isNaN(video.duration) ? video.duration : Number.MAX_VALUE;
        }

        if (end > 0.1 && video.currentTime >= end) {
          video.currentTime = 0;
          video.play().catch(e => console.error("Replay error", e));
        }
      }
      this.fsAnimationFrameId = requestAnimationFrame(update);
    };
    this.fsAnimationFrameId = requestAnimationFrame(update);
  }

  private stopFsProgressLoop() {
    if (this.fsAnimationFrameId !== null) {
      cancelAnimationFrame(this.fsAnimationFrameId);
      this.fsAnimationFrameId = null;
    }
  }
}
