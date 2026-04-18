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
  fileToUpload: File | null = null;
  customAvatarUrl: string = 'assets/icons/default-avatar.png';

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
        if (user.profilePhotoUrl) {
          this.customAvatarUrl = user.profilePhotoUrl;
        }
      }
      this.cdr.detectChanges();
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fileToUpload = file;
      this.customAvatarUrl = URL.createObjectURL(file);
    }
    event.target.value = '';
  }

  getSelectedAvatarUrl(): string {
    return this.customAvatarUrl;
  }

  onSave(): void {
    this.saving = true;
    const userId = this.authService.getCurrentUserId();

    if (this.fileToUpload) {
      const formData = new FormData();
      formData.append('file', this.fileToUpload);
      formData.append('upload_preset', 'hvault_unsigned');
      
      fetch('https://api.cloudinary.com/v1_1/dticc1u7k/image/upload', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if(data.secure_url) {
          this.customAvatarUrl = data.secure_url;
          this.submitProfile(userId);
        } else {
          this.saving = false;
          this.cdr.detectChanges();
          alert('Upload failed: ' + (data.error?.message || JSON.stringify(data)));
        }
      })
      .catch(err => {
        this.saving = false;
        this.cdr.detectChanges();
        console.error(err);
        alert('Upload error: ' + err.message);
      });
    } else {
      this.submitProfile(userId);
    }
  }

  private submitProfile(userId: number): void {
    const payload = {
      username: this.username,
      description: this.description,
      profilePhotoUrl: this.customAvatarUrl
    };

    this.profileService.updateUserProfile(userId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/explore']);
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
        alert('Failed to save profile. Please try again.');
      }
    });
  }
}
