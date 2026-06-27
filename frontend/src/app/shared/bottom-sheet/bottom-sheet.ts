import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable overlay primitive.
 *
 * Desktop (> 768px): renders as a centered modal card (offset beside the
 * sidebar, matching the app's existing modals).
 * Mobile (<= 768px): renders as a bottom sheet that slides up from the
 * bottom edge, with a grab handle and drag-to-dismiss.
 *
 * It only owns the scrim, the panel chrome (handle) and the dismiss
 * gestures. Consumers project their own header / body / footer via
 * <ng-content>, so existing modal markup can be wrapped with minimal change.
 */
@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-sheet.html',
  styleUrls: ['./bottom-sheet.css'],
})
export class BottomSheet {
  /** Desktop modal max-width in px. */
  @Input() maxWidth = 600;
  /** Desktop modal height (vh). When null the card is content-sized. */
  @Input() heightVh: number | null = null;
  /** Offset the desktop card to the right of the sidebar (for content-area modals). */
  @Input() offsetSidebar = false;
  /** Stacking order of the scrim. */
  @Input() zIndex = 1000;
  /** Emitted when the user dismisses via scrim, swipe-down, or Escape. */
  @Output() closed = new EventEmitter<void>();

  /** Live vertical drag offset (px, mobile only). */
  dragY = 0;
  /** True while a drag gesture is in progress (disables the snap transition). */
  dragging = false;

  private startY = 0;
  private panelHeight = 0;

  onHandleDown(event: PointerEvent): void {
    // Only sheet (mobile) layout is draggable; desktop has no handle visible.
    if (!this.isMobile()) return;
    this.dragging = true;
    this.startY = event.clientY;
    const panel = (event.currentTarget as HTMLElement).closest('.bs-panel') as HTMLElement;
    this.panelHeight = panel?.offsetHeight ?? window.innerHeight * 0.85;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onHandleMove(event: PointerEvent): void {
    if (!this.dragging) return;
    // Only allow dragging downward.
    this.dragY = Math.max(0, event.clientY - this.startY);
  }

  onHandleUp(): void {
    if (!this.dragging) return;
    this.dragging = false;
    const dismissThreshold = Math.min(140, this.panelHeight * 0.3);
    if (this.dragY > dismissThreshold) {
      this.close();
    } else {
      this.dragY = 0;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  private isMobile(): boolean {
    return window.matchMedia('(max-width: 768px)').matches;
  }
}
