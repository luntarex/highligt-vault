import { ClipCard } from './clip-card/clip-card';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { ClipGroupService } from '../../core/services/clip-group.service';
import { Clip } from '../../core/models/clip'
import { ClipGroup } from '../../core/models/clip-group';
import { CustomDropdownComponent } from '../../shared/custom-dropdown/custom-dropdown';
import { Router } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ProfileDropdown } from '../../shared/profile-dropdown/profile-dropdown';
import { GroupDialog } from '../../shared/group-dialog/group-dialog';


@Component({
  selector: 'app-library',
  imports: [CommonModule, ClipCard, CustomDropdownComponent, FormsModule, ConfirmDialog, ProfileDropdown, GroupDialog],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library implements OnInit {

  games = ['All Games'];
  tags = ['All Tags', 'Ace', 'Clutch', 'Funny', 'Fail', 'Sniper', 'Win'];
  sortOptions = ['Date', 'Duration'];

  allClips: Clip[] = [];
  clips: Clip[] = [];


  selectedGame: string = 'All Games';
  selectedTag: string = 'All Tags';
  selectedSort: string = 'Date';
  isTrashView: boolean = false;
  deletedClips: Clip[] = [];
  libraryView: 'clips' | 'groups' | 'groupDetail' | 'selecting' = 'clips';
  selectedClipIds = new Set<number>();
  groups: ClipGroup[] = [];
  selectedGroup: ClipGroup | null = null;
  selectedGroupClips: Clip[] = [];
  showGroupDialog = false;

  showDeleteModal: boolean = false;
  clipToDelete: number | null = null;

  constructor(
    private clipService: ClipService,
    private authService: AuthService,
    private gameService: GameService,
    private clipGroupService: ClipGroupService,
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
  }



  handleDelete(id: number) {
    if (this.libraryView !== 'clips') return;
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
    this.libraryView = 'clips';
    this.selectedClipIds.clear();
    this.selectedGroup = null;
    this.selectedGroupClips = [];
    this.isTrashView = !this.isTrashView;
    if (this.isTrashView) {
      this.loadDeletedClips();
    } else {
      this.applyFilters();
    }
  }

  toggleGroupMode() {
    if (this.isTrashView) return;
    this.selectedClipIds.clear();
    this.selectedGroup = null;
    this.selectedGroupClips = [];

    if (this.libraryView === 'groups' || this.libraryView === 'groupDetail' || this.libraryView === 'selecting') {
      this.libraryView = 'clips';
      this.cdr.detectChanges();
      return;
    }

    this.libraryView = 'groups';
    this.loadGroups();
  }

  loadGroups(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;
    this.clipGroupService.getUserGroups(userId, 'LIBRARY').subscribe({
      next: (groups) => {
        this.groups = groups;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load groups:', err)
    });
  }

  openGroup(group: ClipGroup): void {
    this.clipGroupService.getGroup(group.id).subscribe({
      next: (groupDetail) => {
        this.selectedGroup = groupDetail;
        this.selectedGroupClips = groupDetail.clips || [];
        this.libraryView = 'groupDetail';
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load group:', err)
    });
  }

  deleteGroup(groupId: number): void {
    this.clipGroupService.deleteGroup(groupId).subscribe({
      next: () => {
        this.groups = this.groups.filter(group => group.id !== groupId);
        if (this.selectedGroup?.id === groupId) {
          this.selectedGroup = null;
          this.selectedGroupClips = [];
          this.libraryView = 'groups';
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to delete group:', err)
    });
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
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to remove clip from group:', err)
    });
  }

  backToGroups(): void {
    this.selectedGroup = null;
    this.selectedGroupClips = [];
    this.libraryView = 'groups';
    this.loadGroups();
  }

  startGroupSelection(): void {
    this.selectedClipIds.clear();
    this.libraryView = 'selecting';
    this.applyFilters();
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

    this.clipGroupService.getUserGroups(userId, 'LIBRARY').subscribe({
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
    this.clipGroupService.createGroup(data.name, data.description, clipIds, 'LIBRARY').subscribe({
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
      this.libraryView = 'groups';
      this.selectedClipIds.clear();
      this.loadGroups();
    }
    this.cdr.detectChanges();
  }

  isSelectingGroups(): boolean {
    return this.libraryView === 'selecting';
  }

  get selectedCount(): number {
    return this.selectedClipIds.size;
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

  handleAppeal(id: number) {
    this.clipService.appealClip(id, 'User requested a second review for this clip.').subscribe(() => {
      const userId = this.authService.getCurrentUserId();
      this.clipService.getClips(userId).subscribe(clips => {
        this.allClips = clips;
        this.applyFilters();
        this.cdr.detectChanges();
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




  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      this.router.navigate(['/clip-editor/new'], { state: { videoUrl: url, file: file } });
    }
    event.target.value = '';
  }
}
