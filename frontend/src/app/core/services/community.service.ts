import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Community, CreateCommunityRequest } from '../models/community';
import { ExplorePost } from '../models/explore-post';

@Injectable({
  providedIn: 'root'
})
export class CommunityService {
  private apiUrl = `${API_BASE_URL}/communities`;

  constructor(private http: HttpClient) {}

  getCommunities(): Observable<Community[]> {
    return this.http.get<Community[]>(this.apiUrl);
  }

  getCommunity(id: number): Observable<Community> {
    return this.http.get<Community>(`${this.apiUrl}/${id}`);
  }

  getCommunityPosts(id: number): Observable<ExplorePost[]> {
    return this.http.get<ExplorePost[]>(`${this.apiUrl}/${id}/posts`);
  }

  createCommunityPost(id: number, content: string, originalPostId?: string, repostType?: string, clipId?: number): Observable<ExplorePost> {
    return this.http.post<ExplorePost>(`${this.apiUrl}/${id}/posts`, { content, originalPostId, repostType, clipId });
  }

  createCommunity(request: CreateCommunityRequest): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(this.apiUrl, request);
  }

  joinCommunity(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/join`, {});
  }

  leaveCommunity(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}/join`);
  }

  updateThumbnail(id: number, thumbnailUrl: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${id}/thumbnail`, { thumbnailUrl });
  }

  updateCommunity(id: number, request: Partial<CreateCommunityRequest> & { rules?: string }): Observable<Community> {
    return this.http.put<Community>(`${this.apiUrl}/${id}`, request);
  }

  deleteCommunity(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  appointAdmin(id: number, userId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/admins/${userId}`, {});
  }

  removeAdmin(id: number, userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}/admins/${userId}`);
  }
}
