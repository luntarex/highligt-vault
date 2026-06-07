import { Component, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ProfileDropdown } from '../profile-dropdown/profile-dropdown';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoModule, ProfileDropdown],
  templateUrl: './mobile-nav.html',
  styleUrls: ['./mobile-nav.css']
})
export class MobileNav {
  isAdminMenuOpen = false;

  constructor(
    public authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  toggleAdminMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isAdminMenuOpen = !this.isAdminMenuOpen;
  }

  closeAdminMenu(): void {
    this.isAdminMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.mobile-nav-admin') && this.isAdminMenuOpen) {
      this.isAdminMenuOpen = false;
      this.cdr.detectChanges();
    }
  }
}
