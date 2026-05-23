import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { Comment } from '../models/comment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private apiUrl = `${API_BASE_URL}/comments`;

  constructor(private http: HttpClient) {}

  getCommentsByPostId(postId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/post/${postId}`);
  }

  getCommentsByUserId(userId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/user/${userId}`);
  }

  getPostIdsCommentedByUser(userId: number): Observable<string[]> {
    return new Observable<string[]>(observer => {
      this.getCommentsByUserId(userId).subscribe(comments => {
        const postIds = comments.map(c => c.postId);
        observer.next([...new Set(postIds)]);
        observer.complete();
      });
    });
  }

  getCommentCountByPostId(postId: string): Observable<number> {
    return new Observable<number>(observer => {
      this.getCommentsByPostId(postId).subscribe(comments => {
        observer.next(comments.length);
        observer.complete();
      });
    });
  }

  addComment(postId: string, userId: number, content: string, parentCommentId?: number): Observable<any> {
    return this.http.post(this.apiUrl, { postId, userId, content, parentCommentId });
  }

  updateComment(id: number, newText: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, { content: newText });
  }

  removeComment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  removeCommentViolation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/violation`);
  }
}

