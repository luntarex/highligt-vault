import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '../../core/models/user';
import { UserService } from '../../core/services/user.service';
import { getSafeErrorMessage } from '../../core/utils/error-message';
import { GameService } from '../../core/services/game.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { UploadService } from '../../core/services/upload.service';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-users-list-page',
  imports: [FormsModule, CommonModule, RouterModule, TranslocoModule],
  templateUrl: './users-list-page.html',
  styleUrl: './users-list-page.css',
})
export class UsersListPage implements OnInit {

  users: User[] = [];
  newGameName: string = '';
  addGameMessage: string = '';
  activeTab: 'users' | 'games' = 'users';
  gameThumbnailFile: File | null = null;
  gameThumbnailPreview: string = '';
  isUploadingGame = false;

  // Modal State
  showDeleteModal: boolean = false;
  userToDelete: User | null = null;

  constructor(
    private userService: UserService,
    private router: Router,
    private gameService: GameService,
    private uploadService: UploadService,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe(users => {
      this.users = users;
      this.cdr.detectChanges();
    });
  }

  switchTab(tab: 'users' | 'games') {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  viewProfile(username: string) {
    this.router.navigate(['/profile', username]);
  }

  viewComments(username: string) {
    this.router.navigate(['/user-comments', username]);
  }

  onRequestDelete(user: User) {
    this.userToDelete = user;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.userToDelete = null;
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (!this.userToDelete) return;
    
    this.userService.deleteAccount(this.userToDelete.id).subscribe({
      next: () => {
        this.loadUsers();
        this.closeDeleteModal();
      },
      error: (err) => {
        this.toast.error(getSafeErrorMessage(err, 'Failed to delete user. Please try again.'));
      }
    });
  }

  onGameThumbnailSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type.startsWith('image/')) {
        this.gameThumbnailFile = file;
        this.gameThumbnailPreview = URL.createObjectURL(file);
        this.cdr.detectChanges();
      } else {
        this.toast.error('Please select an image file');
      }
    }
  }

  addGame() {
    if (!this.newGameName.trim()) return;
    this.isUploadingGame = true;
    
    if (this.gameThumbnailFile) {
      this.uploadService.uploadImage(this.gameThumbnailFile).subscribe({
        next: (res) => {
          this.submitGame(res.secureUrl);
        },
        error: (err) => {
          this.isUploadingGame = false;
          this.addGameMessage = getSafeErrorMessage(err, 'Failed to upload thumbnail.');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.submitGame();
    }
  }

  private submitGame(coverUrl?: string) {
    this.gameService.addGame(this.newGameName, coverUrl).subscribe({
      next: (res) => {
        this.isUploadingGame = false;
        this.addGameMessage = "Game added successfully!";
        this.newGameName = '';
        this.gameThumbnailFile = null;
        this.gameThumbnailPreview = '';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.addGameMessage = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.isUploadingGame = false;
        this.addGameMessage = getSafeErrorMessage(err, 'Failed to add game. Please try again.');
        this.cdr.detectChanges();
        setTimeout(() => {
          this.addGameMessage = '';
          this.cdr.detectChanges();
        }, 3000);
      }
    });
  }
}
