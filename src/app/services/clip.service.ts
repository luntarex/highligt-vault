import { Injectable } from '@angular/core';
import { Clip } from '../models/clip';

@Injectable({
  providedIn: 'root'
})
export class ClipService {

  private mockClips: Clip[] = [
    {
      id: 1,
      title: 'Funny 4K Ace on Bind',
      game: 'Valorant',
      thumbnailUrl: 'https://picsum.photos/200/300',
      duration: 0,
      tags: ['Ace', 'Win'],
      dateCreated: new Date('2024-02-14T10:30:00'),
      notes: 'This is a clip of Jett getting a 4K ace on Bind.',
      currentTime: 0,
      startTime: 0,
      endTime: 0,
      isFavorite: false,
      isDeleted: false,
      url: 'assets/videos/clip1.mp4',
      uploaderId: 1
    },
    {
      id: 2,
      title: '1v4 Clutch Inferno',
      game: 'CS2',
      thumbnailUrl: 'https://picsum.photos/200/300',
      duration: 0,
      tags: ['Clutch', 'Win'],
      dateCreated: new Date(Date.now() - 86400000),
      notes: 'This is a clip of a 1v4 clutch on Inferno.',
      currentTime: 0,
      startTime: 0,
      endTime: 0,
      isFavorite: false,
      isDeleted: false,
      url: 'assets/videos/clip2.mp4',
      uploaderId: 1
    },
    {
      id: 3,
      title: 'Funny Raze Ult Fail',
      game: 'Valorant',
      thumbnailUrl: 'https://picsum.photos/200/300',
      duration: 0,
      tags: ['Funny', 'Fail'],
      dateCreated: new Date(Date.now() - 172800000),
      notes: 'This is a clip of a funny Raze ult fail on Split.',
      currentTime: 0,
      startTime: 0,
      endTime: 0,
      isFavorite: false,
      isDeleted: false,
      url: 'assets/videos/clip3.mp4',
      uploaderId: 1
    },
    {
      id: 4,
      title: 'AWP 3K Mid Peek',
      game: 'CS2',
      thumbnailUrl: "https://picsum.photos/200/300",
      duration: 0,
      tags: ['Sniper', 'Win'],
      dateCreated: new Date('2024-02-10T14:15:00'),
      notes: 'This is a clip of an AWP 3K on Mirage.',
      currentTime: 0,
      startTime: 0,
      endTime: 0,
      isFavorite: false,
      isDeleted: false,
      url: 'assets/videos/clip4.mp4',
      uploaderId: 1
    },
    {
      id: 5,
      title: 'Sova Dart Lineup',
      game: 'Valorant',
      thumbnailUrl: 'https://picsum.photos/200/300',
      duration: 0,
      tags: ['Sniper', 'Ace'],
      dateCreated: new Date('2024-02-01T09:00:00'),
      notes: 'This is a clip of a Sova dart lineup on Ascent.',
      currentTime: 0,
      startTime: 0,
      endTime: 0,
      isFavorite: false,
      isDeleted: false,
      url: 'assets/videos/clip5.mp4',
      uploaderId : 8
    }
  ];

  constructor() { }

  getClips(): Clip[] {
    return this.mockClips.sort((a, b) => b.dateCreated.getTime() - a.dateCreated.getTime());
  }

  getClip(id: number): Clip | undefined {
    return this.mockClips.find(c => c.id === id);
  }

  addClip(clip: Clip): void {
    this.mockClips.unshift(clip);
  }

  deleteClip(id: number): void {
    this.mockClips = this.mockClips.filter(c => c.id !== id);
  }

  updateClip(updatedClip: Clip): void {
    const index = this.mockClips.findIndex(c => c.id === updatedClip.id);
    if (index !== -1) {
      this.mockClips[index] = updatedClip;
    }
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
