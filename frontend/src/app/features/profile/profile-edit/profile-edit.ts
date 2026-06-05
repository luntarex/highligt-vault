import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
import { BackLink } from '../../../shared/back-link/back-link';
import { getSafeErrorMessage } from '../../../core/utils/error-message';
import { UploadService } from '../../../core/services/upload.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BackLink, TranslocoModule],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.css'
})
export class ProfileEdit implements OnInit {
  user: any = null;
  username: string = '';
  description: string = '';
  selectedPhotoUrl: string = '';
  fileToUpload: File | null = null;
  errorMessage: string = '';
  saving: boolean = false;
  showDeleteModal: boolean = false;

  constructor(
    private profileService: ProfileService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    private uploadService: UploadService
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();
    this.profileService.getUserProfile(userId.toString()).subscribe(user => {
      if (!user) {
        this.authService.logout();
        this.router.navigate(['/welcome']);
        return;
      }
      this.user = user;
      this.username = user.username || '';
      this.description = user.description || '';
      this.selectedPhotoUrl = user.profilePhotoUrl || 'assets/icons/default-avatar.png';
      this.cdr.detectChanges();
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fileToUpload = file;
      this.selectedPhotoUrl = URL.createObjectURL(file);
    }
    event.target.value = '';
  }

  onSave(): void {
    this.saving = true;
    const userId = this.authService.getCurrentUserId();
    
    if (this.fileToUpload) {
      this.uploadService.uploadImage(this.fileToUpload).subscribe({
        next: (data) => {
          this.selectedPhotoUrl = data.secureUrl;
          this.submitProfileUpdate(userId);
        },
        error: (err) => {
          this.saving = false;
          this.cdr.detectChanges();
          this.toast.error(getSafeErrorMessage(err, 'Image upload failed. Please try again.'));
        }
      });
    } else {
      this.submitProfileUpdate(userId);
    }
  }

  private submitProfileUpdate(userId: number): void {
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
        this.toast.error(getSafeErrorMessage(err, 'Failed to update profile. Please try again.'));
        this.cdr.detectChanges();
      }
    });
  }

  onDeleteAccount(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  confirmDelete(): void {
    this.showDeleteModal = false;
    const userId = this.authService.getCurrentUserId();
    this.userService.deleteAccount(userId).subscribe({
      next: () => {
        this.toast.success('Account deleted successfully.');
        this.authService.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.toast.error('Failed to delete account. Please try again.');
      }
    });
  }
}
