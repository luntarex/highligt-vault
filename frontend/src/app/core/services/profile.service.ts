import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { User } from '../models/user';
import { Clip } from '../models/clip';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private apiUsersUrl = `${API_BASE_URL}/users`;
  private apiClipsUrl = `${API_BASE_URL}/clips`;

  private apiFollowsUrl = `${API_BASE_URL}/follows`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  getUserProfile(id?: string | null): Observable<User | null> {
    const userId = id ? id : this.authService.getCurrentUserId().toString();
    if (!userId || userId === '0') {
      return of(null);
    }
    return this.http.get<User>(`${this.apiUsersUrl}/${userId}`).pipe(
      catchError(() => of(null))
    );
  }

  getFavoriteClips(id?: string | null): Observable<Clip[]> {
    const userId = id ? id : this.authService.getCurrentUserId().toString();
    return this.http.get<Clip[]>(`${this.apiClipsUrl}/favorites/${userId}`);
  }

  getUserClips(id?: string | null): Observable<Clip[]> {
    const userId = id ? id : this.authService.getCurrentUserId().toString();
    return this.http.get<Clip[]>(`${this.apiClipsUrl}?uploaderId=${userId}`);
  }

  updateUserProfile(userId: number, data: { username: string; description: string; profilePhotoUrl: string }): Observable<any> {
    return this.http.put(`${this.apiUsersUrl}/${userId}`, data);
  }

  followUser(targetUserId: string): Observable<any> {
    return this.http.post(`${this.apiFollowsUrl}/${targetUserId}`, {});
  }

  unfollowUser(targetUserId: string): Observable<any> {
    return this.http.delete(`${this.apiFollowsUrl}/${targetUserId}`);
  }

  isFollowing(targetUserId: string): Observable<{isFollowing: boolean}> {
    return this.http.get<{isFollowing: boolean}>(`${this.apiFollowsUrl}/${targetUserId}/is-following`);
  }

  getFollowers(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiFollowsUrl}/${userId}/followers`);
  }

  getFollowing(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiFollowsUrl}/${userId}/following`);
  }

  getSuggestedUsers(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiFollowsUrl}/${userId}/suggestions`);
  }
}


