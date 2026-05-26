import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { ClipGroupService } from '../../core/services/clip-group.service';
import { Clip } from '../../core/models/clip';
import { ClipGroup } from '../../core/models/clip-group';
import { ClipCard } from '../library/clip-card/clip-card';
import { BackLink } from '../../shared/back-link/back-link';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { GroupDialog } from '../../shared/group-dialog/group-dialog';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, ClipCard, RouterLink, BackLink, ConfirmDialog, GroupDialog],
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
  isGroupMode = false;
  selectedClipIds = new Set<number>();
  groups: ClipGroup[] = [];
  selectedGroup: ClipGroup | null = null;
  selectedGroupClips: Clip[] = [];
  showGroupDialog = false;

  @ViewChild('fullscreenVideo') fullscreenVideoRef!: ElementRef<HTMLVideoElement>;

  @HostListener('window:keydown.escape', ['$event'])
  handleEscape(event: any) {
    if (this.playingClip) {
      this.closeClip();
    }
  }

  constructor(
    private clipService: ClipService,
    private authService: AuthService,
    private clipGroupService: ClipGroupService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
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
          this.loadFavoriteGroups();
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

  handleRemoveFavorite(clipId: number): void {
    if (this.isGroupMode) return;
    this.clipToRemove = clipId;
    this.showRemoveModal = true;
  }

  toggleGroupMode(): void {
    this.isGroupMode = !this.isGroupMode;
    this.selectedClipIds.clear();
    this.selectedGroup = null;
    this.selectedGroupClips = [];
    this.cdr.detectChanges();
  }

  loadFavoriteGroups(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;
    this.clipGroupService.getUserGroups(userId, 'FAVORITES').subscribe({
      next: (groups) => {
        this.groups = groups;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load favorite groups:', err)
    });
  }

  openGroup(group: ClipGroup): void {
    this.clipGroupService.getGroup(group.id).subscribe({
      next: (groupDetail) => {
        this.selectedGroup = groupDetail;
        this.selectedGroupClips = groupDetail.clips || [];
        this.isGroupMode = false;
        this.selectedClipIds.clear();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load favorite group:', err)
    });
  }

  deleteGroup(groupId: number): void {
    this.clipGroupService.deleteGroup(groupId).subscribe({
      next: () => {
        this.groups = this.groups.filter(group => group.id !== groupId);
        if (this.selectedGroup?.id === groupId) {
          this.selectedGroup = null;
          this.selectedGroupClips = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to delete favorite group:', err)
    });
  }

  closeSelectedGroup(): void {
    this.selectedGroup = null;
    this.selectedGroupClips = [];
    this.cdr.detectChanges();
  }

  removeClipFromGroup(clipId: number): void {
    if (!this.selectedGroup) return;
    const groupId = this.selectedGroup.id;
    this.clipGroupService.removeClipFromGroup(groupId, clipId).subscribe({
      next: () => {
        this.selectedGroupClips = this.selectedGroupClips.filter(clip => clip.id !== clipId);
        if (this.selectedGroup) {
          this.selectedGroup.clipCount = Math.max((this.selectedGroup.clipCount || 1) - 1, 0);
        }
        this.loadFavoriteGroups();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to remove clip from favorite group:', err)
    });
  }

  handleSelectionChange(selection: { id: number; selected: boolean }): void {
    if (selection.selected) {
      this.selectedClipIds.add(selection.id);
    } else {
      this.selectedClipIds.delete(selection.id);
    }
    this.cdr.detectChanges();
  }

  openGroupDialog(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId || this.selectedClipIds.size === 0) return;

    this.clipGroupService.getUserGroups(userId, 'FAVORITES').subscribe({
      next: (groups) => {
        this.groups = groups;
        this.showGroupDialog = true;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load groups:', err)
    });
  }

  createGroup(data: { name: string; description: string }): void {
    const clipIds = Array.from(this.selectedClipIds);
    this.clipGroupService.createGroup(data.name, data.description, clipIds, 'FAVORITES').subscribe({
      next: () => this.closeGroupDialog(true),
      error: (err) => console.error('Failed to create group:', err)
    });
  }

  addToGroup(groupId: number): void {
    const clipIds = Array.from(this.selectedClipIds);
    this.clipGroupService.addClipsToGroup(groupId, clipIds).subscribe({
      next: () => this.closeGroupDialog(true),
      error: (err) => console.error('Failed to add clips to group:', err)
    });
  }

  closeGroupDialog(resetSelection = false): void {
    this.showGroupDialog = false;
    if (resetSelection) {
      this.isGroupMode = false;
      this.selectedClipIds.clear();
      this.loadFavoriteGroups();
    }
    this.cdr.detectChanges();
  }

  get selectedCount(): number {
    return this.selectedClipIds.size;
  }

  onConfirmRemove(): void {
    const userId = this.authService.getCurrentUserId();
    if (this.clipToRemove && userId) {
      this.clipService.removeFavorite(this.clipToRemove, userId).subscribe({
        next: () => {
          this.favoriteClips = this.favoriteClips.filter(c => c.id !== this.clipToRemove);
          this.loadFavoriteGroups();
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
    if (this.isGroupMode) return;
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
