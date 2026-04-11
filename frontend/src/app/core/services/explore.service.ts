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
  addPost(post: ExplorePost): void {
    this.feed.push(post);
  }
  deletePost(id: string): void {
    this.feed = this.feed.filter(post => post.id !== id);
  }
  updatePost(updatedPost: ExplorePost): void {
    const index = this.feed.findIndex(p => p.id === updatedPost.id);
    if (index !== -1) {
      this.feed[index] = updatedPost;
    }
  }
  getPostById(id: string): Observable<ExplorePost | undefined> {
    return of(this.feed.find(p => p.id === id));
  }
}
