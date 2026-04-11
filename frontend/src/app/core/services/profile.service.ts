import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User } from '../models/user';
import { Clip } from '../models/clip';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  // 1. Mock Database: User Profile (Default/Owner)
  private mockProfile: User = {
    id: 1, // Add standard ID
    username: 'Player One',
    email: 'playerone@test.com',
    description: 'Competitive FPS player. Collecting aces, clutches, and the occasional fail for posterity.',
    profilePhotoUrl: 'https://i.pravatar.cc/150?img=3',
    totalClips: 42,
    totalFavorites: 12,
    isAdmin:true,
    createdAt: new Date(),
  };

  // 2. Mock Database: Other Users
  private mockUsers: { [id: string]: User } = {
    '1': {
      id: 1,
      username: 'NeonMain99',
      email: 'neon@test.com',
      createdAt: new Date(),
      description: 'Valorant enthusiast. I main Neon and love playing for the highlight clips!',
      profilePhotoUrl: 'https://i.pravatar.cc/150?img=11',
      totalClips: 15,
      totalFavorites: 5,
      isAdmin:false,
    },
    '2': {
      id: 2,
      username: 'FakerFanboy',
      email: 'faker@test.com',
      createdAt: new Date(),
      description: 'Lee Sin main. Scouting for the next big play. Follow for amazing steals!',
      profilePhotoUrl: 'https://i.pravatar.cc/150?img=12',
      totalClips: 89,
      totalFavorites: 24,
      isAdmin:false,
    }
  };

  private createMockClip(id: number, title: string, game: string, duration: number, tags: string[], thumbnailUrl: string): Clip {
    return {
      id, title, game, duration, tags, thumbnailUrl,
      notes: '', url: '', currentTime: 0, startTime: 0, endTime: duration,
      uploaderId: 1, isFavorite: true, isDeleted: false, dateCreated: new Date()
    };
  }

  // 3. Mock Database: Favorite Clips (Default/Owner)
  private mockFavorites: Clip[] = [
    this.createMockClip(1, 'Jett 4K Ace on Bind', 'Valorant', 28, ['Ace', 'Win'], 'https://picsum.photos/200?random=50'),
    this.createMockClip(2, 'AWP 3K Mid Peek', 'CS2', 18, ['Sniper', 'Win'], 'https://picsum.photos/200?random=51'),
    this.createMockClip(3, 'Sova Dart Lineup', 'Valorant', 40, ['Sniper', 'Ace'], 'https://picsum.photos/200?random=52')
  ];

  // 4. Mock Database: Other User Clips
  private userClips: { [id: string]: Clip[] } = {
    '1': [
      this.createMockClip(101, 'Neon High Speed Entry', 'Valorant', 15, ['Speed', 'Entry'], 'https://picsum.photos/200?random=11'),
      this.createMockClip(102, 'Neon Ultimate Quad', 'Valorant', 22, ['Ult', 'Multikill'], 'https://picsum.photos/200?random=12')
    ],
    '2': [
      this.createMockClip(201, 'Lee Sin Dragon Steal', 'League of Legends', 19, ['Steal', 'Jungle'], 'https://picsum.photos/200?random=21')
    ]
  };

  constructor() { }

  getUserProfile(id?: string | null): Observable<User> {
    if (id && this.mockUsers[id]) {
      return of(this.mockUsers[id]);
    }
    return of(this.mockProfile);
  }

  getFavoriteClips(id?: string | null): Observable<Clip[]> {
    if (id && this.userClips[id]) {
      return of(this.userClips[id]);
    }
    return of(this.mockFavorites);
  }
}

