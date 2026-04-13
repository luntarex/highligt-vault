import { Component, OnInit, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Clip } from '../../core/models/clip';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { BackLink } from '../../shared/back-link/back-link';
import { CustomDropdownComponent } from '../../shared/custom-dropdown/custom-dropdown';

@Component({
  selector: 'app-clip-editor',
  imports: [CommonModule, FormsModule, RouterModule, BackLink, CustomDropdownComponent],
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
  fileToUpload: File | null = null;
  isUploading: boolean = false;
  uploadStatus: string = '';

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('timeline') timelineRef!: ElementRef<HTMLDivElement>;

  constructor(
    private clipService: ClipService, 
    private route: ActivatedRoute, 
    private router: Router, 
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (idParam === 'new') {
      const state = history.state;
      if (state && state.videoUrl) {
         this.fileToUpload = state.file || null;
         this.clip = {
           id: 0,
           title: 'My Highlight',
           game: '',
           notes: '',
           tags: [],
           url: state.videoUrl,
           thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop', // Temporary thumbnail
           duration: 0,
           currentTime: 0,
           startTime: 0,
           endTime: 0,
           uploaderId: this.authService.getCurrentUserId(),
           isFavorite: false,
           isDeleted: false,
           dateCreated: new Date()
         };
      } else {
         this.router.navigate(['/']);
      }
    } else {
      const clipId = idParam ? Number(idParam) : null;
      if (clipId) {
        this.clipService.getClip(clipId).subscribe(originalClip => {
          if (originalClip) {
            this.clip = { ...originalClip, tags: [...originalClip.tags] };
            this.cdr.detectChanges();
          }
        });
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
      if (this.clip.id === 0 && !this.isUploading) {
        if (!this.fileToUpload) {
          alert("No video file selected!");
          return;
        }
        
        this.isUploading = true;
        this.uploadStatus = 'Uploading video to stream server...';
        this.cdr.detectChanges();
        
        const formData = new FormData();
        formData.append('file', this.fileToUpload);
        
        fetch('https://tmpfiles.org/api/v1/upload', {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(data => {
            if(data.status === 'success') {
                let rawUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                this.clip!.url = rawUrl;
                
                this.uploadStatus = 'Saving highlight to vault...';
                this.cdr.detectChanges();

                this.clipService.addClip(this.clip!).subscribe(() => {
                    this.isUploading = false;
                    this.cdr.detectChanges();
                    this.router.navigate(['/']);
                });
            } else {
                this.isUploading = false;
                this.cdr.detectChanges();
                alert('Upload failed: ' + JSON.stringify(data));
            }
        })
        .catch(err => {
            this.isUploading = false;
            this.cdr.detectChanges();
            console.error(err);
            alert('Upload error: ' + err.message);
        });

      } else if (this.clip.id !== 0 && !this.isUploading) {
        this.clipService.updateClip(this.clip).subscribe(() => this.router.navigate(['/']));
      }
    }
  }
}
