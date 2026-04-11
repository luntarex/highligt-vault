import { Component,OnInit } from '@angular/core';
import { User } from '../../core/models/user';
import { Clip } from '../../core/models/clip';
import { BackLink } from '../../shared/back-link/back-link';
import { NgClass } from '@angular/common';
import { ProfileService } from '../../core/services/profile.service';
import { CustomUpload } from '../../shared/custom-upload/custom-upload';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-profile-page',
  imports: [BackLink, NgClass, CustomUpload],
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
    private route: ActivatedRoute
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
    this.profileService.getUserProfile(id).subscribe((profileData) => {
      this.user = profileData;
    });
    this.profileService.getFavoriteClips(id).subscribe((clipsData) => {
      this.favoriteClips = clipsData;
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

  formatTimeAgo(date: Date): string {
    // Basic mock implementation. In a real app, you'd use a robust library like date-fns
    return '14mo ago';
  }
}
