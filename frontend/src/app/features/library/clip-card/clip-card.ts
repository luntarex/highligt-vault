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
  @Input() mode: 'library' | 'trash' | 'favorites' = 'library';
  @Input() selectable = false;
  @Input() selected = false;
  @Input() showRemoveFromGroup = false;
  @Output() removeClip = new EventEmitter<number>();
  @Output() recoverClip = new EventEmitter<number>();
  @Output() hardDeleteClip = new EventEmitter<number>();
  @Output() playClip = new EventEmitter<Clip>();
  @Output() appealClip = new EventEmitter<number>();
  @Output() selectionChange = new EventEmitter<{ id: number; selected: boolean }>();
  @Output() removeFromGroup = new EventEmitter<number>();

  constructor(private router: Router) {}

  onDelete(event: Event) {
    event.stopPropagation();
    this.removeClip.emit(this.clip.id);
  }

  onHardDelete(event: Event) {
    event.stopPropagation();
    this.hardDeleteClip.emit(this.clip.id);
  }

  onRemoveFromGroup(event: Event) {
    event.stopPropagation();
    this.removeFromGroup.emit(this.clip.id);
  }

  handleCardClick(event: Event) {
    if (this.selectable && this.mode !== 'trash') {
      this.toggleSelection(event);
      return;
    }
    if (this.isModerationLocked()) {
      return;
    }
    if (this.mode === 'library') {
      this.router.navigate(['/clip-editor', this.clip.id]);
    } else if (this.mode === 'favorites') {
      this.playClip.emit(this.clip);
    } else if (this.mode === 'trash' && this.canRecoverFromTrash()) {
      this.recoverClip.emit(this.clip.id);
    }
  }

  toggleSelection(event: Event) {
    event.stopPropagation();
    this.selectionChange.emit({ id: this.clip.id, selected: !this.selected });
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  getDisplayDuration(): number {
    const start = this.clip.startTime ?? 0;
    const fullDuration = this.clip.duration ?? 0;
    const end = this.clip.endTime && this.clip.endTime > start ? this.clip.endTime : fullDuration;
    const selected = end - start;
    return selected > 0 ? selected : fullDuration;
  }

  isModerationLocked(): boolean {
    return this.mode === 'library'
      && (this.clip.visibilityStatus === 'HIDDEN'
        || this.clip.moderationStatus === 'REJECTED'
        || this.clip.moderationStatus === 'NEEDS_MANUAL_REVIEW'
        || this.clip.moderationStatus === 'APPEALED');
  }

  canAppeal(): boolean {
    return this.mode === 'library'
      && this.clip.moderationStatus === 'REJECTED';
  }

  isModerationRemoved(): boolean {
    return this.clip.moderationStatus === 'REMOVED'
      || !!this.clip.removedReason;
  }

  canRecoverFromTrash(): boolean {
    return this.mode === 'trash' && !this.isModerationRemoved();
  }

  moderationLabel(): string {
    if (this.clip.moderationStatus === 'APPEALED') return 'Appeal pending';
    if (this.clip.moderationStatus === 'NEEDS_MANUAL_REVIEW') return 'Needs review';
    if (this.clip.moderationStatus === 'REJECTED') return 'Rejected';
    if (this.clip.moderationStatus === 'REMOVED') return 'Removed by moderation';
    if (this.clip.visibilityStatus === 'HIDDEN') return 'Hidden';
    return '';
  }

  moderationMessage(): string {
    if (this.clip.moderationStatus === 'APPEALED') {
      return 'Your appeal is waiting for moderator review.';
    }
    if (this.clip.moderationStatus === 'NEEDS_MANUAL_REVIEW') {
      return 'Waiting for moderator review before this clip can be shared.';
    }
    if (this.clip.moderationStatus === 'REJECTED') {
      return this.clip.moderationReason || 'This clip was rejected by moderation.';
    }
    if (this.clip.visibilityStatus === 'HIDDEN') {
      return this.clip.moderationReason || 'This clip is hidden until moderation is complete.';
    }
    return 'This clip is not available publicly.';
  }
}
