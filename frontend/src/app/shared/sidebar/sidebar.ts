import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmDialog],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit {
  isCollapsed = false;
  userId: number | null = null;

  constructor(
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.userId = this.authService.getCurrentUserId();
    }
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
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
