import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RegisterRequest, LoginRequest } from '../models/user';
import { Observable } from 'rxjs';
import { tap, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) { }

  login(request: LoginRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, request).pipe(
      tap((res: any) => {
        const userId = res.userId || res.id;
        if (res && userId) {
          localStorage.setItem('auth_token', res.token || 'dummy');
          localStorage.setItem('user_id', userId.toString());
          if (res.username) localStorage.setItem('username', res.username);
          if (res.profile_photo_url) localStorage.setItem('profile_photo_url', res.profile_photo_url);

          // Store the isAdmin flag
          if (res.isAdmin !== undefined) {
            localStorage.setItem('is_admin', res.isAdmin.toString());
          }
        }
      }),
      shareReplay(1)
    );
  }

  register(request: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, request);
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('profile_photo_url');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token'); 
  }

  isAdmin(): boolean {
    return localStorage.getItem('is_admin') === 'true' || localStorage.getItem('is_admin') === '1';
  }

  getCurrentUserId(): number {
    const id = localStorage.getItem('user_id');
    return id ? parseInt(id, 10) : 1;
  }
}
