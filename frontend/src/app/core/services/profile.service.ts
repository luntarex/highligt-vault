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

  constructor(private http: HttpClient, private authService: AuthService) { }

  getUserProfile(id?: string | null): Observable<User> {
    const userId = id ? id : this.authService.getCurrentUserId().toString();
    return this.http.get<User>(`${this.apiUsersUrl}/${userId}`);
  }

  getFavoriteClips(id?: string | null): Observable<Clip[]> {
    const userId = id ? id : this.authService.getCurrentUserId().toString();
    return this.http.get<Clip[]>(`${this.apiClipsUrl}?uploaderId=${userId}`);
  }

  updateUserProfile(userId: number, data: { description: string; profilePhotoUrl: string }): Observable<any> {
    return this.http.put(`${this.apiUsersUrl}/${userId}`, data);
  }
}

