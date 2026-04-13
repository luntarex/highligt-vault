import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { User } from '../../core/models/user';
import { Clip } from '../../core/models/clip';
import { BackLink } from '../../shared/back-link/back-link';
import { NgClass, CommonModule } from '@angular/common';
import { ProfileService } from '../../core/services/profile.service';
import { CustomUpload } from '../../shared/custom-upload/custom-upload';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profile-page',
  imports: [BackLink, NgClass, CommonModule, CustomUpload],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {

  user: User | null = null;
  favoriteClips: Clip[] = [];
  showUploadModal: boolean = false;
  currentProfileId: string | null = null;

  constructor(
    private profileService: ProfileService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.currentProfileId = params.get('id');

      if (this.currentProfileId) {
        console.log('Loading profile for User ID:', this.currentProfileId);
      } else {
        console.log('No ID in URL. Loading the logged-in user profile.');
      }

      this.loadProfileData(this.currentProfileId);
    });
  }

  loadProfileData(id: string | null): void {
    this.profileService.getUserProfile(id).subscribe({
      next: (profileData) => {
        console.log('Profile data received:', profileData);
        this.user = profileData;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
      }
    });
    this.profileService.getFavoriteClips(id).subscribe({
      next: (clipsData) => {
        this.favoriteClips = clipsData;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load clips:', err);
      }
    });
  }


  addClips(): void {
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  formatTimeAgo(dateInput: Date | string): string {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y ago`;
  }
}
