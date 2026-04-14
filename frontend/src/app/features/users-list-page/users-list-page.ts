import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../../core/models/user';
import { UserService } from '../../core/services/user.service';
import { GameService } from '../../core/services/game.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users-list-page',
  imports: [FormsModule, CommonModule],
  templateUrl: './users-list-page.html',
  styleUrl: './users-list-page.css',
})
export class UsersListPage implements OnInit {
  
  users: User[] = [];
  newGameName: string = '';
  addGameMessage: string = '';

  constructor(private userService: UserService, private router: Router, private gameService: GameService) {}

  ngOnInit(): void {
    this.userService.getAllUsers().subscribe(users => {
      this.users = users;
    });
  }

  followUser(id: number) {
    console.log('Followed user with id:', id);
    // Logic for following a user could be linked to another service in the future.
  }

  viewProfile(id: number) {
    this.router.navigate(['/profile', id]);
  }

  addGame() {
    if(!this.newGameName.trim()) return;
    this.gameService.addGame(this.newGameName).subscribe({
      next: (res) => {
        this.addGameMessage = "Game added successfully!";
        this.newGameName = '';
        setTimeout(() => this.addGameMessage = '', 3000);
      },
      error: (err) => {
        this.addGameMessage = "Error: " + (err.error?.error || "Failed to add game");
        setTimeout(() => this.addGameMessage = '', 3000);
      }
    });
  }
}
