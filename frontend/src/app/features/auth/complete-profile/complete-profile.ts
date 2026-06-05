import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { getSafeErrorMessage } from '../../../core/utils/error-message';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService } from '../../../core/services/upload.service';
import { ImportFoldersDialog } from '../../../shared/import-folders-dialog/import-folders-dialog';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-complete-profile',
  imports: [CommonModule, FormsModule, ImportFoldersDialog, TranslocoModule],
  templateUrl: './complete-profile.html',
  styleUrl: './complete-profile.css',
})
export class CompleteProfile implements OnInit {

  description: string = '';
  fileToUpload: File | null = null;
  customAvatarUrl: string = 'assets/icons/default-avatar.png';

  username: string = '';
  saving: boolean = false;
  showImportFoldersDialog = false;

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    private uploadService: UploadService
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
      this.uploadService.uploadImage(this.fileToUpload).subscribe({
        next: (data) => {
          this.customAvatarUrl = data.secureUrl;
          this.submitProfile(userId);
        },
        error: (err) => {
          this.saving = false;
          this.cdr.detectChanges();
          this.toast.error(getSafeErrorMessage(err, 'Image upload failed. Please try again.'));
        }
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
        this.toast.error('Failed to save profile. Please try again.');
      }
    });
  }

  openImportFolders(): void {
    this.showImportFoldersDialog = true;
    this.cdr.detectChanges();
  }

  closeImportFolders(): void {
    this.showImportFoldersDialog = false;
    this.cdr.detectChanges();
  }
}
