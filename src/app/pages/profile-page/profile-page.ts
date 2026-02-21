import { Component,OnInit } from '@angular/core';
import { UserProfile } from '../../models/user-profile';
import { FavoriteClip } from '../../models/favorite-clip';
import { BackLink } from '../../components/back-link/back-link';
import { NgClass } from '@angular/common';
import { ProfileService } from '../../services/profile.service';
import { CustomUpload } from '../../components/custom-upload/custom-upload';

@Component({
  selector: 'app-profile-page',
  imports: [BackLink, NgClass, CustomUpload],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {

  // Start with empty/null data
  user: UserProfile | null = null;
  favoriteClips: FavoriteClip[] = [];
  showUploadModal: boolean = false;

  // Inject the service
  constructor(private profileService: ProfileService) { }

  ngOnInit(): void {
    this.loadProfileData();
  }

  loadProfileData(): void {
    // 1. Fetch the user profile header info
    this.profileService.getUserProfile().subscribe((profileData) => {
      this.user = profileData;
    });

    // 2. Fetch the favorite clips list
    this.profileService.getFavoriteClips().subscribe((clipsData) => {
      this.favoriteClips = clipsData;
    });
  }

  addClips(): void {
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
  }
}
