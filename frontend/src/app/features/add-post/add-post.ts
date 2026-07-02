import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Clip } from '../../core/models/clip';
import { ClipService } from '../../core/services/clip.service';
import { ExploreService } from '../../core/services/explore.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TranslocoModule } from '@jsverse/transloco';
import { VideoPlayerComponent } from '../../shared/video-player/video-player';

@Component({
  selector: 'app-add-post-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoModule, VideoPlayerComponent],
  templateUrl: './add-post.html',
  styleUrls: ['./add-post.css']
})
export class AddPostModal implements OnInit, OnDestroy {
  @Input() clip: Clip | null = null;
  @Output() close = new EventEmitter<void>();

  caption: string = '';
  newTag: string = '';
  isSubmitting = false;
  isPlaying = false;
  currentTime = 0;
  duration = 0;
  private animationFrameId: number | null = null;
  private trimStart = 0;
  private trimEnd = 0;

  constructor(
    private router: Router,
    private clipService: ClipService,
    private exploreService: ExploreService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.clip) {
      this.clip = { ...this.clip, tags: this.clip.tags ? [...this.clip.tags] : [] };
    }
  }

  ngOnDestroy(): void {
  }

  addTag(): void {
    if (this.newTag.trim() && this.clip) {
      const tag = this.newTag.trim().toLowerCase();
      if (!this.clip.tags.includes(tag)) {
        this.clip.tags.push(tag);
      }
      this.newTag = '';
    }
  }

  removeTag(index: number): void {
    if (this.clip) {
      this.clip.tags.splice(index, 1);
    }
  }

  submitPost(): void {
    if (!this.clip || !this.caption.trim()) return;

    this.isSubmitting = true;
    this.cdr.detectChanges();

    // 1. Update clip metadata first. The backend scanner decides whether it can become public.
    this.clipService.updateClip(this.clip).subscribe({
      next: () => {
        // 2. Create the explicit post. Backend moderation decides feed visibility.
        const postData = {
          userId: this.authService.getCurrentUserId(),
          clipId: this.clip!.id,
          caption: this.caption.trim()
        };
        this.exploreService.addPost(postData).subscribe({
          next: (response) => {
            this.ngZone.run(() => {
              this.isSubmitting = false;
              this.cdr.detectChanges();
              this.close.emit();
              if (response?.published === false) {
                this.toast.info('Post saved, but this clip is waiting for moderation review.');
                this.router.navigate(['/library']);
              } else {
                this.toast.success('Post published to feed!');
                this.router.navigate(['/']);
              }
            });
          },
          error: (err) => {
             console.error("Failed to create post", err);
             this.ngZone.run(() => {
               this.isSubmitting = false;
               this.cdr.detectChanges();
               this.toast.error("Failed to submit post.");
             });
          }
        });
      },
      error: (err) => {
        console.error("Failed to update clip", err);
        this.ngZone.run(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
          this.toast.error("Failed to update clip details.");
        });
      }
    });
  }

  // Video playback is handled by AppVideoPlayer
}
