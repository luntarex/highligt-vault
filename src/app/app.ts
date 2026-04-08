import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Sidebar } from "./shared/sidebar/sidebar";
import { CustomUpload } from './shared/custom-upload/custom-upload';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Sidebar, CustomUpload],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('highlight-vault');
  protected showUpload = false;
  protected isAuthPage = false;

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isAuthPage = ['/register', '/login'].includes(event.urlAfterRedirects);
      }
    });
  }

  onUploadClick() {
    this.showUpload = true;
  }

  onUploadClose() {
    this.showUpload = false;
  }
}
