import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { UserProfile } from '../models/user-profile';
import { FavoriteClip } from '../models/favorite-clip';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  // 1. Mock Database: User Profile
  private mockProfile: UserProfile = {
    username: 'Player One',
    description: 'Competitive FPS player. Collecting aces, clutches, and the occasional fail for posterity.',
    profilePhotoUrl: 'https://i.pravatar.cc/150?img=3', // You can swap this to a real URL
    totalClips: 42,
    totalFavorites: 12
  };

  // 2. Mock Database: Favorite Clips
  private mockFavorites: FavoriteClip[] = [
    {
      id: 1,
      title: 'Jett 4K Ace on Bind',
      game: 'Valorant',
      durationFormatted: '0:28',
      timeAgo: '14mo ago',
      tags: ['Ace', 'Win'],
      thumbnailUrl : "https://picsum.photos/200"
    },
    {
      id: 2,
      title: 'AWP 3K Mid Peek',
      game: 'CS2',
      durationFormatted: '0:18',
      timeAgo: '14mo ago',
      tags: ['Sniper', 'Win'],
      thumbnailUrl : "https://picsum.photos/200"
    },
    {
      id: 3,
      title: 'Sova Dart Lineup',
      game: 'Valorant',
      durationFormatted: '0:40',
      timeAgo: '14mo ago',
      tags: ['Sniper', 'Ace'],
      thumbnailUrl : "https://picsum.photos/200"
    }
  ];

  constructor() { }

  // Fetches the user's profile stats
  getUserProfile(): Observable<UserProfile> {
    return of(this.mockProfile); // Immediate return
  }

  // Fetches the user's favorite clips
  getFavoriteClips(): Observable<FavoriteClip[]> {
    return of(this.mockFavorites); // Immediate return
  }
}
