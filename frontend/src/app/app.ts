import { CommonModule } from '@angular/common';
import { Component, signal, ChangeDetectorRef, HostListener, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';

import { Sidebar } from "./shared/sidebar/sidebar";
import { MobileNav } from "./shared/mobile-nav/mobile-nav";
import { Toast } from "./shared/toast/toast";
import { MessageAlertComponent } from './shared/message-alert/message-alert';

import { MessageNotificationService } from './core/services/message-notification.service';
import { AuthService } from './core/services/auth.service';
import { ProfileService } from './core/services/profile.service';
import { LanguageService, AppLanguage } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterModule, 
    TranslocoModule,
    Sidebar, 
    MobileNav, 
    Toast, 
    MessageAlertComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('highlight-vault');
  protected isAuthPage = false;
  protected isFeedPage = false;
  
  // Left Drawer State
  isLeftDrawerOpen = false;
  profilePhotoUrl: string | null = null;
  profileUsername = '';
  isAdmin = false;

  constructor(
    private router: Router,
    private messageNotifications: MessageNotificationService,
    private authService: AuthService,
    private profileService: ProfileService,
    public languageService: LanguageService,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {
    this.messageNotifications.start();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        this.isAuthPage = ['/register', '/login', '/welcome', '/complete-profile'].includes(url);
        
        // Remove query params or fragments for precise matching
        const cleanUrl = url.split('?')[0].split('#')[0];
        this.isFeedPage = cleanUrl === '/' || cleanUrl === '/feed';
        
        if (!this.isAuthPage) {
          this.messageNotifications.start();
        }
        
        // Auto-close drawer on navigation
        if (this.isLeftDrawerOpen) {
           this.isLeftDrawerOpen = false;
        }
      }
    });
  }

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.profileService.getUserProfile(userId.toString()).subscribe(profile => {
        if (profile) {
          this.profilePhotoUrl = profile.profilePhotoUrl || null;
          this.profileUsername = profile.username || '';
        }
        this.isAdmin = this.authService.isAdmin();
        this.cdr.detectChanges();
      });
    }
  }

  toggleLeftDrawer(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isLeftDrawerOpen = !this.isLeftDrawerOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isLeftDrawerOpen && !target.closest('.left-drawer') && !target.closest('.mobile-menu-btn')) {
      this.isLeftDrawerOpen = false;
      this.cdr.detectChanges();
    }
  }

  setLanguage(lang: AppLanguage): void {
    this.languageService.setUiLanguage(lang);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
