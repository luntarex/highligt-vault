import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Clip } from '../../../core/models/clip';
import { Router } from "@angular/router";

@Component({
  selector: 'app-clip-card',
  imports: [CommonModule],
  templateUrl: './clip-card.html',
  styleUrl: './clip-card.css',
})
export class ClipCard {
  @Input() clip!: Clip;
  @Input() mode: 'library' | 'trash' = 'library';
  @Output() removeClip = new EventEmitter<number>();
  @Output() recoverClip = new EventEmitter<number>();
  @Output() hardDeleteClip = new EventEmitter<number>();

  constructor(private router: Router) {}

  onDelete(event: Event) {
    event.stopPropagation();
    this.removeClip.emit(this.clip.id);
  }

  onHardDelete(event: Event) {
    event.stopPropagation();
    this.hardDeleteClip.emit(this.clip.id);
  }

  handleCardClick(event: Event) {
    if (this.mode === 'library') {
      this.router.navigate(['/clip-editor', this.clip.id]);
    } else if (this.mode === 'trash') {
      this.recoverClip.emit(this.clip.id);
    }
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
