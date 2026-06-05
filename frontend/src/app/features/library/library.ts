import { ClipCard } from './clip-card/clip-card';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { ClipGroupService } from '../../core/services/clip-group.service';
import { Clip } from '../../core/models/clip'
import { ToastService } from '../../core/services/toast.service';
import { ClipGroup } from '../../core/models/clip-group';
import { CustomDropdownComponent } from '../../shared/custom-dropdown/custom-dropdown';
import { Router } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { ProfileDropdown } from '../../shared/profile-dropdown/profile-dropdown';
import { GroupDialog } from '../../shared/group-dialog/group-dialog';
import { firstValueFrom } from 'rxjs';
import { ImportFolderService, ImportFolderFile } from '../../core/services/import-folder.service';
import { ImportFoldersDialog } from '../../shared/import-folders-dialog/import-folders-dialog';
import { LanguageService } from '../../core/services/language.service';
import { TranslocoModule } from '@jsverse/transloco';

interface ImportResult {
  imported: boolean;
  hiddenByModeration: boolean;
  metadataFallbackName?: string;
  failedName?: string;
}

interface ImportMetadata {
  title: string;
  game: string;
  notes: string;
  tags: string[];
  usedFallback: boolean;
}

@Component({
  selector: 'app-library',
  imports: [CommonModule, ClipCard, CustomDropdownComponent, FormsModule, ConfirmDialog, ProfileDropdown, GroupDialog, ImportFoldersDialog, TranslocoModule],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library implements OnInit {

  games = ['All Games'];
  private readonly defaultTags = ['Ace', 'Clutch', 'Funny', 'Fail', 'Sniper', 'Win'];
  private readonly videoExtensions = new Set([
    'mp4',
    'm4v',
    'mov',
    'webm',
    'mkv',
    'avi',
    'wmv',
    'flv',
    'mpg',
    'mpeg',
    '3gp',
    '3g2',
    'ogv',
    'ts',
    'mts',
    'm2ts'
  ]);
  private readonly aiImportConcurrency = 3;
  private readonly aiMetadataAttempts = 2;
  private readonly aiMetadataRetryDelayMs = 1200;
  tags = ['All Tags', ...this.defaultTags];
  sortOptions = ['Date', 'Duration'];

  allClips: Clip[] = [];
  clips: Clip[] = [];


  selectedGame: string = 'All Games';
  selectedTag: string = 'All Tags';
  selectedSort: string = 'Date';
  isTrashView: boolean = false;
  isDeletedLoading: boolean = false;
  deletedClips: Clip[] = [];
  libraryView: 'clips' | 'groups' | 'groupDetail' | 'selecting' = 'clips';
  selectedClipIds = new Set<number>();
  groups: ClipGroup[] = [];
  selectedGroup: ClipGroup | null = null;
  selectedGroupClips: Clip[] = [];
  showGroupDialog = false;
  showImportFoldersDialog = false;
  isAiImporting = false;
  aiImportStatus = '';
  isDragActive = false;

  showDeleteModal: boolean = false;
  clipToDelete: number | null = null;

  constructor(
    private clipService: ClipService,
    private authService: AuthService,
    private gameService: GameService,
    private clipGroupService: ClipGroupService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toast: ToastService,
    private importFolderService: ImportFolderService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loadLibraryClips();

    this.gameService.getGameNames().subscribe(names => {
      this.games = ['All Games', ...names];
      this.cdr.detectChanges();
    });
  }

  loadLibraryClips(): void {
    const userId = this.authService.getCurrentUserId();
    this.clipService.getClips(userId).subscribe(clips => {
      this.allClips = clips;
      this.refreshAvailableTags();
      this.applyFilters();
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
      this.isDeletedLoading = false;
      this.applyFilters();
    }
    this.cdr.detectChanges();
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
      this.isDeletedLoading = true;
      this.clips = [];
      this.cdr.detectChanges();
      this.clipService.getDeletedClips(userId).subscribe(clips => {
        this.deletedClips = clips;
        this.isDeletedLoading = false;
        this.applyFilters();
        this.cdr.detectChanges();
      }, () => {
        this.isDeletedLoading = false;
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

  onDragOver(event: DragEvent): void {
    if (!this.canDropImport()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!this.isAiImporting) {
      this.isDragActive = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    if (!this.canDropImport()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const current = event.currentTarget as HTMLElement;
    const related = event.relatedTarget as Node | null;
    if (!related || !current.contains(related)) {
      this.isDragActive = false;
    }
  }

  async onDropImport(event: DragEvent): Promise<void> {
    if (!this.canDropImport()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDragActive = false;

    if (this.isAiImporting) {
      return;
    }

    const items = Array.from(event.dataTransfer?.items || []);
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    const queuedFiles = items.length > 0
      ? await this.collectDroppedItems(items)
      : droppedFiles
          .filter(file => this.isVideoFile(file))
          .map(file => ({ file, relativePath: file.name }));

    if (queuedFiles.length === 0) {
      this.toast.info('Drop a folder that contains supported video files.');
      return;
    }

    await this.importQueuedFiles(queuedFiles, 0);
  }

  async onAiFolderSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files || []);
    const files = selectedFiles
      .filter(file => this.isVideoFile(file))
      .map(file => ({ file, relativePath: this.relativePathOf(file) }));
    const skipped = selectedFiles.length - files.length;
    input.value = '';
    if (files.length === 0 || this.isAiImporting) {
      if (skipped > 0) {
        this.toast.info(`${skipped} file${skipped === 1 ? '' : 's'} skipped because they are not supported videos.`);
      }
      return;
    }

    await this.importQueuedFiles(files, skipped);
  }

  async startSavedFolderImport(): Promise<void> {
    if (this.isAiImporting) {
      return;
    }

    if (!this.importFolderService.isSupported()) {
      this.showImportFoldersDialog = true;
      this.toast.error(this.importFolderService.supportMessage());
      return;
    }

    const folders = await this.importFolderService.listFolders();
    if (folders.length === 0) {
      this.showImportFoldersDialog = true;
      this.toast.info('Add at least one import folder first.');
      return;
    }

    const files = await this.importFolderService.collectVideoFiles();
    if (files.length === 0) {
      this.toast.info('No supported videos found in saved import folders.');
      return;
    }

    await this.importQueuedFiles(files, 0);
  }

  closeImportFoldersDialog(): void {
    this.showImportFoldersDialog = false;
    this.cdr.detectChanges();
  }

  private async importQueuedFiles(files: ImportFolderFile[], skipped: number): Promise<void> {
    this.isAiImporting = true;
    let nextIndex = 0;
    let completed = 0;
    let running = 0;
    const results: ImportResult[] = [];
    const workerCount = Math.min(this.aiImportConcurrency, files.length);

    const workers = Array.from({ length: workerCount }, async () => {
      while (nextIndex < files.length) {
        const index = nextIndex++;
        const item = files[index];
        running++;
        this.updateImportStatus(completed, files.length, running, item.relativePath);

        results[index] = await this.importSingleQueuedFile(item);

        running--;
        completed++;
        this.updateImportStatus(completed, files.length, running);
      }
    });

    await Promise.all(workers);

    const imported = results.filter(result => result?.imported).length;
    const hiddenByModeration = results.filter(result => result?.hiddenByModeration).length;
    const metadataFallbackNames = results
      .filter(result => result?.metadataFallbackName)
      .map(result => result.metadataFallbackName as string);
    const metadataFallbacks = metadataFallbackNames.length;
    const failedNames = results
      .filter(result => result && !result.imported && result.failedName)
      .map(result => result.failedName as string);
    const failed = failedNames.length;

    this.isAiImporting = false;
    this.aiImportStatus = '';
    this.loadLibraryClips();
    this.cdr.detectChanges();

    if (imported > 0) {
      const aiMetadataCount = imported - metadataFallbacks;
      if (aiMetadataCount > 0) {
        this.toast.success(`${aiMetadataCount} clip${aiMetadataCount === 1 ? '' : 's'} imported with AI metadata.`);
      }
    }
    if (metadataFallbacks > 0) {
      const preview = metadataFallbackNames.slice(0, 3).join(', ');
      this.toast.info(
        `${metadataFallbacks} clip${metadataFallbacks === 1 ? '' : 's'} imported, but AI metadata was unavailable so filename-based metadata was used${preview ? `: ${preview}` : ''}.`,
        9000
      );
    }
    if (hiddenByModeration > 0) {
      this.toast.info(`${hiddenByModeration} imported clip${hiddenByModeration === 1 ? '' : 's'} need moderation review and may not appear in Library yet.`, 6000);
    }
    if (skipped > 0) {
      this.toast.info(`${skipped} non-video or unsupported file${skipped === 1 ? '' : 's'} skipped.`);
    }
    if (failed > 0) {
      const preview = failedNames.slice(0, 3).join(', ');
      this.toast.error(`${failed} clip${failed === 1 ? '' : 's'} could not be imported${preview ? `: ${preview}` : ''}.`, 7000);
    }
  }

  private async importSingleQueuedFile(item: ImportFolderFile): Promise<ImportResult> {
    const file = item.file;
    const relativePath = item.relativePath;

    try {
      const upload = await firstValueFrom(this.clipService.uploadVideo(file));
      const metadata = await this.suggestMetadataOrFallback(file, relativePath, upload);

      const duration = upload.duration || 0;
      const clip: Clip = {
        id: 0,
        title: metadata.title || this.titleFromFileName(relativePath || file.name),
        game: metadata.game || 'Other',
        notes: metadata.notes || `Imported automatically from ${relativePath || file.name}.`,
        tags: metadata.tags || [],
        url: upload.secureUrl,
        thumbnailUrl: upload.thumbnailUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
        duration,
        currentTime: 0,
        startTime: 0,
        endTime: duration,
        uploaderId: this.authService.getCurrentUserId(),
        isFavorite: false,
        isDeleted: false,
        visibilityStatus: 'PRIVATE',
        dateCreated: new Date()
      };

      const created = await firstValueFrom(this.clipService.addClip(clip));
      let hiddenByModeration = false;
      try {
        const scanResult = await firstValueFrom(this.clipService.scanClipAfterUpload(created.clipId));
        hiddenByModeration = scanResult.visibilityStatus === 'HIDDEN' || scanResult.visibilityStatus === 'REMOVED';
      } catch {
        // The clip is still saved if moderation scan is temporarily unavailable.
      }

      return {
        imported: true,
        hiddenByModeration,
        metadataFallbackName: metadata.usedFallback ? relativePath : undefined
      };
    } catch (err) {
      console.error('AI import failed:', err);
      return { imported: false, hiddenByModeration: false, failedName: relativePath };
    }
  }

  private async suggestMetadataOrFallback(
    file: File,
    relativePath: string,
    upload: { secureUrl: string; thumbnailUrl?: string; duration?: number }
  ): Promise<ImportMetadata> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.aiMetadataAttempts; attempt++) {
      try {
        const metadata = await firstValueFrom(this.clipService.suggestClipMetadata({
          fileName: file.name,
          relativePath,
          videoUrl: upload.secureUrl,
          thumbnailUrl: upload.thumbnailUrl,
          duration: upload.duration,
          language: this.languageService.metadataLanguage()
        }));
        return { ...metadata, usedFallback: false };
      } catch (err) {
        lastError = err;
        console.warn(`AI metadata suggestion attempt ${attempt} failed:`, err);
        if (attempt < this.aiMetadataAttempts) {
          await this.delay(this.aiMetadataRetryDelayMs);
        }
      }
    }

    console.warn('AI metadata suggestion failed after retry; importing with fallback metadata:', lastError);
    const sourceName = relativePath || file.name;
    return {
      title: this.titleFromFileName(sourceName),
      game: 'Other',
      notes: `Imported automatically from ${sourceName}.`,
      tags: [],
      usedFallback: true
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateImportStatus(completed: number, total: number, running: number, currentPath?: string): void {
    if (completed >= total) {
      this.aiImportStatus = `Finishing ${total}/${total} imports`;
    } else {
      const runningText = running === 1 ? '1 clip' : `${running} clips`;
      this.aiImportStatus = currentPath
        ? `Importing ${completed}/${total} complete (${runningText} running): ${currentPath}`
        : `Importing ${completed}/${total} complete (${runningText} running)`;
    }
    this.cdr.detectChanges();
  }

  private isVideoFile(file: File): boolean {
    if (file.type.startsWith('video/')) {
      return true;
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return this.videoExtensions.has(extension);
  }

  private canDropImport(): boolean {
    return !this.isTrashView && this.libraryView === 'clips';
  }

  private async collectDroppedItems(items: DataTransferItem[]): Promise<ImportFolderFile[]> {
    const files: ImportFolderFile[] = [];
    for (const item of items) {
      const entry = this.entryFromItem(item);
      if (entry) {
        await this.collectDroppedEntry(entry, '', files);
        continue;
      }

      const file = item.kind === 'file' ? item.getAsFile() : null;
      if (file && this.isVideoFile(file)) {
        files.push({ file, relativePath: file.name });
      }
    }
    return files;
  }

  private entryFromItem(item: DataTransferItem): any | null {
    const webkitGetAsEntry = (item as any).webkitGetAsEntry;
    return typeof webkitGetAsEntry === 'function' ? webkitGetAsEntry.call(item) : null;
  }

  private async collectDroppedEntry(entry: any, parentPath: string, files: ImportFolderFile[]): Promise<void> {
    const entryPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
      if (this.isVideoFile(file)) {
        files.push({ file, relativePath: entryPath });
      }
      return;
    }

    if (entry.isDirectory) {
      const reader = entry.createReader();
      const children = await this.readAllDirectoryEntries(reader);
      for (const child of children) {
        await this.collectDroppedEntry(child, entryPath, files);
      }
    }
  }

  private async readAllDirectoryEntries(reader: any): Promise<any[]> {
    const entries: any[] = [];
    while (true) {
      const batch = await new Promise<any[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) {
        return entries;
      }
      entries.push(...batch);
    }
  }

  private titleFromFileName(fileName: string): string {
    const name = fileName.split(/[\\/]/).pop() || fileName;
    return name
      .replace(/\.[^/.]+$/, '')
      .replace(/[_\-.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'New Highlight';
  }

  private relativePathOf(file: File): string {
    return file.webkitRelativePath || file.name;
  }

  private refreshAvailableTags(): void {
    const tagNames = new Set(this.defaultTags);
    this.allClips
      .flatMap(clip => clip.tags || [])
      .filter(tag => tag && tag.trim())
      .forEach(tag => tagNames.add(tag.trim()));
    this.tags = ['All Tags', ...Array.from(tagNames).sort((a, b) => a.localeCompare(b))];
  }
}
