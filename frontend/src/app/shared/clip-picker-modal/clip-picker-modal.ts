import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Clip } from '../../core/models/clip';

@Component({
  selector: 'app-clip-picker-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clip-picker-modal.html',
  styleUrls: ['./clip-picker-modal.css']
})
export class ClipPickerModal {
  @Input() clips: Clip[] = [];
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<Clip>();

  searchQuery: string = '';
  selectedClipId: number | null = null;
  
  get filteredClips(): Clip[] {
    if (!this.searchQuery) return this.clips;
    const lowerQuery = this.searchQuery.toLowerCase();
    return this.clips.filter(clip => 
      clip.title.toLowerCase().includes(lowerQuery) || 
      clip.game?.toLowerCase().includes(lowerQuery) ||
      clip.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  selectClip(clipId: number): void {
    // Only one clip can be selected
    this.selectedClipId = clipId;
  }

  isSelected(clipId: number): boolean {
    return this.selectedClipId === clipId;
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    if (this.selectedClipId !== null) {
      const selected = this.clips.find(c => c.id === this.selectedClipId);
      if (selected) {
        this.confirm.emit(selected);
      }
    }
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getDisplayDuration(clip: Clip): number {
    const start = clip.startTime ?? 0;
    const clipDuration = clip.duration ?? 0;
    const end = clip.endTime && clip.endTime > start ? clip.endTime : clipDuration;
    const selected = end - start;
    return selected > 0 ? selected : clipDuration;
  }
}
