import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar {
  isCollapsed = false;
  @Output() uploadClicked = new EventEmitter<void>();

  playlists: string[] = ['2024 Montage', 'Funny Moments', 'Best Clutches'];

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
