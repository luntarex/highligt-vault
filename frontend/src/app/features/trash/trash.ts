import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipService } from '../../core/services/clip.service';
import { AuthService } from '../../core/services/auth.service';
import { Clip } from '../../core/models/clip';
import { ClipCard } from '../library/clip-card/clip-card';
import { RouterLink } from '@angular/router';
import { BackLink } from '../../shared/back-link/back-link';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-trash',
  standalone: true,
  imports: [CommonModule, ClipCard, RouterLink, BackLink, ConfirmDialog],
  templateUrl: './trash.html',
  styleUrls: ['./trash.css']
})
export class Trash implements OnInit {
  deletedClips: Clip[] = [];
  isLoading = true;
  
  showRecoverModal = false;
  clipToRecover: number | null = null;

  constructor(
    private clipService: ClipService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDeletedClips();
  }

  loadDeletedClips(): void {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.isLoading = true;
      this.clipService.getDeletedClips(userId).subscribe({
        next: (clips) => {
          this.deletedClips = clips;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load trash:', err);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  handleRecover(clipId: number): void {
    this.clipToRecover = clipId;
    this.showRecoverModal = true;
  }

  onConfirmRecovery(): void {
    if (this.clipToRecover) {
      this.clipService.recoverClip(this.clipToRecover).subscribe({
        next: () => {
          this.deletedClips = this.deletedClips.filter(c => c.id !== this.clipToRecover);
          this.showRecoverModal = false;
          this.clipToRecover = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          alert('Failed to recover clip: ' + err.message);
          this.showRecoverModal = false;
          this.clipToRecover = null;
        }
      });
    }
  }

  onCancelRecovery(): void {
    this.showRecoverModal = false;
    this.clipToRecover = null;
  }
}
