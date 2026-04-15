import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/user';
import { Clip } from '../models/clip';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private apiUsersUrl = 'http://localhost:8080/api/users';
  private apiClipsUrl = 'http://localhost:8080/api/clips';

  private apiFollowsUrl = 'http://localhost:8080/api/follows';

  constructor(private http: HttpClient, private authService: AuthService) { }

  getUserProfile(id?: string | null): Observable<User> {
    const userId = id ? id : this.authService.getCurrentUserId().toString();
    return this.http.get<User>(`${this.apiUsersUrl}/${userId}`);
  }

  getFavoriteClips(id?: string | null): Observable<Clip[]> {
    const userId = id ? id : this.authService.getCurrentUserId().toString();
    return this.http.get<Clip[]>(`${this.apiClipsUrl}/favorites/${userId}`);
  }

  updateUserProfile(userId: number, data: { username: string; description: string; profilePhotoUrl: string }): Observable<any> {
    return this.http.put(`${this.apiUsersUrl}/${userId}`, data);
  }

  followUser(targetUserId: string): Observable<any> {
    const currentUserId = this.authService.getCurrentUserId();
    return this.http.post(`${this.apiFollowsUrl}/${targetUserId}?followerId=${currentUserId}`, {});
  }

  unfollowUser(targetUserId: string): Observable<any> {
    const currentUserId = this.authService.getCurrentUserId();
    return this.http.delete(`${this.apiFollowsUrl}/${targetUserId}?followerId=${currentUserId}`);
  }

  isFollowing(targetUserId: string): Observable<{isFollowing: boolean}> {
    const currentUserId = this.authService.getCurrentUserId();
    return this.http.get<{isFollowing: boolean}>(`${this.apiFollowsUrl}/${targetUserId}/is-following?followerId=${currentUserId}`);
  }
}

