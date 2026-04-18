import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserService } from '../../../core/services/user.service';
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
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();
    this.profileService.getUserProfile(userId.toString()).subscribe(user => {
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
          this.selectedPhotoUrl = data.secure_url;
          this.submitProfileUpdate(userId);
        } else {
          this.saving = false;
          this.cdr.detectChanges();
          this.toast.error('Upload failed: ' + (data.error?.message || 'Unknown error'));
        }
      })
      .catch(err => {
        this.saving = false;
        this.cdr.detectChanges();
        console.error(err);
        this.toast.error('Image upload error: ' + err.message);
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
        let msg = 'Failed to update profile. Please try again.';
        if (err.error && (err.error.error || err.error.message)) {
          msg = err.error.error || err.error.message;
        }
        this.toast.error(msg);
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
        console.error(err);
      }
    });
  }
}
