import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '../../core/models/user';
import { UserService } from '../../core/services/user.service';
import { getSafeErrorMessage } from '../../core/utils/error-message';
import { GameService } from '../../core/services/game.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-users-list-page',
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './users-list-page.html',
  styleUrl: './users-list-page.css',
})
export class UsersListPage implements OnInit {

  users: User[] = [];
  newGameName: string = '';
  addGameMessage: string = '';
  activeTab: 'users' | 'games' = 'users';

  // Modal State
  showDeleteModal: boolean = false;
  userToDelete: User | null = null;

  constructor(
    private userService: UserService,
    private router: Router,
    private gameService: GameService,
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



  viewProfile(id: number) {
    this.router.navigate(['/profile', id]);
  }

  viewComments(id: number) {
    this.router.navigate(['/user-comments', id]);
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

  addGame() {
    if(!this.newGameName.trim()) return;
    this.gameService.addGame(this.newGameName).subscribe({
      next: (res) => {
        this.addGameMessage = "Game added successfully!";
        this.newGameName = '';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.addGameMessage = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
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
