import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Sidebar } from "./shared/sidebar/sidebar";
import { Toast } from "./shared/toast/toast";
import { MessageNotificationService } from './core/services/message-notification.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Sidebar, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('highlight-vault');
  protected isAuthPage = false;

  constructor(
    private router: Router,
    private messageNotifications: MessageNotificationService
  ) {
    this.messageNotifications.start();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isAuthPage = ['/register', '/login', '/welcome', '/complete-profile'].includes(event.urlAfterRedirects);
        if (!this.isAuthPage) {
          this.messageNotifications.start();
        }
      }
    });
  }
}
