import { ClipCard } from './clip-card/clip-card';
import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipService } from '../../core/services/clip.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { Clip } from '../../core/models/clip'
import { CustomDropdownComponent } from '../../shared/custom-dropdown/custom-dropdown';
import { RouterLink, RouterLinkActive, Router } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { User } from '../../core/models/user';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';


@Component({
  selector: 'app-library',
  imports: [CommonModule, ClipCard, CustomDropdownComponent, RouterLink, RouterLinkActive, FormsModule, ConfirmDialog],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library implements OnInit {

  games = ['All Games'];
  tags = ['All Tags', 'Ace', 'Clutch', 'Funny', 'Fail', 'Sniper', 'Win'];
  sortOptions = ['Date', 'Duration'];

  allClips: Clip[] = [];
  clips: Clip[] = [];
  user: User | null = null;
  isProfileMenuOpen: boolean = false;

  selectedGame: string = 'All Games';
  selectedTag: string = 'All Tags';
  selectedSort: string = 'Date';
  isTrashView: boolean = false;
  deletedClips: Clip[] = [];

  showDeleteModal: boolean = false;
  clipToDelete: number | null = null;

  constructor(
    private clipService: ClipService,
    private profileService: ProfileService,
    private authService: AuthService,
    private gameService: GameService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();
    this.clipService.getClips(userId).subscribe(clips => {
      this.allClips = clips;
      this.applyFilters();
      this.cdr.detectChanges();
    });

    this.gameService.getGameNames().subscribe(names => {
      this.games = ['All Games', ...names];
      this.cdr.detectChanges();
    });

    const currentUserId = this.authService.getCurrentUserId();
    if (currentUserId) {
      this.profileService.getUserProfile(currentUserId.toString()).subscribe(profile => {
        this.user = profile;
        this.cdr.detectChanges();
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isProfileClick = target.closest('.profile-dropdown-wrapper');
    
    if (!isProfileClick && this.isProfileMenuOpen) {
      this.isProfileMenuOpen = false;
      this.cdr.detectChanges();
    }
  }

  handleDelete(id: number) {
    const userId = this.authService.getCurrentUserId();
    this.clipService.deleteClip(id).subscribe(() => {
      this.clipService.getClips(userId).subscribe(clips => {
        this.allClips = clips;
        if (!this.isTrashView) {
          this.applyFilters();
        }
        this.cdr.detectChanges();
      });
    });
  }

  toggleTrashView() {
    this.isTrashView = !this.isTrashView;
    if (this.isTrashView) {
      this.loadDeletedClips();
    } else {
      this.applyFilters();
    }
  }

  loadDeletedClips() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.clipService.getDeletedClips(userId).subscribe(clips => {
        this.deletedClips = clips;
        this.applyFilters();
        this.cdr.detectChanges();
      });
    }
  }

  handleRecover(id: number) {
    this.clipService.recoverClip(id).subscribe(() => {
      this.loadDeletedClips();
      // Also refresh regular clips in case they switch back
      const userId = this.authService.getCurrentUserId();
      this.clipService.getClips(userId).subscribe(clips => {
        this.allClips = clips;
      });
    });
  }

  handleHardDelete(id: number) {
    this.clipToDelete = id;
    this.showDeleteModal = true;
  }

  onConfirmDelete(): void {
    if (this.clipToDelete) {
      this.clipService.hardDeleteClip(this.clipToDelete).subscribe({
        next: () => {
          this.loadDeletedClips();
          this.showDeleteModal = false;
          this.clipToDelete = null;
        },
        error: (err) => {
          console.error('Failed to delete clip permanently:', err);
          this.showDeleteModal = false;
          this.clipToDelete = null;
        }
      });
    }
  }

  onCancelDelete(): void {
    this.showDeleteModal = false;
    this.clipToDelete = null;
  }

  searchQuery: string = '';

  onSearch() {
    this.applyFilters();
  }

  onGameFilter(game: string) {
    this.selectedGame = game;
    this.applyFilters();
  }

  onTagFilter(tag: string) {
    this.selectedTag = tag;
    this.applyFilters();
  }

  onSortChange(sort: string) {
    this.selectedSort = sort;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = this.isTrashView ? [...this.deletedClips] : [...this.allClips];

    // Search filter
    if (this.searchQuery.trim()) {
      filtered = filtered.filter(clip =>
        clip.title.toLowerCase().startsWith(this.searchQuery.toLowerCase())
      );
    }

    // Game filter
    if (this.selectedGame && this.selectedGame !== 'All Games') {
      filtered = filtered.filter(clip =>
        clip.game?.toLowerCase() === this.selectedGame.toLowerCase()
      );
    }

    // Tag filter
    if (this.selectedTag && this.selectedTag !== 'All Tags') {
      filtered = filtered.filter(clip =>
        clip.tags?.some(t => t.toLowerCase() === this.selectedTag.toLowerCase())
      );
    }

    // Sort
    if (this.selectedSort === 'Duration') {
      filtered.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else {
      // Default: Date (newest first)
      filtered.sort((a, b) => b.id - a.id);
    }

    this.clips = filtered;
    this.cdr.detectChanges();
  }

  toggleProfileMenu(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/welcome']);
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
