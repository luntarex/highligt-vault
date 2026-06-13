import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';

export interface CroppedAvatar {
  file: File;
  previewUrl: string;
}

const VIEWPORT = 300;
const OUTPUT = 512;
const MAX_ZOOM = 3;

@Component({
  selector: 'app-avatar-cropper',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './avatar-cropper.html',
  styleUrl: './avatar-cropper.css',
})
export class AvatarCropper implements OnInit {
  @Input() file!: File;
  @Output() cropped = new EventEmitter<CroppedAvatar>();
  @Output() cancelled = new EventEmitter<void>();

  readonly viewport = VIEWPORT;

  imageUrl: string = '';
  loaded = false;
  saving = false;

  // Layout state (in viewport pixels)
  zoom = 1;
  posX = 0;
  posY = 0;
  dispW = 0;
  dispH = 0;

  private img = new Image();
  private baseScale = 1;
  private dragging = false;
  private startClientX = 0;
  private startClientY = 0;
  private startPosX = 0;
  private startPosY = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.imageUrl = URL.createObjectURL(this.file);
    this.img.onload = () => {
      const w = this.img.naturalWidth;
      const h = this.img.naturalHeight;
      this.baseScale = Math.max(VIEWPORT / w, VIEWPORT / h);
      this.zoom = 1;
      this.dispW = w * this.baseScale;
      this.dispH = h * this.baseScale;
      this.posX = (VIEWPORT - this.dispW) / 2;
      this.posY = (VIEWPORT - this.dispH) / 2;
      this.clamp();
      this.loaded = true;
      this.cdr.detectChanges();
    };
    this.img.src = this.imageUrl;
  }

  onZoomChange(value: number | string): void {
    const next = Math.max(1, Math.min(MAX_ZOOM, Number(value)));
    this.applyZoom(next, VIEWPORT / 2, VIEWPORT / 2);
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.loaded) return;
    this.dragging = true;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;
    this.startPosX = this.posX;
    this.startPosY = this.posY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    this.posX = this.startPosX + (event.clientX - this.startClientX);
    this.posY = this.startPosY + (event.clientY - this.startClientY);
    this.clamp();
  }

  onPointerUp(event: PointerEvent): void {
    this.dragging = false;
    try {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* pointer may already be released */
    }
  }

  apply(): void {
    if (!this.loaded || this.saving) return;
    this.saving = true;

    const dispScale = this.baseScale * this.zoom;
    const sourceSize = VIEWPORT / dispScale;
    const sourceX = -this.posX / dispScale;
    const sourceY = -this.posY / dispScale;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.saving = false;
      return;
    }
    ctx.drawImage(
      this.img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT,
      OUTPUT
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.saving = false;
          this.cdr.detectChanges();
          return;
        }
        const name = this.renamedFile(this.file.name);
        const file = new File([blob], name, { type: 'image/jpeg' });
        this.cropped.emit({ file, previewUrl: URL.createObjectURL(blob) });
      },
      'image/jpeg',
      0.92
    );
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private applyZoom(nextZoom: number, anchorX: number, anchorY: number): void {
    const prevScale = this.baseScale * this.zoom;
    const srcAnchorX = (anchorX - this.posX) / prevScale;
    const srcAnchorY = (anchorY - this.posY) / prevScale;

    this.zoom = nextZoom;
    const nextScale = this.baseScale * nextZoom;
    this.dispW = this.img.naturalWidth * nextScale;
    this.dispH = this.img.naturalHeight * nextScale;
    this.posX = anchorX - srcAnchorX * nextScale;
    this.posY = anchorY - srcAnchorY * nextScale;
    this.clamp();
  }

  private clamp(): void {
    this.posX = Math.min(0, Math.max(VIEWPORT - this.dispW, this.posX));
    this.posY = Math.min(0, Math.max(VIEWPORT - this.dispH, this.posY));
  }

  private renamedFile(original: string): string {
    const base = original.replace(/\.[^/.]+$/, '') || 'avatar';
    return `${base}.jpg`;
  }
}
