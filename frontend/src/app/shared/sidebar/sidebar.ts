import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PlaylistService } from '../../core/services/playlist.service';
import { Playlist } from '../../core/models/playlist';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit {
  isCollapsed = false;

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

  createPlaylist(): void {
    if (!this.userId) return;
    const name = prompt('Enter a name for the new playlist:');
    if (name && name.trim().length > 0) {
      this.playlistService.createPlaylist(this.userId, name).subscribe({
        next: (response) => {
          this.loadPlaylists();
        },
        error: (err) => console.error('Failed to create playlist', err)
      });
    }
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
