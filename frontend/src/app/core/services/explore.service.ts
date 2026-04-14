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
    let url = this.apiUrl;
    if (userId) {
      url += `?userId=${userId}`;
    }
    return this.http.get<ExplorePost[]>(url);
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

  likePost(postId: string, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${postId}/like?userId=${userId}`, {});
  }

  unlikePost(postId: string, userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${postId}/like?userId=${userId}`);
  }

  favoriteClip(clipId: string, userId: number): Observable<any> {
    const clipsApi = 'http://localhost:8080/api/clips';
    return this.http.post(`${clipsApi}/${clipId}/favorite?userId=${userId}`, {});
  }

  unfavoriteClip(clipId: string, userId: number): Observable<any> {
    const clipsApi = 'http://localhost:8080/api/clips';
    return this.http.delete(`${clipsApi}/${clipId}/favorite?userId=${userId}`);
  }
}
