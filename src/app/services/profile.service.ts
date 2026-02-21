import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { UserProfile } from '../models/user-profile';
import { FavoriteClip } from '../models/favorite-clip';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  // 1. Mock Database: User Profile (Default/Owner)
  private mockProfile: UserProfile = {
    username: 'Player One',
    description: 'Competitive FPS player. Collecting aces, clutches, and the occasional fail for posterity.',
    profilePhotoUrl: 'https://i.pravatar.cc/150?img=3',
    totalClips: 42,
    totalFavorites: 12
  };

  // 2. Mock Database: Other Users
  private mockUsers: { [id: string]: UserProfile } = {
    '1': {
      username: 'NeonMain99',
      description: 'Valorant enthusiast. I main Neon and love playing for the highlight clips!',
      profilePhotoUrl: 'https://i.pravatar.cc/150?img=11',
      totalClips: 15,
      totalFavorites: 5
    },
    '2': {
      username: 'FakerFanboy',
      description: 'Lee Sin main. Scouting for the next big play. Follow for amazing steals!',
      profilePhotoUrl: 'https://i.pravatar.cc/150?img=12',
      totalClips: 89,
      totalFavorites: 24
    }
  };

  // 3. Mock Database: Favorite Clips (Default/Owner)
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

  // 4. Mock Database: Other User Clips
  private userClips: { [id: string]: FavoriteClip[] } = {
    '1': [
      {
        id: 101,
        title: 'Neon High Speed Entry',
        game: 'Valorant',
        durationFormatted: '0:15',
        timeAgo: '2h ago',
        tags: ['Speed', 'Entry'],
        thumbnailUrl: "https://picsum.photos/200?random=11"
      },
      {
        id: 102,
        title: 'Neon Ultimate Quad',
        game: 'Valorant',
        durationFormatted: '0:22',
        timeAgo: '5h ago',
        tags: ['Ult', 'Multikill'],
        thumbnailUrl: "https://picsum.photos/200?random=12"
      }
    ],
    '2': [
      {
        id: 201,
        title: 'Lee Sin Dragon Steal',
        game: 'League of Legends',
        durationFormatted: '0:19',
        timeAgo: '1d ago',
        tags: ['Steal', 'Jungle'],
        thumbnailUrl: "https://picsum.photos/200?random=21"
      }
    ]
  };

  constructor() { }

  getUserProfile(id?: string | null): Observable<UserProfile> {
    if (id && this.mockUsers[id]) {
      return of(this.mockUsers[id]);
    }
    return of(this.mockProfile);
  }

  getFavoriteClips(id?: string | null): Observable<FavoriteClip[]> {
    if (id && this.userClips[id]) {
      return of(this.userClips[id]);
    }
    return of(this.mockFavorites);
  }
}
