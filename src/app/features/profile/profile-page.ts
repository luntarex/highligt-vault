import { Component,OnInit } from '@angular/core';
import { UserProfile } from '../../core/models/user-profile';
import { FavoriteClip } from '../../core/models/favorite-clip';
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

  user: UserProfile | null = null;
  favoriteClips: FavoriteClip[] = [];
  showUploadModal: boolean = false;
  currentProfileId: string | null = null;

  constructor(
    private profileService: ProfileService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.currentProfileId = this.route.snapshot.paramMap.get('id');

    if (this.currentProfileId) {
      console.log('Loading profile for User ID:', this.currentProfileId);
    } else {
      console.log('No ID in URL. Loading the logged-in user profile.');
    }

    this.loadProfileData(this.currentProfileId);
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
}
