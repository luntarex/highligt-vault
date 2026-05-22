import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { ExplorePost } from "../models/explore-post";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class ExploreService {

  private apiUrl = 'http://localhost:8080/api/posts';

  constructor(private http: HttpClient) {}

  getFeed(userId?: number): Observable<ExplorePost[]> {
    return this.http.get<ExplorePost[]>(this.apiUrl);
  }

  getFollowingFeed(userId: number): Observable<ExplorePost[]> {
    return this.http.get<ExplorePost[]>(`${this.apiUrl}/following`);
  }
  
  addPost(post: any): Observable<any> {
    return this.http.post(this.apiUrl, post);
  }
  
  deletePost(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  
  updatePost(updatedPost: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${updatedPost.id}`, updatedPost);
  }
  
  getPostById(id: string): Observable<ExplorePost> {
    return this.http.get<ExplorePost>(`${this.apiUrl}/${id}`);
  }

  getPostByClipId(clipId: number, userId?: number): Observable<ExplorePost> {
    return this.http.get<ExplorePost>(`${this.apiUrl}/clip/${clipId}`);
  }

  likePost(postId: string, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${postId}/like`, {});
  }

  unlikePost(postId: string, userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${postId}/like`);
  }

  favoriteClip(clipId: string, userId: number): Observable<any> {
    const clipsApi = 'http://localhost:8080/api/clips';
    return this.http.post(`${clipsApi}/${clipId}/favorite`, {});
  }

  unfavoriteClip(clipId: string, userId: number): Observable<any> {
    const clipsApi = 'http://localhost:8080/api/clips';
    return this.http.delete(`${clipsApi}/${clipId}/favorite`);
  }
}
