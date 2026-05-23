import { ClipCard } from './clip-card/clip-card';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { ClipGroupService } from '../../core/services/clip-group.service';
import { Clip } from '../../core/models/clip';
import { ClipGroup } from '../../core/models/clip-group';
import { CustomDropdownComponent } from '../../shared/custom-dropdown/custom-dropdown';
import { RouterLink, RouterLinkActive, Router } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ProfileDropdown } from '../../shared/profile-dropdown/profile-dropdown';
import { GroupDialog } from './group-dialog/group-dialog';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, ClipCard, CustomDropdownComponent, RouterLink, RouterLinkActive, FormsModule, ConfirmDialog, ProfileDropdown, GroupDialog],
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

  showDeleteModal: boolean = false;
  clipToDelete: number | null = null;

  // Groups
  activeTab: 'clips' | 'groups' = 'clips';
  groups: ClipGroup[] = [];
  selectedGroup: ClipGroup | null = null;
  showGroupDialog = false;
  groupDialogMode: 'create' | 'edit' = 'create';
  editingGroup: ClipGroup | null = null;

  showAddToGroupDialog = false;
  clipToAddToGroup: number | null = null;
  selectedGroupIdToAdd: number | null = null;

  constructor(
    private clipService: ClipService,
    private clipGroupService: ClipGroupService,
    private authService: AuthService,
    private gameService: GameService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.gameService.getGameNames().subscribe(names => {
      this.games = ['All Games', ...names];
      this.cdr.detectChanges();
    });
  }

  loadGroups(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.clipGroupService.getUserGroups(userId, 'LIBRARY').subscribe({
        next: (groups) => {
          this.groups = groups;
          this.cdr.detectChanges();
        }
      });
    }
  }

  loadData() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.clipService.getClips(userId).subscribe(clips => {
        this.allClips = clips;
        this.applyFilters();
        this.cdr.detectChanges();
      });
      this.loadGroups();
    }
  }

  setTab(tab: 'clips' | 'groups') {
    this.activeTab = tab;
    this.selectedGroup = null;
    this.isTrashView = false;
    this.applyFilters();
  }

  openGroup(group: ClipGroup) {
    this.selectedGroup = group;
    // Load group details
    this.clipGroupService.getGroup(group.id).subscribe(g => {
        this.selectedGroup = g;
        this.cdr.detectChanges();
    });
  }

  backToGroups() {
    this.selectedGroup = null;
    this.loadData();
  }

  createGroup() {
    this.groupDialogMode = 'create';
    this.editingGroup = null;
    this.showGroupDialog = true;
  }

  editGroup(group: ClipGroup, event: Event) {
    event.stopPropagation();
    this.groupDialogMode = 'edit';
    this.editingGroup = group;
    this.showGroupDialog = true;
  }

  deleteGroup(group: ClipGroup, event: Event) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete the group '${group.name}'?`)) {
      this.clipGroupService.deleteGroup(group.id).subscribe(() => {
         this.loadData();
      });
    }
  }

  onGroupSaved(data: { name: string; description: string }) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    if (this.groupDialogMode === 'create') {
      this.clipGroupService.createGroup(userId, data.name, data.description, 'LIBRARY').subscribe(() => {
        this.loadData();
        this.showGroupDialog = false;
      });
    } else if (this.editingGroup) {
      this.clipGroupService.updateGroup(this.editingGroup.id, data.name, data.description).subscribe(() => {
        this.loadData();
        this.showGroupDialog = false;
      });
    }
  }

  onGroupDialogCancelled() {
    this.showGroupDialog = false;
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

  handleToggleFavorite(clipId: number) {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;
    // Just toggle by assuming add for now, or fetch status.
    // If we want a true toggle, we'd need to know if it's already favorited, but since it's just a button on the card...
    // The easiest is to just call addFavorite.
    this.clipService.addFavorite(clipId, userId).subscribe(() => {
        console.log('Added to favorites');
    });
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
