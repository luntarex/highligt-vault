import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private mockUsers: User[] = [
    {
      id: 1,
      username: 'NeonMain99',
      email: 'user1@test.com',
      description: 'Valorant player',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12),
      profilePhotoUrl: 'https://i.pravatar.cc/150?u=1',
      isAdmin:false,
      totalClips: 42,
      totalFavorites: 12
    },
    {
      id: 2,
      username: 'FakerFanboy',
      email: 'user2@test.com',
      description: 'Valorant player',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12),
      profilePhotoUrl: 'https://i.pravatar.cc/150?u=2',
      isAdmin:false,
      totalClips: 89,
      totalFavorites: 24
    },
    {
      id: 3,
      username: 'SilverSurfer',
      email: 'user3@test.com',
      description: 'Valorant player',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12),
      profilePhotoUrl: 'https://i.pravatar.cc/150?u=3',
      isAdmin:false,
      totalClips: 15,
      totalFavorites: 5
    },
    {
      id: 4,
      username: 'TacticalToad',
      email: 'user4@test.com',
      description: 'Valorant player',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12),
      profilePhotoUrl: 'https://i.pravatar.cc/150?u=4',
      isAdmin:false,
      totalClips: 3,
      totalFavorites: 0
    },
    {
      id: 5,
      username: 'ClutchKing',
      email: 'user5@test.com',
      description: 'Valorant player',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 12),
      profilePhotoUrl: 'https://i.pravatar.cc/150?u=5',
      isAdmin:true,
      totalClips: 104,
      totalFavorites: 56
    },
  ];

  getAllUsers(): Observable<User[]> {
    return of(this.mockUsers);
  }

  getUserById(id: number): Observable<User | null> {
    return of(this.mockUsers.find(u => u.id === id) || null);
  }
}
