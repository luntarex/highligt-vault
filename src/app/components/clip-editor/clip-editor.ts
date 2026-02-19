import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Clip } from '../../models/clip';
import { ClipService } from '../../services/clip.service';
import { BackLink } from '../back-link/back-link';


@Component({
  selector: 'app-clip-editor',
  imports: [CommonModule, FormsModule, RouterModule, BackLink],
  templateUrl: './clip-editor.html',
  styleUrl: './clip-editor.css',
})
export class ClipEditor implements OnInit {
  clip: Clip | undefined;
  newTag: string = '';
  isPlaying: boolean = false;
  isDraggingStart: boolean = false;
  isDraggingEnd: boolean = false;
  isDraggingSeek: boolean = false;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('timeline') timelineRef!: ElementRef<HTMLDivElement>;

  constructor(private clipService: ClipService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const clipId = idParam ? Number(idParam) : null;
    if (clipId) {
      const originalClip = this.clipService.getClip(clipId);
      if (originalClip) {
        this.clip = { ...originalClip, tags: [...originalClip.tags] };
      }
    }
  }

  togglePlay(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  onTimeUpdate(videoElement: HTMLVideoElement): void {
    if (!this.clip || this.isDraggingSeek) return;
    const { duration, currentTime } = videoElement;
    if (!duration) return;


    if (!this.clip.duration || Math.abs(this.clip.duration - duration) > 0.5) {
      this.clip.duration = duration;
      if (this.clip.endTime === 0 || this.clip.endTime > duration) {
        this.clip.endTime = duration;
      }
    }

    this.clip.currentTime = currentTime;


    if (this.isPlaying && currentTime >= this.clip.endTime) {
      videoElement.pause();
      this.isPlaying = false;
      this.clip.currentTime = this.clip.startTime;
      videoElement.currentTime = this.clip.startTime;
    }
  }

  seekTo(event: MouseEvent): void {
    if (!this.clip || !this.timelineRef) return;
    const timeline = this.timelineRef.nativeElement;
    const rect = timeline.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = percentage * this.clip.duration;

    this.clip.currentTime = newTime;
    if (this.videoRef && this.videoRef.nativeElement) {
      this.videoRef.nativeElement.currentTime = newTime;
    }
  }

  startDrag(type: 'start' | 'end', event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'start') this.isDraggingStart = true;
    if (type === 'end') this.isDraggingEnd = true;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.clip || (!this.isDraggingStart && !this.isDraggingEnd)) return;

    if (!this.timelineRef) return;
    const timeline = this.timelineRef.nativeElement;
    const rect = timeline.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = percentage * this.clip.duration;

    if (this.isDraggingStart) {
      this.clip.startTime = Math.min(newTime, this.clip.endTime - 1);
      this.clip.currentTime = this.clip.startTime;
      if (this.videoRef) this.videoRef.nativeElement.currentTime = this.clip.startTime;
    } else if (this.isDraggingEnd) {
      this.clip.endTime = Math.max(newTime, this.clip.startTime + 1);
    }
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.isDraggingStart = false;
    this.isDraggingEnd = false;
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  addTag(): void {
    if (this.newTag.trim()) {
      this.clip?.tags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  removeTag(index: number): void {
    if (this.clip) {
      this.clip.tags.splice(index, 1);
    }
  }

  saveClip(): void {
    if (this.clip) {
      this.clipService.updateClip(this.clip);
      this.router.navigate(['/']);
    }
  }
}
