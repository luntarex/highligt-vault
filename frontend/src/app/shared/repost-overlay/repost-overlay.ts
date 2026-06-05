import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExplorePost } from '../../core/models/explore-post';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-repost-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule],
  templateUrl: './repost-overlay.html',
  styleUrls: ['./repost-overlay.css']
})
export class RepostOverlayComponent {
  @Input() post!: ExplorePost;
  @Input() repostPanelPosition: Record<string, string> = {};
  @Input() isMediaPost: boolean = false;
  @Input() isReposting: boolean = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() submitRepost = new EventEmitter<{ mode: 'SELECT' | 'QUOTE', text: string, mediaFile: File | null }>();

  repostMode: 'SELECT' | 'QUOTE' = 'SELECT';
  quoteText = '';
  quoteMediaFile: File | null = null;
  quoteMediaPreview = '';
  quoteIsVideo = false;

  constructor(private cdr: ChangeDetectorRef) {}

  selectRepostMode(mode: 'SELECT' | 'QUOTE') {
    this.repostMode = mode;
    if (mode === 'SELECT') {
      this.doSubmit();
    }
  }

  doSubmit() {
    this.submitRepost.emit({
      mode: this.repostMode,
      text: this.quoteText,
      mediaFile: this.quoteMediaFile
    });
  }

  onClose() {
    this.close.emit();
  }

  onQuoteMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        this.quoteMediaFile = file;
        this.quoteIsVideo = file.type.startsWith('video/');
        if (this.quoteMediaPreview) {
          URL.revokeObjectURL(this.quoteMediaPreview);
        }
        this.quoteMediaPreview = URL.createObjectURL(file);
        this.cdr.detectChanges();
      }
    }
    input.value = '';
  }

  removeQuoteMedia(): void {
    this.quoteMediaFile = null;
    if (this.quoteMediaPreview) {
      URL.revokeObjectURL(this.quoteMediaPreview);
      this.quoteMediaPreview = '';
    }
    this.quoteIsVideo = false;
  }

  isImageMedia(post: ExplorePost | null | undefined): boolean {
    const url = post?.videoUrl || '';
    if (!url) return false;
    if (url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) return true;
    if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) return false;
    return post?.postType === 'CLIP' && Number(post.duration || 0) === 0;
  }

  currentUserPhoto(): string {
    return localStorage.getItem('profile_photo_url') || 'assets/icons/profile-pic.svg';
  }
}
