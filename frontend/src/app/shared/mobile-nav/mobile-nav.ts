import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';

import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { LanguageService, AppLanguage } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { ClipService } from '../../core/services/clip.service';
import { Clip } from '../../core/models/clip';
import { ClipPickerModal } from '../clip-picker-modal/clip-picker-modal';
import { ImportFoldersDialog } from '../import-folders-dialog/import-folders-dialog';
import { AddPostModal } from '../../features/add-post/add-post';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslocoModule, ClipPickerModal, ImportFoldersDialog, AddPostModal],
  templateUrl: './mobile-nav.html',
  styleUrl: './mobile-nav.css'
})
export class MobileNav implements OnInit {
  showClipPicker = false;
  showAddPostModal = false;
  isProfileSheetOpen = false;
  showSettingsDialog = false;
  unpostedClips: Clip[] = [];
  selectedClipToPost: Clip | null = null;

  profilePhotoUrl: string | null = null;
  profileUsername = '';

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    public languageService: LanguageService,
    public themeService: ThemeService,
    private clipService: ClipService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.profileService.getUserProfile(userId.toString()).subscribe(profile => {
        if (profile) {
          this.profilePhotoUrl = profile.profilePhotoUrl || null;
          this.profileUsername = profile.username || '';
        }
        this.cdr.detectChanges();
      });
    }
  }

  // Clip Picker
  openClipPicker(event: Event): void {
    event.preventDefault();
    const userId = this.authService.getCurrentUserId();
    this.clipService.getClips(userId).subscribe((clips: Clip[]) => {
      this.unpostedClips = clips.filter((c: Clip) => c.visibilityStatus !== 'PUBLIC' && !c.isDeleted);
      this.showClipPicker = true;
      this.cdr.detectChanges();
    });
  }

  closeClipPicker(): void {
    this.showClipPicker = false;
  }

  onClipPickerConfirm(clip: Clip): void {
    this.showClipPicker = false;
    this.selectedClipToPost = clip;
    this.showAddPostModal = true;
  }

  // Profile Bottom Sheet
  toggleProfileSheet(event: Event): void {
    event.preventDefault();
    this.isProfileSheetOpen = !this.isProfileSheetOpen;
  }

  closeProfileSheet(): void {
    this.isProfileSheetOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isProfileSheetOpen && !target.closest('.nav-profile-bottom-sheet') && !target.closest('.nav-item.profile-tab')) {
      this.closeProfileSheet();
    }
  }

  setLanguage(lang: AppLanguage): void {
    this.languageService.setUiLanguage(lang);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.closeProfileSheet();
    this.authService.logout();
    this.router.navigate(['/welcome']);
  }

  openSettings(): void {
    this.closeProfileSheet();
    this.showSettingsDialog = true;
  }

  closeSettings(): void {
    this.showSettingsDialog = false;
  }
}
