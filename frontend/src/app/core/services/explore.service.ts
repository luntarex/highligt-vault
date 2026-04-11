import { Injectable } from "@angular/core";
import { ExplorePost } from "../models/explore-post";
import { Observable, of } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ExploreService {

feed: ExplorePost[] = [
    {
      id: 'p1',
      author: {
        id: 1,
        username: 'NeonMain99',
        profilePhotoUrl: ''
      },
      title: 'Insane 1v4 to win the overtime!',
      game: 'Valorant',
      likes: 1240,
      comments: 84,
      isLiked: false,
      timeAgo: '2h ago',
      tags: ['Clutch', 'Ace'],
      videoUrl: 'assets/videos/clip2.mp4'
    },
    {
      id: 'p2',
      author: {
        id: 2,
        username: 'FakerFanboy',
        profilePhotoUrl: ''
      },
      title: 'Baron steal with blind blind hook',
      game: 'League of Legends',
      likes: 892,
      comments: 12,
      isLiked: true,
      timeAgo: '5h ago',
      tags: ['Steal', 'BigBrain'],
      videoUrl: 'assets/videos/clip3.mp4'
    }
  ];

  getFeed(): Observable<ExplorePost[]> {
    return of(this.feed);
  }
}
