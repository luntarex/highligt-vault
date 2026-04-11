import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Clip } from '../../../core/models/clip';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-clip-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './clip-card.html',
  styleUrl: './clip-card.css',
})
export class ClipCard {
  @Input() clip!: Clip;
  @Output() removeClip = new EventEmitter<number>();

  onDelete(event: Event) {
    event.stopPropagation();
    this.removeClip.emit(this.clip.id);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
