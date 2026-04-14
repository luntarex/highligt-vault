import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-complete-profile',
  imports: [FormsModule, NgClass],
  templateUrl: './complete-profile.html',
  styleUrl: './complete-profile.css',
})
export class CompleteProfile implements OnInit {

  description: string = '';
  selectedAvatarIndex: number = 0;

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
  ];

  username: string = '';
  saving: boolean = false;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.username = localStorage.getItem('username') || 'User';
    const userId = this.authService.getCurrentUserId();
    this.profileService.getUserProfile(userId.toString()).subscribe(user => {
      if (user) {
        this.description = user.description || '';
        const idx = this.avatarOptions.indexOf(user.profilePhotoUrl);
        if (idx !== -1) this.selectedAvatarIndex = idx;
      }
      this.cdr.detectChanges();
    });
  }

  selectAvatar(index: number): void {
    this.selectedAvatarIndex = index;
  }

  getSelectedAvatarUrl(): string {
    return this.avatarOptions[this.selectedAvatarIndex];
  }

  onSave(): void {
    this.saving = true;
    const userId = this.authService.getCurrentUserId();
    const payload = {
      description: this.description,
      profilePhotoUrl: this.getSelectedAvatarUrl()
    };

    this.profileService.updateUserProfile(userId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/profile']);
      },
      error: () => {
        this.saving = false;
        alert('Failed to save profile. Please try again.');
      }
    });
  }
}
