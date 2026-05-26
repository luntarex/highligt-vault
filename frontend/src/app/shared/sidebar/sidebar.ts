import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar {
  isCollapsed = false;

  constructor(
    public authService: AuthService
  ) {}

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
