import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { User } from '../../core/models/user';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-users-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './users-list-page.html',
  styleUrl: './users-list-page.css',
})
export class UsersListPage implements OnInit {
  
  users: User[] = [];

  constructor(private userService: UserService, private router: Router) {}

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
}
