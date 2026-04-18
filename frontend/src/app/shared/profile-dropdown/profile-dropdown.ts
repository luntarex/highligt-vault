import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { User } from '../../core/models/user';

@Component({
  selector: 'app-profile-dropdown',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-dropdown.html',
  styleUrls: ['./profile-dropdown.css']
})
export class ProfileDropdown implements OnInit {
  user: User | null = null;
  isProfileMenuOpen: boolean = false;

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef,
    private router: Router
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

  toggleProfileMenu(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  signOut() {
    this.authService.logout();
    this.router.navigate(['/welcome']);
  }
}
