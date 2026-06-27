import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Clip } from '../../../core/models/clip';
import { Router } from "@angular/router";
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-clip-card',
  imports: [CommonModule, TranslocoModule],
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
  /** Touch long-press on a library clip — used to enter multi-select. */
  @Output() longPress = new EventEmitter<number>();

  private longPressTimer: number | null = null;
  private longPressFired = false;

  constructor(private router: Router, private transloco: TranslocoService) {}

  onPointerDown(event: PointerEvent) {
    // Only enable long-press selection for touch in the library grid.
    if (event.pointerType !== 'touch' || this.mode !== 'library' || this.isModerationLocked()) {
      return;
    }
    this.longPressFired = false;
    this.longPressTimer = window.setTimeout(() => {
      this.longPressFired = true;
      this.longPress.emit(this.clip.id);
    }, 450);
  }

  cancelLongPress() {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

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
    // Swallow the click that ends a long-press so it doesn't also navigate.
    if (this.longPressFired) {
      this.longPressFired = false;
      return;
    }
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
    if (this.clip.moderationStatus === 'APPEALED') return this.transloco.translate('clipCard.label.appealPending');
    if (this.clip.moderationStatus === 'NEEDS_MANUAL_REVIEW') return this.transloco.translate('clipCard.label.needsReview');
    if (this.clip.moderationStatus === 'REJECTED') return this.transloco.translate('clipCard.label.rejected');
    if (this.clip.moderationStatus === 'REMOVED') return this.transloco.translate('clipCard.label.removed');
    if (this.clip.visibilityStatus === 'HIDDEN') return this.transloco.translate('clipCard.label.hidden');
    return '';
  }

  moderationMessage(): string {
    if (this.clip.moderationStatus === 'APPEALED') {
      return this.transloco.translate('clipCard.message.appealed');
    }
    if (this.clip.moderationStatus === 'NEEDS_MANUAL_REVIEW') {
      return this.transloco.translate('clipCard.message.needsReview');
    }
    if (this.clip.moderationStatus === 'REJECTED') {
      return this.clip.moderationReason || this.transloco.translate('clipCard.message.rejected');
    }
    if (this.clip.visibilityStatus === 'HIDDEN') {
      return this.clip.moderationReason || this.transloco.translate('clipCard.message.hidden');
    }
    return this.transloco.translate('clipCard.message.unavailable');
  }
}
