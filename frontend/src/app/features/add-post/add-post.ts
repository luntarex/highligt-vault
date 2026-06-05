import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Clip } from '../../core/models/clip';
import { ClipService } from '../../core/services/clip.service';
import { ExploreService } from '../../core/services/explore.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { BackLink } from '../../shared/back-link/back-link';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-add-post',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackLink, TranslocoModule],
  templateUrl: './add-post.html',
  styleUrls: ['./add-post.css']
})
export class AddPostPage implements OnInit {
  clip: Clip | null = null;
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
    private route: ActivatedRoute,
    private router: Router,
    private clipService: ClipService,
    private exploreService: ExploreService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const clipId = Number(idParam);
      this.clipService.getClip(clipId).subscribe({
        next: (originalClip) => {
          if (originalClip) {
            // ensure tags is an array
            this.clip = { ...originalClip, tags: originalClip.tags ? [...originalClip.tags] : [] };
            this.cdr.detectChanges();
          } else {
            this.router.navigate(['/']);
          }
        },
        error: () => this.router.navigate(['/'])
      });
    } else {
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy(): void {
    this.stopProgressLoop();
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

  onTimeUpdate(video: HTMLVideoElement) {
    if (this.trimEnd > this.trimStart && video.currentTime >= this.trimEnd) {
      video.currentTime = this.trimStart;
      if (!video.paused) {
        video.pause();
      }
      this.isPlaying = false;
      this.stopProgressLoop();
    }

    if (!this.isPlaying) {
      this.currentTime = Math.max(0, video.currentTime - this.trimStart);
      this.cdr.detectChanges();
    }
  }

  onMetadataLoaded(video: HTMLVideoElement) {
    this.trimStart = this.clip?.startTime ?? 0;
    const clipEnd = this.clip?.endTime ?? 0;
    this.trimEnd = clipEnd > this.trimStart ? Math.min(clipEnd, video.duration) : video.duration;
    this.duration = Math.max(0, this.trimEnd - this.trimStart);
    video.currentTime = this.trimStart;
    this.currentTime = 0;
    this.cdr.detectChanges();
  }

  togglePlay(video: HTMLVideoElement) {
    if (video.paused) {
      video.play();
      this.isPlaying = true;
      this.startProgressLoop(video);
    } else {
      video.pause();
      this.isPlaying = false;
      this.stopProgressLoop();
    }
  }

  onToggleMute(event: MouseEvent, video: HTMLVideoElement) {
    event.stopPropagation();
    video.muted = !video.muted;
  }

  private startProgressLoop(video: HTMLVideoElement) {
    this.stopProgressLoop();
    const update = () => {
      if (this.trimEnd > this.trimStart && video.currentTime >= this.trimEnd) {
        video.currentTime = this.trimStart;
        video.pause();
        this.isPlaying = false;
        this.currentTime = 0;
        this.cdr.detectChanges();
        this.stopProgressLoop();
        return;
      }

      this.currentTime = Math.max(0, video.currentTime - this.trimStart);
      this.cdr.detectChanges();
      this.animationFrameId = requestAnimationFrame(update);
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopProgressLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  onSeekTo(event: MouseEvent, video: HTMLVideoElement) {
    event.stopPropagation();
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    video.currentTime = this.trimStart + (percentage * this.duration);
    this.currentTime = Math.max(0, video.currentTime - this.trimStart);
    this.cdr.detectChanges();
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
