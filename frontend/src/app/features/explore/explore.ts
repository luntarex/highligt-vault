import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ExplorePost } from '../../core/models/explore-post';
import { ExploreService } from '../../core/services/explore.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { ProfileDropdown } from '../../shared/profile-dropdown/profile-dropdown';
import { TranslocoModule } from '@jsverse/transloco';
import { ExploreGridCard } from './explore-grid-card/explore-grid-card';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.html',
  styleUrls: ['./explore.css'],
  imports: [FormsModule, CommonModule, ProfileDropdown, TranslocoModule, ExploreGridCard]
})
export class Explore implements OnInit {
  feed: ExplorePost[] = [];
  isLoading = true;

  searchQuery = '';
  selectedGame = '';

  constructor(
    private exploreService: ExploreService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadServiceData();
  }

  loadServiceData(): void {
    this.isLoading = true;
    const userId = this.authService.getCurrentUserId();
    this.exploreService.getFeed(userId).subscribe((feedData) => {
      this.feed = feedData;
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  /** Distinct game names present in the feed, for the category chips. */
  get games(): string[] {
    return [...new Set(this.feed.map(p => p.game).filter((g): g is string => !!g))].sort();
  }

  selectGame(game: string): void {
    this.selectedGame = this.selectedGame === game ? '' : game;
  }

  get filteredFeed(): ExplorePost[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.feed.filter(p => {
      if (this.selectedGame && p.game !== this.selectedGame) return false;
      if (!q) return true;
      return (
        p.title?.toLowerCase().includes(q) ||
        p.author?.username?.toLowerCase().includes(q) ||
        p.game?.toLowerCase().includes(q)
      );
    });
  }
}
