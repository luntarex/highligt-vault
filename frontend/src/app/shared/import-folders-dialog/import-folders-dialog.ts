import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { ImportFolderService, SavedImportFolder } from '../../core/services/import-folder.service';
import { ToastService } from '../../core/services/toast.service';
import { AppLanguage, LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-import-folders-dialog',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './import-folders-dialog.html',
  styleUrl: './import-folders-dialog.css'
})
export class ImportFoldersDialog implements OnInit {
  @Output() closed = new EventEmitter<void>();

  folders: SavedImportFolder[] = [];
  isAdding = false;

  constructor(
    public importFolderService: ImportFolderService,
    public languageService: LanguageService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  setMetadataLanguage(lang: AppLanguage): void {
    this.languageService.setMetadataLanguage(lang);
  }

  ngOnInit(): void {
    this.loadFolders();
  }

  async addFolder(): Promise<void> {
    if (!this.importFolderService.isSupported()) {
      this.toast.error(this.importFolderService.supportMessage());
      return;
    }

    try {
      this.isAdding = true;
      this.cdr.detectChanges();
      const folder = await this.importFolderService.addFolder();
      if (folder) {
        this.toast.success('Import folder saved.');
      }
      await this.loadFolders();
    } catch (err) {
      this.toast.info('Folder selection was cancelled.');
    } finally {
      this.isAdding = false;
      this.cdr.detectChanges();
    }
  }

  async removeFolder(id: string): Promise<void> {
    await this.importFolderService.removeFolder(id);
    await this.loadFolders();
  }

  close(): void {
    this.closed.emit();
  }

  private async loadFolders(): Promise<void> {
    this.folders = await this.importFolderService.listFolders();
    this.cdr.detectChanges();
  }
}
