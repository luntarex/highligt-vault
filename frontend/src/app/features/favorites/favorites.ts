import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { Clip } from '../../core/models/clip';
import { ClipCard } from '../library/clip-card/clip-card';
import { BackLink } from '../../shared/back-link/back-link';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, ClipCard, RouterLink, BackLink, ConfirmDialog],
  templateUrl: './favorites.html',
  styleUrls: ['./favorites.css']
})
export class Favorites implements OnInit {
  favoriteClips: Clip[] = [];
  isLoading = true;

  showRemoveModal = false;
  clipToRemove: number | null = null;

  constructor(
    private clipService: ClipService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
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
}
