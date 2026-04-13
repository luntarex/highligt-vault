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

  getFeed(): Observable<ExplorePost[]> {
    return this.http.get<ExplorePost[]>(this.apiUrl);
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
}
