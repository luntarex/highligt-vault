import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PlaylistService } from '../../core/services/playlist.service';
import { Playlist } from '../../core/models/playlist';
import { PlaylistDialog } from '../playlist-dialog/playlist-dialog';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, PlaylistDialog, ConfirmDialog],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit {
  isCollapsed = false;
  showPlaylistDialog = false;
  playlistDialogMode: 'create' | 'edit' = 'create';
  editingPlaylist: Playlist | null = null;

  // Context menu
  activeMenuId: number | null = null;

  // Delete confirm
  showDeleteConfirm = false;
  playlistToDelete: Playlist | null = null;

  playlists: Playlist[] = [];
  userId: number | null = null;

  constructor(
    public authService: AuthService,
    private router: Router,
    private playlistService: PlaylistService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.userId = this.authService.getCurrentUserId();
      this.loadPlaylists();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close context menu when clicking outside
    if (this.activeMenuId !== null) {
      const target = event.target as HTMLElement;
      if (!target.closest('.playlist-context-menu') && !target.closest('.more-btn')) {
        this.activeMenuId = null;
        this.cdr.detectChanges();
      }
    }
  }

  loadPlaylists(): void {
    if (!this.userId) return;
    this.playlistService.getUserPlaylists(this.userId).subscribe({
      next: (data) => {
        this.playlists = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load playlists', err)
    });
  }

  // ─── Create Playlist ───
  createPlaylist(): void {
    if (!this.userId) return;
    this.playlistDialogMode = 'create';
    this.editingPlaylist = null;
    this.showPlaylistDialog = true;
  }

  onPlaylistCreated(data: { name: string; description: string }): void {
    if (!this.userId) return;
    this.showPlaylistDialog = false;

    if (this.playlistDialogMode === 'edit' && this.editingPlaylist) {
      this.playlistService.updatePlaylist(this.editingPlaylist.id, data.name, data.description).subscribe({
        next: () => {
          this.loadPlaylists();
          this.editingPlaylist = null;
        },
        error: (err) => console.error('Failed to update playlist', err)
      });
    } else {
      this.playlistService.createPlaylist(this.userId, data.name, data.description).subscribe({
        next: () => {
          this.loadPlaylists();
        },
        error: (err) => console.error('Failed to create playlist', err)
      });
    }
  }

  onPlaylistDialogCancelled(): void {
    this.showPlaylistDialog = false;
    this.editingPlaylist = null;
  }

  // ─── Context Menu ───
  toggleMenu(playlistId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeMenuId = this.activeMenuId === playlistId ? null : playlistId;
    this.cdr.detectChanges();
  }

  // ─── Edit Playlist ───
  editPlaylist(playlist: Playlist, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeMenuId = null;
    this.playlistDialogMode = 'edit';
    this.editingPlaylist = playlist;
    this.showPlaylistDialog = true;
  }

  // ─── Delete Playlist ───
  confirmDeletePlaylist(playlist: Playlist, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeMenuId = null;
    this.playlistToDelete = playlist;
    this.showDeleteConfirm = true;
  }

  onConfirmDelete(): void {
    if (!this.playlistToDelete) return;
    const deletedId = this.playlistToDelete.id;
    this.playlistService.deletePlaylist(deletedId).subscribe({
      next: () => {
        this.loadPlaylists();
        this.showDeleteConfirm = false;
        this.playlistToDelete = null;
        if (this.router.url.includes(`/playlist/${deletedId}`)) {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error('Failed to delete playlist', err);
        this.showDeleteConfirm = false;
        this.playlistToDelete = null;
      }
    });
  }

  onCancelDelete(): void {
    this.showDeleteConfirm = false;
    this.playlistToDelete = null;
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      this.router.navigate(['/clip-editor/new'], { state: { videoUrl: url, file: file } });
    }
    event.target.value = '';
  }
}
