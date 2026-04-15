import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { BackLink } from '../../../shared/back-link/back-link';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackLink],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.css'
})
export class ProfileEdit implements OnInit {
  user: any = null;
  username: string = '';
  description: string = '';
  selectedPhotoUrl: string = '';
  errorMessage: string = '';
  saving: boolean = false;

  avatarOptions: string[] = [
    'https://i.pravatar.cc/150?img=1',
    'https://i.pravatar.cc/150?img=2',
    'https://i.pravatar.cc/150?img=3',
    'https://i.pravatar.cc/150?img=4',
    'https://i.pravatar.cc/150?img=5',
    'https://i.pravatar.cc/150?img=6',
    'https://i.pravatar.cc/150?img=7',
    'https://i.pravatar.cc/150?img=8',
    'https://i.pravatar.cc/150?img=9',
    'https://i.pravatar.cc/150?img=10',
    'https://i.pravatar.cc/150?img=11',
    'https://i.pravatar.cc/150?img=12',
    'https://i.pravatar.cc/150?img=13',
    'https://i.pravatar.cc/150?img=14',
    'https://i.pravatar.cc/150?img=15',
  ];

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();
    this.profileService.getUserProfile(userId.toString()).subscribe(user => {
      this.user = user;
      this.username = user.username || '';
      this.description = user.description || '';
      this.selectedPhotoUrl = user.profilePhotoUrl || this.avatarOptions[0];
      this.cdr.detectChanges();
    });
  }

  selectAvatar(url: string): void {
    this.selectedPhotoUrl = url;
  }

  onSave(): void {
    this.saving = true;
    const userId = this.authService.getCurrentUserId();
    const payload = {
      username: this.username,
      description: this.description,
      profilePhotoUrl: this.selectedPhotoUrl
    };

    this.profileService.updateUserProfile(userId, payload).subscribe({
      next: () => {
        this.saving = false;
        localStorage.setItem('username', this.username);
        this.authService.updatePhoto(this.selectedPhotoUrl);
        this.toast.success('Profile updated successfully!');
        this.router.navigate(['/profile', userId]);
      },
      error: (err) => {
        this.saving = false;
        let msg = 'Failed to update profile. Please try again.';
        if (err.error && (err.error.error || err.error.message)) {
          msg = err.error.error || err.error.message;
        }
        this.toast.error(msg);
        this.cdr.detectChanges();
      }
    });
  }
}
