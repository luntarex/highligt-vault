import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Clip } from '../../models/clip';
import { ClipService } from '../../services/clip.service';

@Component({
  selector: 'app-custom-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-upload.html',
  styleUrl: './custom-upload.css',
})
export class CustomUpload implements OnInit {
  clips: Clip[] = [];
  filteredClips: Clip[] = [];
  selectedClipIds: Set<number> = new Set();
  searchQuery: string = '';

  @Output() close = new EventEmitter<void>();

  constructor(private clipService: ClipService) {}

  ngOnInit(): void {
    this.clips = this.clipService.getClips();
    this.filteredClips = this.clips;
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.filteredClips = this.clips;
      return;
    }
    const query = this.searchQuery.toLowerCase();
    this.filteredClips = this.clips.filter(clip =>
      clip.title.toLowerCase().includes(query) ||
      clip.game.toLowerCase().includes(query)
    );
  }

  toggleSelection(clipId: number): void {
    if (this.selectedClipIds.has(clipId)) {
      this.selectedClipIds.delete(clipId);
    } else {
      this.selectedClipIds.add(clipId);
    }
  }

  isSelected(clipId: number): boolean {
    return this.selectedClipIds.has(clipId);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  onCancel(): void {
    console.log('Cancelled');
    this.close.emit();
  }

  onConfirm(): void {
    console.log('Confirmed selection:', Array.from(this.selectedClipIds));
  }
}
