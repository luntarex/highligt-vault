import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PlaylistService } from '../../core/services/playlist.service';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { Playlist } from '../../core/models/playlist';
import { Clip } from '../../core/models/clip';

@Component({
  selector: 'app-playlist-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './playlist-view.html',
  styleUrls: ['./playlist-view.css']
})
export class PlaylistView implements OnInit {
  playlist: Playlist | null = null;
  availableClips: Clip[] = [];
  showAddModal = false;
  isLoading = true;
  userId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private playlistService: PlaylistService,
    private clipService: ClipService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.userId = this.authService.getCurrentUserId();
    }

    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (id) {
        this.loadPlaylist(id);
      }
    });
  }

  loadPlaylist(id: number) {
    this.isLoading = true;
    this.playlistService.getPlaylist(id).subscribe({
      next: (data) => {
        this.playlist = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load playlist', err);
        this.isLoading = false;
      }
    });
  }

  removeClip(clipId: number, event: Event) {
    event.stopPropagation();
    if (!this.playlist) return;

    if (confirm('Are you sure you want to remove this clip from the playlist?')) {
      this.playlistService.removeClipFromPlaylist(this.playlist.id, clipId).subscribe({
        next: () => {
          if (this.playlist && this.playlist.clips) {
            this.playlist.clips = this.playlist.clips.filter(c => c.id !== clipId);
          }
        },
        error: (err) => console.error('Failed to remove clip', err)
      });
    }
  }

  openAddModal() {
    if (!this.userId) return;
    this.showAddModal = true;
    this.clipService.getClips(this.userId).subscribe({
      next: (clips) => {
        // filter out clips already in the playlist
        const existingIds = this.playlist?.clips?.map(c => c.id) || [];
        this.availableClips = clips.filter(c => !existingIds.includes(c.id));
      },
      error: (err) => console.error('Failed to load available clips', err)
    });
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  addClipToPlaylist(clip: Clip) {
    if (!this.playlist) return;
    this.playlistService.addClipToPlaylist(this.playlist.id, clip.id).subscribe({
      next: () => {
        if (!this.playlist!.clips) {
          this.playlist!.clips = [];
        }
        this.playlist!.clips.push(clip);
        this.availableClips = this.availableClips.filter(c => c.id !== clip.id);
        this.closeAddModal();
      },
      error: (err) => console.error('Failed to add clip', err)
    });
  }

  formatDuration(duration: number): string {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
