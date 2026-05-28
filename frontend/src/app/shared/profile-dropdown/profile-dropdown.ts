import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { User } from '../../core/models/user';
import { ImportFoldersDialog } from '../import-folders-dialog/import-folders-dialog';

@Component({
  selector: 'app-profile-dropdown',
  standalone: true,
  imports: [CommonModule, RouterLink, ImportFoldersDialog],
  templateUrl: './profile-dropdown.html',
  styleUrls: ['./profile-dropdown.css']
})
export class ProfileDropdown implements OnInit {
  user: User | null = null;
  isProfileMenuOpen: boolean = false;
  showSettingsDialog = false;

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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

  toggleProfileMenu(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/welcome']);
  }

  openSettings(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen = false;
    this.showSettingsDialog = true;
    this.cdr.detectChanges();
  }

  closeSettings(): void {
    this.showSettingsDialog = false;
    this.cdr.detectChanges();
  }
}
