import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ExplorePost } from '../../../core/models/explore-post';

@Component({
  selector: 'app-explore-grid-card',
  templateUrl: './explore-grid-card.html',
  styleUrls: ['./explore-grid-card.css'],
  imports: [RouterLink, TranslocoModule]
})
export class ExploreGridCard {
  @Input() post!: ExplorePost;
  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  isImage(): boolean {
    const url = this.post?.videoUrl || '';
    if (!url) return false;
    if (/\/image\/upload\//i.test(url) || /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(url)) return true;
    if (/\/video\/upload\//i.test(url) || /\.(m3u8|mov|mp4|mpeg|mpg|ogg|ogv|webm)(?:$|[?#])/i.test(url)) return false;
    return this.post.postType === 'CLIP' && Number(this.post.duration || 0) === 0;
  }

  onEnter(): void {
    const v = this.videoRef?.nativeElement;
    if (!v) return;
    v.currentTime = this.post.startTime || 0;
    v.play().catch(() => {});
  }

  onLeave(): void {
    this.videoRef?.nativeElement?.pause();
  }
}
