import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { PlaylistService } from '../../core/services/playlist.service';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { Playlist } from '../../core/models/playlist';
import { Clip } from '../../core/models/clip';
import { PlaylistDialog } from '../../shared/playlist-dialog/playlist-dialog';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

import { Subscription } from 'rxjs';

@Component({
  selector: 'app-playlist-view',
  standalone: true,
  imports: [CommonModule, RouterModule, PlaylistDialog, ConfirmDialog],
  templateUrl: './playlist-view.html',
  styleUrls: ['./playlist-view.css']
})
export class PlaylistView implements OnInit, OnDestroy {
  playlist: Playlist | null = null;
  availableClips: Clip[] = [];
  showAddModal = false;
  isAddingClip = false;
  isLoading = true;
  userId: number | null = null;

  // Edit
  showEditDialog = false;

  // Delete
  showDeleteConfirm = false;

  // Remove clip confirm
  showRemoveClipConfirm = false;
  clipToRemove: number | null = null;

  private routeSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private playlistService: PlaylistService,
    private clipService: ClipService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.userId = this.authService.getCurrentUserId();
    }

    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.loadPlaylist(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadPlaylist(id: number) {
    this.isLoading = true;
    this.playlistService.getPlaylist(id).subscribe({
      next: (data) => {
        if (data && data.clips) {
          const seen = new Set<number>();
          data.clips = data.clips.filter(c => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
        }
        this.playlist = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load playlist', err);
        this.isLoading = false;
      }
    });
  }

  // ─── Remove Clip ───
  removeClip(clipId: number, event: Event) {
    event.stopPropagation();
    if (!this.playlist) return;
    this.clipToRemove = clipId;
    this.showRemoveClipConfirm = true;
  }

  onConfirmRemoveClip(): void {
    if (!this.playlist || !this.clipToRemove) return;
    this.playlistService.removeClipFromPlaylist(this.playlist.id, this.clipToRemove).subscribe({
      next: () => {
        if (this.playlist && this.playlist.clips) {
          this.playlist.clips = this.playlist.clips.filter(c => c.id !== this.clipToRemove);
        }
        this.showRemoveClipConfirm = false;
        this.clipToRemove = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to remove clip', err);
        this.showRemoveClipConfirm = false;
        this.clipToRemove = null;
      }
    });
  }

  onCancelRemoveClip(): void {
    this.showRemoveClipConfirm = false;
    this.clipToRemove = null;
  }

  // ─── Add Clip Modal ───
  openAddModal() {
    if (!this.userId) return;
    this.showAddModal = true;
    this.clipService.getClips(this.userId).subscribe({
      next: (clips) => {
        const existingIds = this.playlist?.clips?.map(c => c.id) || [];
        this.availableClips = clips.filter(c => !existingIds.includes(c.id));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load available clips', err)
    });
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  addClipToPlaylist(clip: Clip) {
    if (!this.playlist || this.isAddingClip) return;
    this.isAddingClip = true;

    this.availableClips = this.availableClips.filter(c => c.id !== clip.id);
    this.closeAddModal();

    this.playlistService.addClipToPlaylist(this.playlist.id, clip.id).subscribe({
      next: () => {
        if (!this.playlist!.clips) {
          this.playlist!.clips = [];
        }
        if (!this.playlist!.clips.some(c => c.id === clip.id)) {
          this.playlist!.clips.push(clip);
        }
        this.isAddingClip = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isAddingClip = false;
        console.error('Failed to add clip', err);
      }
    });
  }

  // ─── Edit Playlist ───
  openEditDialog(): void {
    this.showEditDialog = true;
  }

  onEditSaved(data: { name: string; description: string }): void {
    if (!this.playlist) return;
    this.showEditDialog = false;
    this.playlistService.updatePlaylist(this.playlist.id, data.name, data.description).subscribe({
      next: () => {
        this.playlist!.name = data.name;
        this.playlist!.description = data.description;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to update playlist', err)
    });
  }

  onEditCancelled(): void {
    this.showEditDialog = false;
  }

  // ─── Delete Playlist ───
  openDeleteConfirm(): void {
    this.showDeleteConfirm = true;
  }

  onConfirmDelete(): void {
    if (!this.playlist) return;
    this.playlistService.deletePlaylist(this.playlist.id).subscribe({
      next: () => {
        this.showDeleteConfirm = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Failed to delete playlist', err);
        this.showDeleteConfirm = false;
      }
    });
  }

  onCancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  formatDuration(duration: number): string {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  trackByClipId(index: number, clip: Clip): number {
    return clip.id;
  }
}
